import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller.js';
import { TicketsService } from './tickets.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { QueueModule } from '../queue/queue.module.js';
import { AiModule } from '../ai/ai.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { EventsModule } from '../events/events.module.js';

@Module({
  imports: [PrismaModule, QueueModule, AiModule, AuthModule, EventsModule],
  controllers: [TicketsController],
  providers: [TicketsService],
})
export class TicketsModule {}
