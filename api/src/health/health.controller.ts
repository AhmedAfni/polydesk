import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaService,
    @InjectQueue('message-processing')
    private readonly queue: Queue,
  ) {}

  @Get()
  @HealthCheck()
  @SkipThrottle()
  check() {
    return this.health.check([
      () => this.checkDatabase(),
      () => this.checkRedis(),
      () => this.checkNvidia(),
    ]);
  }

  private async checkDatabase(): Promise<HealthIndicatorResult> {
    try {
      const queryPromise = this.prisma.$queryRaw`SELECT 1`;
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database query timed out')), 3000),
      );
      await Promise.race([queryPromise, timeoutPromise]);
      return { database: { status: 'up' } };
    } catch (err: any) {
      return {
        database: {
          status: 'down',
          message: err?.message || 'Database connection failed',
        },
      };
    }
  }

  private async checkRedis(): Promise<HealthIndicatorResult> {
    try {
      const pingPromise = (async () => {
        const client = await (
          (this.queue as any).client ??
          (this.queue as any).getBackend?.()?.client
        );
        if (!client) {
          throw new Error('Redis client is not available');
        }
        const pong = await client.ping();
        if (pong !== 'PONG') {
          throw new Error(`Unexpected Redis ping response: ${pong}`);
        }
        return pong;
      })();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Redis ping timed out')), 3000),
      );

      await Promise.race([pingPromise, timeoutPromise]);
      return { redis: { status: 'up' } };
    } catch (err: any) {
      return {
        redis: {
          status: 'down',
          message: err?.message || 'Redis ping failed',
        },
      };
    }
  }

  private checkNvidia(): HealthIndicatorResult {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (apiKey && apiKey.trim().length > 0) {
      return { nvidia: { status: 'up' } };
    }
    return {
      nvidia: {
        status: 'down',
        message: 'NVIDIA_API_KEY is not configured',
      },
    };
  }
}
