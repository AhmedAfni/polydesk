import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTicketDto } from './create-ticket.dto.js';
import { ReplyTicketDto } from './reply-ticket.dto.js';
import { MessageQueueService } from '../queue/message-queue.service.js';
import { TranslatorService } from '../ai/translator.service.js';
import { EventsGateway } from '../events/events.gateway.js';

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messageQueueService: MessageQueueService,
    private readonly translatorService: TranslatorService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async create(data: CreateTicketDto) {
    let customer = await this.prisma.customer.findUnique({
      where: { email: data.customerEmail },
    });

    if (!customer) {
      customer = await this.prisma.customer.create({
        data: {
          email: data.customerEmail,
          name: data.customerName,
        },
      });
    }

    const ticket = await this.prisma.ticket.create({
      data: {
        customerId: customer.id,
        subject: data.subject,
        status: 'OPEN',
        urgency: 'NORMAL',
        messages: {
          create: {
            direction: 'INBOUND',
            originalText: data.message,
          },
        },
      },
      include: {
        customer: true,
        messages: true,
      },
    });

    const firstMessage = ticket.messages[0];
    if (firstMessage) {
      await this.messageQueueService.addMessageJob({
        ticketId: ticket.id,
        messageId: firstMessage.id,
      });
    }

    this.eventsGateway.emitTicketCreated(ticket);

    return ticket;
  }

  async reply(ticketId: string, dto: ReplyTicketDto) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { customer: true },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID "${ticketId}" not found`);
    }

    let customerLanguage = ticket.customer?.language;

    if (!customerLanguage) {
      const firstInboundMessage = await this.prisma.message.findFirst({
        where: {
          ticketId,
          direction: 'INBOUND',
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      customerLanguage = firstInboundMessage?.originalLanguage || 'en';
    }

    const sourceLanguage = dto.sourceLanguage || 'en';

    const isCustomerSameLanguage = this.isSameLanguage(
      sourceLanguage,
      customerLanguage,
    );

    let translatedText: string | null = null;
    let translatedLanguage: string | null = null;

    if (isCustomerSameLanguage) {
      translatedText = dto.message;
      translatedLanguage = customerLanguage;
    } else {
      translatedText = await this.translatorService.translate(
        dto.message,
        customerLanguage,
        sourceLanguage,
      );
      translatedLanguage = customerLanguage;
    }

    const message = await this.prisma.message.create({
      data: {
        ticketId,
        direction: 'OUTBOUND',
        originalText: dto.message,
        originalLanguage: sourceLanguage,
        translatedText,
        translatedLanguage,
      },
    });

    const updatedTicket = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: 'PENDING',
        lastMessageAt: new Date(),
      },
      include: {
        customer: true,
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    this.eventsGateway.emitTicketUpdated(updatedTicket);

    return message;
  }

  async findAll() {
    return this.prisma.ticket.findMany({
      orderBy: [{ urgency: 'desc' }, { lastMessageAt: 'desc' }],
      include: {
        customer: true,
        messages: true,
      },
    });
  }

  async findOne(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        customer: true,
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID "${id}" not found`);
    }

    return ticket;
  }

  async findOneTranslated(id: string, lang: string) {
    const ticket = await this.findOne(id);

    const translatedMessages = await Promise.all(
      ticket.messages.map(async (message) => {
        const originalLang = message.originalLanguage || 'en';

        // 1. If original language matches requested language, use original text
        if (this.isSameLanguage(originalLang, lang)) {
          return { ...message, displayText: message.originalText };
        }

        // 2. If pre-existing translated text matches requested language, use it
        if (
          message.translatedText &&
          this.isSameLanguage(message.translatedLanguage, lang)
        ) {
          return { ...message, displayText: message.translatedText };
        }

        // 3. Otherwise dynamically translate original text into the requested language
        try {
          const translated = await this.translatorService.translate(
            message.originalText,
            lang,
            originalLang,
          );
          return { ...message, displayText: translated };
        } catch {
          return { ...message, displayText: message.originalText };
        }
      }),
    );

    return { ...ticket, messages: translatedMessages };
  }

  private isSameLanguage(
    lang1?: string | null,
    lang2?: string | null,
  ): boolean {
    if (!lang1 || !lang2) return false;
    return (
      lang1.trim().toLowerCase() === lang2.trim().toLowerCase() ||
      (this.isEnglish(lang1) && this.isEnglish(lang2))
    );
  }

  private isEnglish(lang: string): boolean {
    return ['en', 'eng', 'english'].includes(lang.trim().toLowerCase());
  }
}
