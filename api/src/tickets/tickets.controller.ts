import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { TicketsService } from './tickets.service.js';
import { CreateTicketDto } from './create-ticket.dto.js';
import { ReplyTicketDto } from './reply-ticket.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post()
  create(@Body() createTicketDto: CreateTicketDto) {
    return this.ticketsService.create(createTicketDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/reply')
  reply(@Param('id') id: string, @Body() replyTicketDto: ReplyTicketDto) {
    return this.ticketsService.reply(id, replyTicketDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.ticketsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/translated')
  findOneTranslated(
    @Param('id') id: string,
    @Query('lang') lang: string,
  ) {
    return this.ticketsService.findOneTranslated(id, lang || 'en');
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(id);
  }
}

