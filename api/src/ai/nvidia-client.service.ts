import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class NvidiaClientService {
  private readonly logger = new Logger(NvidiaClientService.name);
  private readonly apiUrl =
    'https://integrate.api.nvidia.com/v1/chat/completions';
  private readonly fallbackModel = 'meta/llama-3.2-11b-vision-instruct';

  constructor(private readonly prisma: PrismaService) {}

  async chatCompletion(
    messages: { role: string; content: string }[],
    model: string,
    task: string,
  ): Promise<string> {
    const startTime = Date.now();
    let usedModel = model;

    try {
      const apiKey = process.env.NVIDIA_API_KEY;
      if (!apiKey) {
        throw new Error(
          'NVIDIA_API_KEY is not defined in environment variables',
        );
      }

      const result = await this.executeRequest(
        messages,
        model,
        apiKey,
        (actualModel) => {
          usedModel = actualModel;
        },
      );

      const latencyMs = Date.now() - startTime;
      await this.safeLogCall({
        task,
        model: usedModel,
        success: true,
        latencyMs,
        error: null,
      });

      return result;
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      await this.safeLogCall({
        task,
        model: usedModel,
        success: false,
        latencyMs,
        error: error?.message || String(error),
      });
      throw error;
    }
  }

  private async safeLogCall(data: {
    task: string;
    model: string;
    success: boolean;
    latencyMs: number;
    error: string | null;
  }): Promise<void> {
    try {
      if (this.prisma?.aiLog?.create) {
        await this.prisma.aiLog.create({
          data,
        });
      }
    } catch (err: any) {
      this.logger.warn(`Failed to write AiLog record: ${err.message}`);
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async executeRequest(
    messages: { role: string; content: string }[],
    model: string,
    apiKey: string,
    onModelUsed?: (model: string) => void,
  ): Promise<string> {
    const maxRetries = 3;
    const retryDelays = [1000, 2000, 4000];
    let targetModel = model;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const startTime = Date.now();
      let retryDelay = 0;

      try {
        let res = await fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: targetModel,
            messages,
            temperature: 0.1,
          }),
          signal: controller.signal,
        });

        // Handle model deprecation/EOL (e.g., 410 Gone / 404 Not Found)
        if (
          (res.status === 410 || res.status === 404) &&
          targetModel !== this.fallbackModel
        ) {
          const errBody = await res.json().catch(() => ({}));
          this.logger.warn(
            `Model "${targetModel}" returned ${res.status} (${(errBody as any).detail || 'unavailable'}). Falling back to active model "${this.fallbackModel}".`,
          );

          targetModel = this.fallbackModel;
          onModelUsed?.(targetModel);
          res = await fetch(this.apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: targetModel,
              messages,
              temperature: 0.1,
            }),
            signal: controller.signal,
          });
        }

        const latency = Date.now() - startTime;
        this.logger.log(
          `NVIDIA chatCompletion (${targetModel}) completed in ${latency}ms with status ${res.status}`,
        );

        if (!res.ok) {
          const isRetryable =
            res.status === 429 || (res.status >= 500 && res.status < 600);

          if (isRetryable && attempt < maxRetries) {
            retryDelay = retryDelays[attempt];
            const reason =
              res.status === 429
                ? 'Rate limited (HTTP 429)'
                : `Server error (HTTP ${res.status})`;
            this.logger.warn(
              `NVIDIA API request failed with ${reason}. Retrying (attempt ${attempt + 1}/${maxRetries}) after ${retryDelay}ms...`,
            );
          } else {
            const errorText = await res.text();
            throw new Error(`NVIDIA API HTTP ${res.status}: ${errorText}`);
          }
        } else {
          const data = (await res.json()) as any;
          const content = data.choices?.[0]?.message?.content;
          if (typeof content !== 'string') {
            throw new Error(
              'NVIDIA API returned empty or invalid choices content',
            );
          }

          return content;
        }
      } catch (error: any) {
        const latency = Date.now() - startTime;
        if (error.name === 'AbortError') {
          this.logger.error(
            `NVIDIA API request timed out after 15 seconds (${latency}ms)`,
          );
          throw new Error('NVIDIA API request timed out after 15 seconds');
        }
        this.logger.error(
          `NVIDIA chatCompletion failed after ${latency}ms: ${error.message}`,
        );
        throw error;
      } finally {
        clearTimeout(timeout);
      }

      if (retryDelay > 0) {
        await this.sleep(retryDelay);
      }
    }

    throw new Error('NVIDIA API request failed: all retries exhausted');
  }
}

