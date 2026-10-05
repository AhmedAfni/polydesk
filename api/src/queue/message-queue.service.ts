import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class MessageQueueService {
  constructor(
    @InjectQueue('message-processing')
    private readonly messageQueue: Queue,
  ) {}

  async addMessageJob(data: { ticketId: string; messageId: string }) {
    return this.messageQueue.add('process-message', data);
  }
}
