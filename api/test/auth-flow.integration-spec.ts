import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { ThrottlerGuard } from '@nestjs/throttler';

// Ensure .env is loaded
try {
  process.loadEnvFile?.(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env'),
  );
} catch {
  try {
    process.loadEnvFile?.();
  } catch {
    // Ignore if already loaded
  }
}

describe('Auth Flow Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const createdUserIds: string[] = [];
  const timestamp = Date.now();
  const testAgent = {
    email: `agent.auth.${timestamp}@polydesk-test.com`,
    password: 'SecurePassword123!',
    name: 'Integration Test Agent',
  };

  let validJwtToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    try {
      if (createdUserIds.length > 0) {
        await prisma.user.deleteMany({
          where: { id: { in: createdUserIds } },
        });
      }
    } finally {
      await app.close();
    }
  });

  it('1. registers a new agent and verifies the password is securely hashed in the database', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send(testAgent)
      .expect(201);

    expect(res.body).toBeDefined();
    expect(res.body.id).toBeDefined();
    expect(res.body.email).toBe(testAgent.email);
    expect(res.body.name).toBe(testAgent.name);
    expect(res.body.password).toBeUndefined(); // Password must never be returned in response

    createdUserIds.push(res.body.id);

    // Verify database record
    const userInDb = await prisma.user.findUnique({
      where: { id: res.body.id },
    });
    expect(userInDb).not.toBeNull();
    // Confirm password is NOT stored in plaintext
    expect(userInDb!.password).not.toBe(testAgent.password);
    // Confirm password matches standard bcrypt hash pattern ($2a$ or $2b$)
    expect(userInDb!.password).toMatch(/^\$2[ab]\$/);
    // Confirm password is verifiable with bcrypt
    const isBcryptMatch = await bcrypt.compare(
      testAgent.password,
      userInDb!.password,
    );
    expect(isBcryptMatch).toBe(true);
  });

  it('2. logs in with correct credentials and returns a valid JWT access token', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: testAgent.email,
        password: testAgent.password,
      })
      .expect(201);

    expect(res.body).toHaveProperty('accessToken');
    expect(typeof res.body.accessToken).toBe('string');
    expect(res.body.accessToken.split('.')).toHaveLength(3); // Valid JWT structure header.payload.signature

    validJwtToken = res.body.accessToken;
  });

  it('3. rejects login with incorrect password with 401 Unauthorized', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: testAgent.email,
        password: 'WrongPassword999!',
      })
      .expect(401);

    expect(res.body.message).toBe('Invalid credentials');
  });

  it('4. grants access to protected routes with a valid token and denies access without one', async () => {
    // A. Unauthenticated request to GET /tickets -> 401
    await request(app.getHttpServer())
      .get('/tickets')
      .expect(401);

    // B. Request with invalid token -> 401
    await request(app.getHttpServer())
      .get('/tickets')
      .set('Authorization', 'Bearer invalid.jwt.token')
      .expect(401);

    // C. Authenticated request with valid JWT token -> 200
    const authRes = await request(app.getHttpServer())
      .get('/tickets')
      .set('Authorization', `Bearer ${validJwtToken}`)
      .expect(200);

    expect(Array.isArray(authRes.body)).toBe(true);

    // D. Profile route GET /auth/me with valid JWT token -> 200
    const meRes = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${validJwtToken}`)
      .expect(200);

    expect(meRes.body.email).toBe(testAgent.email);
    expect(meRes.body.name).toBe(testAgent.name);
  });
});
