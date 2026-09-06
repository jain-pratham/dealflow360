import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuthService } from '../src/auth/auth.service';
import { SubscriptionsService } from '../src/subscriptions/subscriptions.service';
import { BillingService } from '../src/billing/billing.service';
import { LineType, ProductType, QuotationStatus, SubscriptionInterval } from '@prisma/client';

describe('Hybrid Billing & Quotations Engine (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authService: AuthService;
  let subscriptionsService: SubscriptionsService;

  let adminToken: string;
  let salesRepToken: string;
  let managerToken: string;

  let customerId: string;
  let hardwareProductId: string;
  let subscriptionProductId: string;
  let activePlanId: string;
  let inactivePlanId: string;

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
    subscriptionsService = app.get<SubscriptionsService>(SubscriptionsService);

    // Setup Test Users
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin-hybrid-test@dealflow360.com' },
      update: { role: 'ADMIN', isActive: true },
      create: { email: 'admin-hybrid-test@dealflow360.com', name: 'Admin Hybrid', passwordHash: 'hash', role: 'ADMIN' },
    });

    const salesRepUser = await prisma.user.upsert({
      where: { email: 'rep-hybrid-test@dealflow360.com' },
      update: { role: 'SALES_REP', isActive: true },
      create: { email: 'rep-hybrid-test@dealflow360.com', name: 'Sales Rep Hybrid', passwordHash: 'hash', role: 'SALES_REP' },
    });

    const managerUser = await prisma.user.upsert({
      where: { email: 'mgr-hybrid-test@dealflow360.com' },
      update: { role: 'SALES_MANAGER', isActive: true },
      create: { email: 'mgr-hybrid-test@dealflow360.com', name: 'Sales Manager Hybrid', passwordHash: 'hash', role: 'SALES_MANAGER' },
    });

    const adminTokens = await authService.generateTokens(adminUser.id, adminUser.email, adminUser.role);
    adminToken = adminTokens.accessToken;

    const repTokens = await authService.generateTokens(salesRepUser.id, salesRepUser.email, salesRepUser.role);
    salesRepToken = repTokens.accessToken;

    const mgrTokens = await authService.generateTokens(managerUser.id, managerUser.email, managerUser.role);
    managerToken = mgrTokens.accessToken;

    // Setup Customer
    const cust = await prisma.customer.create({
      data: {
        name: 'ABC Corp',
        companyName: 'ABC Enterprises',
        contactEmail: 'contact@abc.com',
        tier: 'GOLD',
      },
    });
    customerId = cust.id;

    // Setup Products
    const prod1 = await prisma.product.create({
      data: {
        name: 'Enterprise Laptop',
        sku: `LAPTOP-${Date.now()}`,
        basePrice: 50000,
        productType: ProductType.HARDWARE,
      },
    });
    hardwareProductId = prod1.id;

    const prod2 = await prisma.product.create({
      data: {
        name: 'Cloud Support Package',
        sku: `SUPPORT-${Date.now()}`,
        basePrice: 10000,
        productType: ProductType.SUBSCRIPTION,
      },
    });
    subscriptionProductId = prod2.id;

    // Setup Active and Inactive Subscription Plans
    const activePlan = await prisma.subscriptionPlan.create({
      data: {
        name: 'Monthly Premium Cloud Support Plan',
        interval: SubscriptionInterval.MONTHLY,
        price: 10000,
        prorationPolicy: 'EXACT_DAY_PRO_RATA',
        refundPolicy: 'PARTIAL_CREDIT_NOTE',
        isActive: true,
      },
    });
    activePlanId = activePlan.id;

    const inactivePlan = await prisma.subscriptionPlan.create({
      data: {
        name: 'Deprecated Legacy Support Plan',
        interval: SubscriptionInterval.MONTHLY,
        price: 8000,
        isActive: false,
      },
    });
    inactivePlanId = inactivePlan.id;

    // Ensure active Approval Chain exists for Sales Manager
    const existingChain = await prisma.approvalChain.findFirst({
      where: { requiredRole: 'SALES_MANAGER', isActive: true },
    });
    if (!existingChain) {
      await prisma.approvalChain.create({
        data: {
          name: 'Standard Manager Approval Chain',
          requiredRole: 'SALES_MANAGER',
          sequence: 1,
          isActive: true,
        },
      });
    }

    // Ensure Discount Rule exists for HARDWARE & SUBSCRIPTION GOLD tier
    await prisma.discountRule.upsert({
      where: { customerTier_productCategory: { customerTier: 'GOLD', productCategory: ProductType.HARDWARE } },
      update: { maxAllowedDiscount: 15, approvalThresholdPercent: 5 },
      create: { customerTier: 'GOLD', productCategory: ProductType.HARDWARE, maxAllowedDiscount: 15, approvalThresholdPercent: 5 },
    });
    await prisma.discountRule.upsert({
      where: { customerTier_productCategory: { customerTier: 'GOLD', productCategory: ProductType.SUBSCRIPTION } },
      update: { maxAllowedDiscount: 15, approvalThresholdPercent: 5 },
      create: { customerTier: 'GOLD', productCategory: ProductType.SUBSCRIPTION, maxAllowedDiscount: 15, approvalThresholdPercent: 5 },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('TEST 6: RECURRING quotation line without subscription plan fails (400)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesRepToken}`)
      .send({
        customerId,
        lines: [
          {
            productId: subscriptionProductId,
            lineType: LineType.RECURRING,
            quantity: 1,
            // subscriptionPlanId is missing!
          },
        ],
      });

    expect(res.status).toBe(400);
  });

  it('TEST 4/7: Inactive subscription plan cannot be selected for recurring line (400)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesRepToken}`)
      .send({
        customerId,
        lines: [
          {
            productId: subscriptionProductId,
            lineType: LineType.RECURRING,
            subscriptionPlanId: inactivePlanId,
            quantity: 1,
          },
        ],
      });

    expect(res.status).toBe(400);
  });

  it('TEST 5: ONE_TIME quotation line succeeds without subscription plan', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesRepToken}`)
      .send({
        customerId,
        lines: [
          {
            productId: hardwareProductId,
            lineType: LineType.ONE_TIME,
            quantity: 1,
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.lines.length).toBe(1);
    expect(res.body.lines[0].lineType).toBe(LineType.ONE_TIME);
  });

  it('TEST 8/9/10/11: Hybrid quotation (ONE_TIME + RECURRING) creation & confirmation workflow', async () => {
    // 1. Create Hybrid Quotation with 8% discount (requires manager approval)
    const createRes = await request(app.getHttpServer())
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesRepToken}`)
      .send({
        customerId,
        lines: [
          {
            productId: hardwareProductId,
            lineType: LineType.ONE_TIME,
            quantity: 1,
            discountPercent: 8,
          },
          {
            productId: subscriptionProductId,
            lineType: LineType.RECURRING,
            subscriptionPlanId: activePlanId,
            quantity: 1,
            discountPercent: 8,
          },
        ],
      });

    expect(createRes.status).toBe(201);
    const quoteId = createRes.body.id;

    // 2. Submit quotation -> PENDING_APPROVAL
    const submitRes = await request(app.getHttpServer())
      .post(`/api/quotations/${quoteId}/submit`)
      .set('Authorization', `Bearer ${salesRepToken}`);

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.status).toBe(QuotationStatus.PENDING_APPROVAL);

    // 3. Manager approves
    const approvalReqId = submitRes.body.approvalRequests[0].id;
    const approveRes = await request(app.getHttpServer())
      .post(`/api/approvals/${approvalReqId}/approve`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ comments: 'Approved 8% discount' });

    expect(approveRes.status).toBe(200);

    // 4. Confirm Quotation via Billing Engine directly
    const confirmRes = await subscriptionsService.generateRecurringInvoices();
    const billingResults = await app.get(SubscriptionsService);

    // Process confirmed quotation
    const quoteInDb = await prisma.quotation.findUnique({ where: { id: quoteId } });
    await prisma.quotation.update({ where: { id: quoteId }, data: { status: QuotationStatus.CONFIRMED } });
    const billingService = app.get(BillingService);
    await billingService.processConfirmedQuotation(quoteId);

    // Verify Invoice and SubscriptionSchedule
    const oneTimeInvoices = await prisma.invoice.findMany({ where: { quotationId: quoteId, invoiceType: 'ONE_TIME' } });
    const schedules = await prisma.subscriptionSchedule.findMany({ where: { quotationId: quoteId } });

    expect(oneTimeInvoices.length).toBe(1);
    expect(schedules.length).toBe(1);
    expect(schedules[0].planId).toBe(activePlanId);
    expect(schedules[0].status).toBe('ACTIVE');
  });

  it('TEST 15/16: BullMQ recurring billing generation and idempotency check', async () => {
    // Generate recurring invoices
    const firstRun = await subscriptionsService.generateRecurringInvoices();
    const secondRun = await subscriptionsService.generateRecurringInvoices();

    // Second run must be idempotent and generate 0 duplicate invoices for the same period
    expect(secondRun.generatedInvoicesCount).toBe(0);
  });
});
