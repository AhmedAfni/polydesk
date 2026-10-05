import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('ai-logs')
  async getAiLogs() {
    const [totalCalls, successfulCalls, latencyAgg, taskGroups, modelGroups, logs] =
      await Promise.all([
        this.prisma.aiLog.count(),
        this.prisma.aiLog.count({ where: { success: true } }),
        this.prisma.aiLog.aggregate({
          _avg: { latencyMs: true },
        }),
        this.prisma.aiLog.groupBy({
          by: ['task'],
          _count: { _all: true },
        }),
        this.prisma.aiLog.groupBy({
          by: ['model'],
          _count: { _all: true },
        }),
        this.prisma.aiLog.findMany({
          take: 50,
          orderBy: { createdAt: 'desc' },
        }),
      ]);

    const successRate =
      totalCalls > 0
        ? Math.round((successfulCalls / totalCalls) * 1000) / 10
        : 0;
    const avgLatencyMs = latencyAgg._avg.latencyMs
      ? Math.round(latencyAgg._avg.latencyMs)
      : 0;

    const byTask: Record<string, number> = {};
    for (const g of taskGroups) {
      byTask[g.task] = g._count._all;
    }

    const byModel: Record<string, number> = {};
    for (const g of modelGroups) {
      byModel[g.model] = g._count._all;
    }

    return {
      stats: {
        totalCalls,
        successRate,
        avgLatencyMs,
        byTask,
        byModel,
      },
      totalCalls,
      successRate,
      avgLatencyMs,
      byTask,
      byModel,
      logs,
    };
  }
}
