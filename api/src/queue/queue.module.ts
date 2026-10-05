import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MessageQueueService } from './message-queue.service.js';
import { MessageProcessor } from './message.processor.js';
import { AiModule } from '../ai/ai.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { EventsModule } from '../events/events.module.js';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'message-processing',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }),
    AiModule,
    PrismaModule,
    EventsModule,
  ],
  providers: [MessageQueueService, MessageProcessor],
  exports: [MessageQueueService],
})
export class QueueModule {}
