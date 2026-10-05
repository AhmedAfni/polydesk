import { Test, TestingModule } from '@nestjs/testing';
import { TicketsController } from './tickets.controller.js';
import { TicketsService } from './tickets.service.js';

describe('TicketsController', () => {
  let controller: TicketsController;
  let service: {
    create: any;
    findAll: any;
    findOne: any;
    reply: any;
  };

  beforeEach(async () => {
    service = {
      create: vi.fn(),
      findAll: vi.fn(),
      findOne: vi.fn(),
      reply: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketsController],
      providers: [
        {
          provide: TicketsService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<TicketsController>(TicketsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call ticketsService.reply', async () => {
    const dto = { message: 'We are on it' };
    service.reply.mockResolvedValue({ id: 'msg-1' });

    const result = await controller.reply('ticket-1', dto);

    expect(service.reply).toHaveBeenCalledWith('ticket-1', dto);
    expect(result).toEqual({ id: 'msg-1' });
  });
});
