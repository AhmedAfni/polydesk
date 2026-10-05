import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { AdminController } from './admin.controller.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('AdminController', () => {
  let controller: AdminController;
  let prisma: {
    aiLog: {
      count: ReturnType<typeof vi.fn>;
      aggregate: ReturnType<typeof vi.fn>;
      groupBy: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(async () => {
    prisma = {
      aiLog: {
        count: vi.fn(),
        aggregate: vi.fn(),
        groupBy: vi.fn(),
        findMany: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return aggregated stats and last 50 logs', async () => {
    prisma.aiLog.count
      .mockResolvedValueOnce(10) // totalCalls
      .mockResolvedValueOnce(9); // successfulCalls

    prisma.aiLog.aggregate.mockResolvedValueOnce({
      _avg: { latencyMs: 1250.4 },
    });

    prisma.aiLog.groupBy
      .mockResolvedValueOnce([
        { task: 'classify', _count: { _all: 6 } },
        { task: 'translate', _count: { _all: 4 } },
      ])
      .mockResolvedValueOnce([
        { task: undefined, model: 'nvidia/llama-3.3', _count: { _all: 6 } },
        { task: undefined, model: 'meta/llama-3.2', _count: { _all: 4 } },
      ]);

    const mockLogs = [
      {
        id: 'log-1',
        task: 'classify',
        model: 'nvidia/llama-3.3',
        success: true,
        latencyMs: 1200,
        error: null,
        createdAt: new Date(),
      },
    ];
    prisma.aiLog.findMany.mockResolvedValueOnce(mockLogs);

    const result = await controller.getAiLogs();

    expect(result.stats.totalCalls).toBe(10);
    expect(result.stats.successRate).toBe(90);
    expect(result.stats.avgLatencyMs).toBe(1250);
    expect(result.stats.byTask).toEqual({ classify: 6, translate: 4 });
    expect(result.stats.byModel).toEqual({
      'nvidia/llama-3.3': 6,
      'meta/llama-3.2': 4,
    });
    expect(result.logs).toEqual(mockLogs);
  });
});
