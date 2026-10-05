import { Module } from '@nestjs/common';
import { NvidiaClientService } from './nvidia-client.service.js';
import { ClassifierService } from './classifier.service.js';
import { TranslatorService } from './translator.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  providers: [NvidiaClientService, ClassifierService, TranslatorService],
  exports: [NvidiaClientService, ClassifierService, TranslatorService],
})
export class AiModule {}
