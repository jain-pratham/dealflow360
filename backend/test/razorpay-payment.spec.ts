import crypto from 'crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuthService } from '../src/auth/auth.service';
import { InvoiceStatus, UserRole } from '@prisma/client';

describe('Razorpay Payment Integration & Customer Portal Security (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authService: AuthService;

  let customer1Token: string;
  let customer2Token: string;
  let financeToken: string;

  let customer1Id: string;
  let customer2Id: string;
  let invoice1Id: string;
  let invoice2Id: string;

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

    // Create Customers
    const cust1 = await prisma.customer.create({
      data: { name: 'Customer One', companyName: 'Company 1', contactEmail: 'cust1@test.com' },
    });
    customer1Id = cust1.id;

    const cust2 = await prisma.customer.create({
      data: { name: 'Customer Two', companyName: 'Company 2', contactEmail: 'cust2@test.com' },
    });
    customer2Id = cust2.id;

    const ts = Date.now();
    // Create Users
    const u1 = await prisma.user.create({
      data: { email: `cust1-user-${ts}@test.com`, name: 'Cust 1', passwordHash: 'hash', role: UserRole.CUSTOMER, customerId: customer1Id, isActive: true },
    });
    const u2 = await prisma.user.create({
      data: { email: `cust2-user-${ts}@test.com`, name: 'Cust 2', passwordHash: 'hash', role: UserRole.CUSTOMER, customerId: customer2Id, isActive: true },
    });
    const fin = await prisma.user.create({
      data: { email: `finance-user-${ts}@test.com`, name: 'Fin Rep', passwordHash: 'hash', role: UserRole.FINANCE, isActive: true },
    });

    const c1Tokens = await authService.generateTokens(u1.id, u1.email, u1.role);
    customer1Token = c1Tokens.accessToken;

    const c2Tokens = await authService.generateTokens(u2.id, u2.email, u2.role);
    customer2Token = c2Tokens.accessToken;

    const finTokens = await authService.generateTokens(fin.id, fin.email, fin.role);
    financeToken = finTokens.accessToken;

    // Dummy Quotation
    const quote1 = await prisma.quotation.create({
      data: { quoteNumber: `QT-TEST-${Date.now()}-1`, customerId: customer1Id, salesRepId: u1.id, currency: 'INR', totalAmount: 50000 },
    });
    const quote2 = await prisma.quotation.create({
      data: { quoteNumber: `QT-TEST-${Date.now()}-2`, customerId: customer2Id, salesRepId: u2.id, currency: 'INR', totalAmount: 75000 },
    });

    // Invoices
    const inv1 = await prisma.invoice.create({
      data: {
        quotationId: quote1.id,
        customerId: customer1Id,
        invoiceNumber: `INV-TST-${Date.now()}-1`,
        amount: 50000,
        paidAmount: 0,
        remainingBalance: 50000,
        currency: 'INR',
        status: InvoiceStatus.UNPAID,
        dueDate: new Date(),
      },
    });
    invoice1Id = inv1.id;

    const inv2 = await prisma.invoice.create({
      data: {
        quotationId: quote2.id,
        customerId: customer2Id,
        invoiceNumber: `INV-TST-${Date.now()}-2`,
        amount: 75000,
        paidAmount: 0,
        remainingBalance: 75000,
        currency: 'INR',
        status: InvoiceStatus.UNPAID,
        dueDate: new Date(),
      },
    });
    invoice2Id = inv2.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('TEST 17: Customer 1 can view own invoice', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/customer-portal/invoices/${invoice1Id}`)
      .set('Authorization', `Bearer ${customer1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(invoice1Id);
  });

  it('TEST 18: Customer 1 CANNOT view Customer 2 invoice (404/403 ownership isolation)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/customer-portal/invoices/${invoice2Id}`)
      .set('Authorization', `Bearer ${customer1Token}`);

    expect(res.status).toBe(404);
  });

  it('TEST 19/20: Customer can create Razorpay Test Order and amount is derived from DB', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/payments/razorpay/order')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({ invoiceId: invoice1Id });

    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(50000);
    expect(res.body.amountInPaise).toBe(5000000);
    expect(res.body.currency).toBe('INR');
    expect(res.body.orderId).toBeDefined();
  });

  it('TEST 21: Invalid Razorpay payment signature fails verification (400)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/payments/razorpay/verify')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        invoiceId: invoice1Id,
        razorpay_order_id: 'order_test_123',
        razorpay_payment_id: 'pay_test_invalid_999',
        razorpay_signature: 'invalid_forged_signature_hash',
      });

    expect(res.status).toBe(400);
  });

  it('TEST 22/24: Valid Razorpay signature creates Payment record & marks invoice PAID', async () => {
    const payId = `pay_rzp_${Date.now()}`;
    const orderId = `order_rzp_${Date.now()}`;
    const validSig = crypto.createHmac('sha256', 'secret_test_518244e6').update(`${orderId}|${payId}`).digest('hex');

    const res = await request(app.getHttpServer())
      .post('/api/payments/razorpay/verify')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        invoiceId: invoice1Id,
        razorpay_order_id: orderId,
        razorpay_payment_id: payId,
        razorpay_signature: validSig,
      });

    expect(res.status).toBe(201);
    expect(res.body.invoiceStatus).toBe(InvoiceStatus.PAID);

    const inv = await prisma.invoice.findUnique({ where: { id: invoice1Id } });
    expect(inv?.status).toBe(InvoiceStatus.PAID);
    expect(Number(inv?.remainingBalance)).toBe(0);
  });

  it('TEST 23: Duplicate Razorpay payment callback does not create duplicate Payment', async () => {
    const payId = `pay_duplicate_test_${Date.now()}`;
    const orderId = `order_duplicate_test_${Date.now()}`;
    const validSig = crypto.createHmac('sha256', 'secret_test_518244e6').update(`${orderId}|${payId}`).digest('hex');

    // First call
    await request(app.getHttpServer())
      .post('/api/payments/razorpay/verify')
      .set('Authorization', `Bearer ${customer2Token}`)
      .send({
        invoiceId: invoice2Id,
        razorpay_order_id: orderId,
        razorpay_payment_id: payId,
        razorpay_signature: validSig,
      });

    // Duplicate second call
    const resDup = await request(app.getHttpServer())
      .post('/api/payments/razorpay/verify')
      .set('Authorization', `Bearer ${customer2Token}`)
      .send({
        invoiceId: invoice2Id,
        razorpay_order_id: orderId,
        razorpay_payment_id: payId,
        razorpay_signature: validSig,
      });

    expect(resDup.status).toBe(201);
    expect(resDup.body.message).toContain('already verified');

    const paymentCount = await prisma.payment.count({ where: { gatewayPaymentId: payId } });
    expect(paymentCount).toBe(1);
  });

  it('TEST 25/26: Finance can view payments, Customer cannot access Finance payment APIs', async () => {
    const finRes = await request(app.getHttpServer())
      .get(`/api/billing/invoices/${invoice1Id}`)
      .set('Authorization', `Bearer ${financeToken}`);
    expect(finRes.status).toBe(200);

    const custRes = await request(app.getHttpServer())
      .post(`/api/billing/invoices/${invoice1Id}/payments`)
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({ amount: 5000, paymentMethod: 'CASH' });
    expect(custRes.status).toBe(403);
  });
});
