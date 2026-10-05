import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { BullModule } from '@nestjs/bullmq';
import { HealthController } from './health.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [
    TerminusModule,
    PrismaModule,
    BullModule.registerQueue({
      name: 'message-processing',
    }),
  ],
  controllers: [HealthController],
})
export class HealthModule {}
