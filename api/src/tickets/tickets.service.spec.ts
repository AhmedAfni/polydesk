import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TicketsService } from './tickets.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { MessageQueueService } from '../queue/message-queue.service.js';
import { TranslatorService } from '../ai/translator.service.js';
import { EventsGateway } from '../events/events.gateway.js';

describe('TicketsService', () => {
  let service: TicketsService;
  let prisma: {
    customer: { findUnique: any; create: any };
    ticket: { create: any; findMany: any; findUnique: any; update: any };
    message: { findFirst: any; create: any };
  };
  let translatorService: { translate: any };
  let eventsGateway: { emitTicketCreated: any; emitTicketUpdated: any };

  beforeEach(async () => {
    prisma = {
      customer: { findUnique: vi.fn(), create: vi.fn() },
      ticket: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      message: { findFirst: vi.fn(), create: vi.fn() },
    };

    translatorService = {
      translate: vi.fn(),
    };

    eventsGateway = {
      emitTicketCreated: vi.fn(),
      emitTicketUpdated: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: MessageQueueService,
          useValue: {
            addMessageJob: vi.fn(),
          },
        },
        {
          provide: TranslatorService,
          useValue: translatorService,
        },
        {
          provide: EventsGateway,
          useValue: eventsGateway,
        },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('reply', () => {
    it('should throw NotFoundException if ticket does not exist', async () => {
      prisma.ticket.findUnique.mockResolvedValue(null);

      await expect(
        service.reply('non-existent-id', { message: 'Hello' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should translate and create OUTBOUND message for non-English customer', async () => {
      prisma.ticket.findUnique.mockResolvedValue({
        id: 'ticket-1',
        customer: { id: 'cust-1', language: null },
      });
      prisma.message.findFirst.mockResolvedValue({
        id: 'msg-1',
        originalLanguage: 'es',
      });
      translatorService.translate.mockResolvedValue('Hola');
      prisma.message.create.mockResolvedValue({
        id: 'out-1',
        ticketId: 'ticket-1',
        direction: 'OUTBOUND',
        originalText: 'Hello',
        originalLanguage: 'en',
        translatedText: 'Hola',
        translatedLanguage: 'es',
      });
      prisma.ticket.update.mockResolvedValue({});

      const result = await service.reply('ticket-1', { message: 'Hello' });

      expect(translatorService.translate).toHaveBeenCalledWith(
        'Hello',
        'es',
        'en',
      );
      expect(prisma.message.create).toHaveBeenCalledWith({
        data: {
          ticketId: 'ticket-1',
          direction: 'OUTBOUND',
          originalText: 'Hello',
          originalLanguage: 'en',
          translatedText: 'Hola',
          translatedLanguage: 'es',
        },
      });
      expect(prisma.ticket.update).toHaveBeenCalledWith({
        where: { id: 'ticket-1' },
        data: {
          status: 'PENDING',
          lastMessageAt: expect.any(Date),
        },
        include: {
          customer: true,
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
      expect(eventsGateway.emitTicketUpdated).toHaveBeenCalled();
      expect(result.id).toBe('out-1');
    });

    it('should skip translation when customer language is English', async () => {
      prisma.ticket.findUnique.mockResolvedValue({
        id: 'ticket-2',
        customer: { id: 'cust-2', language: 'en' },
      });
      prisma.message.create.mockResolvedValue({
        id: 'out-2',
        ticketId: 'ticket-2',
        direction: 'OUTBOUND',
        originalText: 'Hello',
        originalLanguage: 'en',
        translatedText: 'Hello',
        translatedLanguage: 'en',
      });
      prisma.ticket.update.mockResolvedValue({});

      await service.reply('ticket-2', { message: 'Hello' });

      expect(translatorService.translate).not.toHaveBeenCalled();
      expect(prisma.message.create).toHaveBeenCalledWith({
        data: {
          ticketId: 'ticket-2',
          direction: 'OUTBOUND',
          originalText: 'Hello',
          originalLanguage: 'en',
          translatedText: 'Hello',
          translatedLanguage: 'en',
        },
      });
      expect(prisma.ticket.update).toHaveBeenCalledWith({
        where: { id: 'ticket-2' },
        data: {
          status: 'PENDING',
          lastMessageAt: expect.any(Date),
        },
        include: {
          customer: true,
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
      expect(eventsGateway.emitTicketUpdated).toHaveBeenCalled();
    });
  });

  describe('findOneTranslated', () => {
    it('should correctly set displayText for both INBOUND and OUTBOUND messages', async () => {
      prisma.ticket.findUnique.mockResolvedValue({
        id: 'ticket-1',
        customer: { id: 'cust-1', name: 'James', language: 'en' },
        messages: [
          {
            id: 'msg-in',
            ticketId: 'ticket-1',
            direction: 'INBOUND',
            originalText: 'I keep clicking the reset link but nothing happens.',
            originalLanguage: 'en',
            translatedText: null,
            translatedLanguage: null,
          },
          {
            id: 'msg-out',
            ticketId: 'ticket-1',
            direction: 'OUTBOUND',
            originalText: 'سنتحقق من ذلك',
            originalLanguage: 'ar',
            translatedText: 'We will verify that.',
            translatedLanguage: 'en',
          },
        ],
      });

      const result = await service.findOneTranslated('ticket-1', 'en');

      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].displayText).toBe(
        'I keep clicking the reset link but nothing happens.',
      );
      expect(result.messages[1].displayText).toBe('We will verify that.');
      expect(translatorService.translate).not.toHaveBeenCalled();
    });

    it('should translate messages dynamically if pre-translated text is missing or language differs', async () => {
      prisma.ticket.findUnique.mockResolvedValue({
        id: 'ticket-1',
        customer: { id: 'cust-1', name: 'James', language: 'en' },
        messages: [
          {
            id: 'msg-out',
            ticketId: 'ticket-1',
            direction: 'OUTBOUND',
            originalText: 'سنتحقق من ذلك',
            originalLanguage: 'ar',
            translatedText: null,
            translatedLanguage: null,
          },
        ],
      });

      translatorService.translate.mockResolvedValue('We will check that.');

      const result = await service.findOneTranslated('ticket-1', 'en');

      expect(translatorService.translate).toHaveBeenCalledWith(
        'سنتحقق من ذلك',
        'en',
        'ar',
      );
      expect(result.messages[0].displayText).toBe('We will check that.');
    });
  });
});
