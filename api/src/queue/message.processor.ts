import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service.js';
import { ClassifierService } from '../ai/classifier.service.js';
import { EventsGateway } from '../events/events.gateway.js';

@Processor('message-processing')
export class MessageProcessor extends WorkerHost {
  private readonly logger = new Logger(MessageProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly classifierService: ClassifierService,
    private readonly eventsGateway: EventsGateway,
  ) {
    super();
  }

  async process(
    job: Job<{ ticketId: string; messageId: string }>,
  ): Promise<{ status: string; [key: string]: any }> {
    const { ticketId, messageId } = job.data;
    this.logger.log(
      `Processing message job ${job.id} for ticket "${ticketId}", message "${messageId}"`,
    );

    try {
      // a. Fetch the message from the database
      const message = await this.prisma.message.findUnique({
        where: { id: messageId },
      });

      if (!message) {
        this.logger.warn(
          `Message with id "${messageId}" not found in database.`,
        );
        return { status: 'failed', reason: 'message_not_found' };
      }

      // b. Call classifierService.classifyMessage() with the message's originalText
      this.logger.log(
        `Classifying message text: "${message.originalText.slice(0, 60)}..."`,
      );
      const classification = await this.classifierService.classifyMessage(
        message.originalText,
      );
      this.logger.log(
        `Classification result: ${JSON.stringify(classification)}`,
      );

      // c. Store originalLanguage from classifier — translation is now done on-demand per agent
      await this.prisma.message.update({
        where: { id: messageId },
        data: {
          originalLanguage: classification.language,
        },
      });

      // e. Update the Ticket record with topic, urgency, summary, and set aiStatus to "done"
      const urgencyMap: Record<string, 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'> =
        {
          low: 'LOW',
          normal: 'NORMAL',
          high: 'HIGH',
          critical: 'CRITICAL',
        };
      const urgency =
        urgencyMap[classification.urgency.toLowerCase()] ?? 'NORMAL';

      await this.prisma.ticket.update({
        where: { id: ticketId },
        data: {
          topic: classification.topic,
          urgency,
          summary: classification.summary,
          aiStatus: 'done',
        },
      });

      const updatedTicket = await this.prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          customer: true,
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (updatedTicket) {
        this.eventsGateway.emitTicketUpdated(updatedTicket);
      }

      this.logger.log(
        `AI processing successfully completed for ticket "${ticketId}"`,
      );
      return { status: 'processed', ticketId, messageId, classification };
    } catch (error: any) {
      this.logger.error(
        `Error processing job ${job.id} for ticket "${ticketId}": ${error.message}`,
        error.stack,
      );
      try {
        await this.prisma.ticket.update({
          where: { id: ticketId },
          data: {
            aiStatus: 'failed',
          },
        });
      } catch (dbError: any) {
        this.logger.error(
          `Failed to update ticket aiStatus to failed for ticket "${ticketId}": ${dbError.message}`,
        );
      }
      return { status: 'failed', error: error.message };
    }
  }

  @OnWorkerEvent('ready')
  onReady() {
    this.logger.log(
      'Message processing worker is ready and connected to Redis',
    );
  }

  @OnWorkerEvent('error')
  onError(error: Error) {
    this.logger.error('Message processing worker error', error);
  }
}
