import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Billing & Razorpay Payment Module (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/billing/invoices should return 401 Unauthenticated when no token provided', async () => {
    const response = await request(app.getHttpServer()).get('/billing/invoices');
    expect(response.status).toBe(401);
  });

  it('GET /api/subscriptions should return 401 Unauthenticated when no token provided', async () => {
    const response = await request(app.getHttpServer()).get('/subscriptions');
    expect(response.status).toBe(401);
  });

  it('POST /api/payments/razorpay/order should return 401 Unauthenticated when no token provided', async () => {
    const response = await request(app.getHttpServer())
      .post('/payments/razorpay/order')
      .send({ invoiceId: 'test-invoice-id' });
    expect(response.status).toBe(401);
  });
});
