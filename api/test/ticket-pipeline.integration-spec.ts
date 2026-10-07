import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { type Job } from 'bullmq';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { NvidiaClientService } from '../src/ai/nvidia-client.service.js';
import { MessageQueueService } from '../src/queue/message-queue.service.js';
import { MessageProcessor } from '../src/queue/message.processor.js';
import { JwtService } from '@nestjs/jwt';
import { ThrottlerGuard } from '@nestjs/throttler';

// Ensure .env is loaded before modules initialize
try {
  process.loadEnvFile?.(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env'),
  );
} catch {
  try {
    process.loadEnvFile?.();
  } catch {
    // Ignore if already present
  }
}

describe('Ticket Pipeline Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let messageProcessor: MessageProcessor;
  let jwtService: JwtService;
  let nvidiaClientService: NvidiaClientService;
  let mockMessageQueueService: { addMessageJob: any };

  let agentToken: string;
  let agentUserId: string;

  const createdCustomerIds: string[] = [];
  const createdTicketIds: string[] = [];
  const createdUserIds: string[] = [];

  const timestamp = Date.now();
  const testCustomerEmail = `maria.pipeline.${timestamp}@customer-test.com`;
  const testAgentEmail = `agent.pipeline.${timestamp}@polydesk-test.com`;

  beforeAll(async () => {
    mockMessageQueueService = {
      addMessageJob: vi.fn().mockImplementation(async (data) => ({
        id: `mock-job-${Date.now()}`,
        data,
      })),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MessageQueueService)
      .useValue(mockMessageQueueService)
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    messageProcessor = moduleFixture.get<MessageProcessor>(MessageProcessor);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    nvidiaClientService = moduleFixture.get<NvidiaClientService>(NvidiaClientService);

    // Mock NvidiaClientService.chatCompletion with realistic fixture responses
    vi.spyOn(nvidiaClientService, 'chatCompletion').mockImplementation(
      async (_messages, _model, task) => {
        if (task === 'classify') {
          return JSON.stringify({
            language: 'es',
            topic: 'billing',
            urgency: 'high',
            summary: 'Customer questioning duplicate invoice charge',
          });
        }
        if (task === 'translate') {
          return 'Hola María, hemos revisado su factura y procesado el reembolso del cargo duplicado.';
        }
        return 'Mock AI Response';
      },
    );

    // Seed an agent user to test authenticated replies
    const agent = await prisma.user.create({
      data: {
        email: testAgentEmail,
        name: 'Agent Support Pipeline',
        password: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr',
        role: 'AGENT',
        preferredLanguage: 'en',
      },
    });
    agentUserId = agent.id;
    createdUserIds.push(agentUserId);

    agentToken = jwtService.sign({
      sub: agent.id,
      email: agent.email,
      role: agent.role,
    });
  });

  afterAll(async () => {
    try {
      // Clean up all test records created in the database
      if (createdTicketIds.length > 0) {
        await prisma.message.deleteMany({
          where: { ticketId: { in: createdTicketIds } },
        });
        await prisma.ticket.deleteMany({
          where: { id: { in: createdTicketIds } },
        });
      }
      if (createdCustomerIds.length > 0) {
        await prisma.customer.deleteMany({
          where: { id: { in: createdCustomerIds } },
        });
      }
      if (createdUserIds.length > 0) {
        await prisma.user.deleteMany({
          where: { id: { in: createdUserIds } },
        });
      }
    } finally {
      await app.close();
    }
  });

  it('runs the full end-to-end ticket pipeline: ingest -> triage -> reply', async () => {
    // -----------------------------------------------------------------
    // Step 1: POST /tickets with a non-English message
    // -----------------------------------------------------------------
    const ticketPayload = {
      customerEmail: testCustomerEmail,
      customerName: 'María García',
      subject: 'Cobro duplicado en factura',
      message: 'Hola, tengo una pregunta sobre el cobro duplicado en mi tarjeta de crédito.',
    };

    const createRes = await request(app.getHttpServer())
      .post('/tickets')
      .send(ticketPayload)
      .expect(201);

    const createdTicket = createRes.body;
    expect(createdTicket).toBeDefined();
    expect(createdTicket.id).toBeDefined();
    expect(createdTicket.subject).toBe(ticketPayload.subject);
    expect(createdTicket.status).toBe('OPEN');
    expect(createdTicket.aiStatus).toBe('pending');

    const ticketId = createdTicket.id;
    const customerId = createdTicket.customerId;
    createdTicketIds.push(ticketId);
    createdCustomerIds.push(customerId);

    // Verify records exist in real Postgres database
    const customerInDb = await prisma.customer.findUnique({
      where: { id: customerId },
    });
    expect(customerInDb).not.toBeNull();
    expect(customerInDb?.email).toBe(testCustomerEmail);
    expect(customerInDb?.name).toBe('María García');

    const ticketInDb = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { messages: true },
    });
    expect(ticketInDb).not.toBeNull();
    expect(ticketInDb?.messages).toHaveLength(1);

    const inboundMessage = ticketInDb!.messages[0];
    expect(inboundMessage.direction).toBe('INBOUND');
    expect(inboundMessage.originalText).toBe(ticketPayload.message);

    // Verify job was enqueued with ticketId and messageId
    expect(mockMessageQueueService.addMessageJob).toHaveBeenCalledWith({
      ticketId,
      messageId: inboundMessage.id,
    });

    // -----------------------------------------------------------------
    // Step 2: Directly invoke MessageProcessor.process() with job data
    // -----------------------------------------------------------------
    const jobPayload = {
      id: `job-${ticketId}`,
      data: {
        ticketId,
        messageId: inboundMessage.id,
      },
    } as Job<{ ticketId: string; messageId: string }>;

    const processResult = await messageProcessor.process(jobPayload);
    expect(processResult.status).toBe('processed');
    expect(processResult.classification.language).toBe('es');
    expect(processResult.classification.topic).toBe('billing');
    expect(processResult.classification.urgency).toBe('high');

    // Confirm real database updates after AI classification
    const processedMessage = await prisma.message.findUnique({
      where: { id: inboundMessage.id },
    });
    expect(processedMessage?.originalLanguage).toBe('es');

    const processedTicket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });
    expect(processedTicket?.topic).toBe('billing');
    expect(processedTicket?.urgency).toBe('HIGH');
    expect(processedTicket?.summary).toBe(
      'Customer questioning duplicate invoice charge',
    );
    expect(processedTicket?.aiStatus).toBe('done');

    // -----------------------------------------------------------------
    // Step 3: POST /tickets/:id/reply with a valid JWT
    // -----------------------------------------------------------------
    const replyPayload = {
      message: 'Hello Maria, we have reviewed your invoice and refunded the duplicate charge.',
      sourceLanguage: 'en',
    };

    const replyRes = await request(app.getHttpServer())
      .post(`/tickets/${ticketId}/reply`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send(replyPayload)
      .expect(201);

    expect(replyRes.body.ticketId).toBe(ticketId);
    expect(replyRes.body.direction).toBe('OUTBOUND');

    // Confirm OUTBOUND message was persisted and translated into customer's language ('es')
    const outboundMessage = await prisma.message.findFirst({
      where: {
        ticketId,
        direction: 'OUTBOUND',
      },
    });
    expect(outboundMessage).not.toBeNull();
    expect(outboundMessage?.originalText).toBe(replyPayload.message);
    expect(outboundMessage?.originalLanguage).toBe('en');
    expect(outboundMessage?.translatedLanguage).toBe('es');
    expect(outboundMessage?.translatedText).toBe(
      'Hola María, hemos revisado su factura y procesado el reembolso del cargo duplicado.',
    );

    // Confirm ticket status transitioned to PENDING
    const finalTicket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });
    expect(finalTicket?.status).toBe('PENDING');

    // -----------------------------------------------------------------
    // Step 4: Regression Test - GET /tickets/:id & GET /tickets/:id/translated
    // Verify translatedText and translatedLanguage are returned on OUTBOUND messages
    // -----------------------------------------------------------------
    const getTicketRes = await request(app.getHttpServer())
      .get(`/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${agentToken}`)
      .expect(200);

    const outboundInGet = getTicketRes.body.messages.find(
      (m: any) => m.direction === 'OUTBOUND',
    );
    expect(outboundInGet).toBeDefined();
    expect(outboundInGet.translatedText).toBe(
      'Hola María, hemos revisado su factura y procesado el reembolso del cargo duplicado.',
    );
    expect(outboundInGet.translatedLanguage).toBe('es');

    const getTranslatedRes = await request(app.getHttpServer())
      .get(`/tickets/${ticketId}/translated?lang=en`)
      .set('Authorization', `Bearer ${agentToken}`)
      .expect(200);

    const outboundInTranslated = getTranslatedRes.body.messages.find(
      (m: any) => m.direction === 'OUTBOUND',
    );
    expect(outboundInTranslated).toBeDefined();
    expect(outboundInTranslated.displayText).toBe(replyPayload.message);
    expect(outboundInTranslated.translatedText).toBe(
      'Hola María, hemos revisado su factura y procesado el reembolso del cargo duplicado.',
    );
    expect(outboundInTranslated.translatedLanguage).toBe('es');
  });
});
