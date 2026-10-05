import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { TicketsModule } from './tickets/tickets.module.js';
import { QueueModule } from './queue/queue.module.js';
import { AuthModule } from './auth/auth.module.js';
import { HealthModule } from './health/health.module.js';
import { EventsModule } from './events/events.module.js';
import { AdminModule } from './admin/admin.module.js';

try {
  process.loadEnvFile?.();
} catch {
  // Ignore if .env is missing or already loaded
}

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 20,
      },
    ]),
    BullModule.forRootAsync({
      useFactory: () => {
        const redisUrl = process.env.REDIS_URL;
        if (!redisUrl) {
          throw new Error('REDIS_URL is not defined in environment variables');
        }

        const match = redisUrl.match(/(rediss?:\/\/[^\s"']+)/);
        const cleanUrl = match ? match[1] : redisUrl;
        const parsed = new URL(cleanUrl);

        const isTls =
          parsed.protocol === 'rediss:' ||
          redisUrl.includes('--tls') ||
          parsed.hostname.includes('upstash.io');

        return {
          connection: {
            host: parsed.hostname,
            port: Number(parsed.port) || 6379,
            username: parsed.username || 'default',
            password: parsed.password
              ? decodeURIComponent(parsed.password)
              : undefined,
            tls: isTls ? {} : undefined,
            maxRetriesPerRequest: null,
          },
        };
      },
    }),
    PrismaModule,
    TicketsModule,
    QueueModule,
    AuthModule,
    HealthModule,
    EventsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
