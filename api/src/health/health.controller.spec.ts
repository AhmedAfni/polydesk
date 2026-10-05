import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService } from '@nestjs/terminus';
import { getQueueToken } from '@nestjs/bullmq';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { HealthController } from './health.controller.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: {
            check: vi.fn().mockImplementation((indicators: (() => Promise<unknown>)[]) =>
              Promise.all(indicators.map((fn) => fn())).then((results) => ({
                status: 'ok',
                info: Object.assign({}, ...results),
                error: {},
                details: Object.assign({}, ...results),
              })),
            ),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: vi.fn().mockResolvedValue([{ 1: 1 }]),
          },
        },
        {
          provide: getQueueToken('message-processing'),
          useValue: {
            client: Promise.resolve({
              ping: vi.fn().mockResolvedValue('PONG'),
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return health status', async () => {
    process.env.NVIDIA_API_KEY = 'test-key';
    const result = await controller.check();
    expect(result.status).toBe('ok');
    expect(result.details.database.status).toBe('up');
    expect(result.details.redis.status).toBe('up');
    expect(result.details.nvidia.status).toBe('up');
  });
});
