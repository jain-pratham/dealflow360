import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuthService } from '../src/auth/auth.service';

describe('Subscription Plans CRUD & Security (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authService: AuthService;

  let adminToken: string;
  let salesRepToken: string;
  let customerToken: string;
  let testPlanId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    authService = app.get<AuthService>(AuthService);

    // Create fixture users
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin-sub-test@dealflow360.com' },
      update: { role: 'ADMIN', isActive: true },
      create: {
        email: 'admin-sub-test@dealflow360.com',
        name: 'Admin Test User',
        passwordHash: 'hashed',
        role: 'ADMIN',
        isActive: true,
      },
    });

    const salesRepUser = await prisma.user.upsert({
      where: { email: 'rep-sub-test@dealflow360.com' },
      update: { role: 'SALES_REP', isActive: true },
      create: {
        email: 'rep-sub-test@dealflow360.com',
        name: 'Sales Rep User',
        passwordHash: 'hashed',
        role: 'SALES_REP',
        isActive: true,
      },
    });

    const customerUser = await prisma.user.upsert({
      where: { email: 'cust-sub-test@dealflow360.com' },
      update: { role: 'CUSTOMER', isActive: true },
      create: {
        email: 'cust-sub-test@dealflow360.com',
        name: 'Customer User',
        passwordHash: 'hashed',
        role: 'CUSTOMER',
        isActive: true,
      },
    });

    const adminTokens = await authService.generateTokens(adminUser.id, adminUser.email, adminUser.role);
    adminToken = adminTokens.accessToken;

    const repTokens = await authService.generateTokens(salesRepUser.id, salesRepUser.email, salesRepUser.role);
    salesRepToken = repTokens.accessToken;

    const custTokens = await authService.generateTokens(customerUser.id, customerUser.email, customerUser.role);
    customerToken = custTokens.accessToken;
  });

  afterAll(async () => {
    if (testPlanId) {
      await prisma.subscriptionPlan.deleteMany({ where: { id: testPlanId } });
    }
    await app.close();
  });

  it('TEST 1: Admin can create a new subscription plan (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/subscription-plans')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Enterprise Monthly Plan',
        description: 'Monthly test subscription',
        price: 15000,
        currency: 'INR',
        interval: 'MONTHLY',
        prorationPolicy: 'EXACT_DAY_PRO_RATA',
        refundPolicy: 'PARTIAL_CREDIT_NOTE',
        isActive: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test Enterprise Monthly Plan');
    expect(res.body.interval).toBe('MONTHLY');
    expect(res.body.isActive).toBe(true);
    testPlanId = res.body.id;
  });

  it('TEST 2: Non-admin (Sales Rep / Customer) cannot create a subscription plan (403)', async () => {
    const resRep = await request(app.getHttpServer())
      .post('/api/subscription-plans')
      .set('Authorization', `Bearer ${salesRepToken}`)
      .send({
        name: 'Unauthorized Plan',
        interval: 'MONTHLY',
      });
    expect(resRep.status).toBe(403);

    const resCust = await request(app.getHttpServer())
      .post('/api/subscription-plans')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        name: 'Unauthorized Customer Plan',
        interval: 'MONTHLY',
      });
    expect(resCust.status).toBe(403);
  });

  it('TEST 3: Admin can update a subscription plan', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/subscription-plans/${testPlanId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        price: 18000,
        description: 'Updated description',
      });

    expect(res.status).toBe(200);
    expect(res.body.price).toBe(18000);
    expect(res.body.description).toBe('Updated description');
  });

  it('TEST 4: Admin can activate and deactivate a subscription plan', async () => {
    // Deactivate
    const resDeact = await request(app.getHttpServer())
      .patch(`/api/subscription-plans/${testPlanId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });

    expect(resDeact.status).toBe(200);
    expect(resDeact.body.isActive).toBe(false);

    // Reactivate
    const resAct = await request(app.getHttpServer())
      .patch(`/api/subscription-plans/${testPlanId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: true });

    expect(resAct.status).toBe(200);
    expect(resAct.body.isActive).toBe(true);
  });

  it('TEST 5: Internal roles can read active plans, Customer cannot access internal config APIs (403)', async () => {
    const resRep = await request(app.getHttpServer())
      .get('/api/subscription-plans')
      .set('Authorization', `Bearer ${salesRepToken}`);
    expect(resRep.status).toBe(200);

    const resCust = await request(app.getHttpServer())
      .get('/api/subscription-plans')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(resCust.status).toBe(403);
  });
});
