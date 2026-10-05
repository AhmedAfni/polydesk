import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';

// Ensure .env is loaded
try {
  process.loadEnvFile?.(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env'),
  );
} catch {
  try {
    process.loadEnvFile?.();
  } catch {
    // Ignore if already loaded or missing
  }
}

const prisma = new PrismaClient();

function getRedisConnection() {
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
    host: parsed.hostname,
    port: Number(parsed.port) || 6379,
    username: parsed.username || 'default',
    password: parsed.password
      ? decodeURIComponent(parsed.password)
      : undefined,
    tls: isTls ? {} : undefined,
    maxRetriesPerRequest: null,
  };
}

interface SeedItem {
  customer: {
    name: string;
    email: string;
    language: string;
  };
  subject: string;
  message: string;
}

const SEED_DATA: SeedItem[] = [
  {
    customer: {
      name: 'Sofía Álvarez',
      email: 'sofia.alvarez@innovacion.es',
      language: 'es',
    },
    subject: 'Cargo duplicado en la factura de este mes',
    message:
      'Hola, acabo de revisar mi extracto bancario y he visto que se me ha cobrado dos veces la suscripción mensual del plan Pro. ¿Podrían revisar mi cuenta y tramitar el reembolso del cobro duplicado? Muchas gracias por su ayuda.',
  },
  {
    customer: {
      name: 'Tariq Al-Mansoor',
      email: 'tariq.mansoor@alnoor.ae',
      language: 'ar',
    },
    subject: 'مشكلة في تتبع الشحنة رقم #48291',
    message:
      'مرحباً، قمت بالطلب قبل أربعة أيام وكان من المفترض أن يصل الطرد أمس. عند إدخال رقم التتبع يظهر لي خطأ في النظام، هل يمكنكم التأكد من حالة الشحنة وموعد وصولها؟',
  },
  {
    customer: {
      name: 'Lars van der Meer',
      email: 'lars.vandermeer@techflow.nl',
      language: 'nl',
    },
    subject: 'Webhook levering faalt met 504 gateway timeout',
    message:
      'Goedemiddag support, sinds jullie laatste API-update vanochtend falen al onze inkomende webhooks met een 504 gateway timeout. Dit blokkeert onze automatische orderverwerking voor klanten. Kunnen jullie met spoed controleren of er aan jullie kant vertragingen zijn?',
  },
  {
    customer: {
      name: 'Camille Laurent',
      email: 'camille.laurent@solutions-pro.fr',
      language: 'fr',
    },
    subject: "Problème d'accès au tableau de bord pour mon équipe",
    message:
      "Bonjour, plusieurs membres de notre équipe n'arrivent plus à se connecter à l'espace de travail depuis ce matin suite à une réinitialisation de mot de passe. L'e-mail de confirmation n'arrive pas dans leurs boîtes de réception. Pourriez-vous nous débloquer manuellement ?",
  },
  {
    customer: {
      name: 'Liam O’Connor',
      email: 'liam.oconnor@apexcloud.co.uk',
      language: 'en',
    },
    subject: 'Urgent: SAML SSO login failure after certificate renewal',
    message:
      'Hi team, we renewed our identity provider certificate today and now all our corporate users are getting an "invalid SAML assertion" error upon login. Could someone from your enterprise support team assist us in updating the metadata on your end?',
  },
];

async function main() {
  console.log('--- PolyDesk Demo Data Seeder ---');

  // a. Delete all existing Message, Ticket, Customer records (keeping User records)
  console.log('1. Clearing existing demo data...');
  const deletedMessages = await prisma.message.deleteMany();
  console.log(`   - Deleted ${deletedMessages.count} messages.`);

  const deletedTickets = await prisma.ticket.deleteMany();
  console.log(`   - Deleted ${deletedTickets.count} tickets.`);

  const deletedCustomers = await prisma.customer.deleteMany();
  console.log(`   - Deleted ${deletedCustomers.count} customers.`);

  // Connect to BullMQ queue
  const connection = getRedisConnection();
  const queue = new Queue('message-processing', { connection });

  console.log('\n2. Creating realistic demo customers and tickets...');

  for (const item of SEED_DATA) {
    const customer = await prisma.customer.create({
      data: {
        name: item.customer.name,
        email: item.customer.email,
        language: item.customer.language,
      },
    });

    const ticket = await prisma.ticket.create({
      data: {
        customerId: customer.id,
        subject: item.subject,
        status: 'OPEN',
        urgency: 'NORMAL',
        topic: null,
        summary: null,
        aiStatus: 'pending',
        messages: {
          create: {
            direction: 'INBOUND',
            originalText: item.message,
          },
        },
      },
      include: {
        messages: true,
      },
    });

    const firstMessage = ticket.messages[0];

    // e. Enqueue BullMQ job for each ticket+message
    await queue.add('process-message', {
      ticketId: ticket.id,
      messageId: firstMessage.id,
    });

    console.log(
      `   ✓ [${item.customer.language.toUpperCase()}] Ticket "${ticket.subject}" created for ${customer.name} (enqueued job for message ${firstMessage.id})`,
    );
  }

  await queue.close();
  await prisma.$disconnect();

  console.log('\n✓ Seeding complete! 5 tickets enqueued for AI processing.');
}

main().catch(async (e) => {
  console.error('Error during seeding:', e);
  await prisma.$disconnect();
  process.exit(1);
});
