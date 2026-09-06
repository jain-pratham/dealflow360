import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuthService } from '../src/auth/auth.service';
import { UserRole } from '@prisma/client';

describe('Customer Portal Full End-to-End Suite', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authService: AuthService;

  let customerUser: any;
  let customerUserB: any;
  let customerAccessToken: string;
  let customerBToken: string;

  let customerId: string;
  let customerBId: string;
  let quotationId: string;
  let invoiceId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false,
      }),
    );
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    authService = app.get<AuthService>(AuthService);

    // Create Customer Account A
    const custA = await prisma.customer.create({
      data: {
        name: 'Full Test Customer',
        companyName: 'Apex Enterprise',
        contactEmail: `full_customer_${Date.now()}@apex.com`,
        tier: 'GOLD',
        currency: 'INR',
      },
    });
    customerId = custA.id;

    customerUser = await prisma.user.create({
      data: {
        name: 'Customer A User',
        email: custA.contactEmail,
        passwordHash: 'hashed',
        role: UserRole.CUSTOMER,
        customerId: customerId,
        isActive: true,
      },
    });

    const tokensA = await authService.generateTokens(
      customerUser.id,
      customerUser.email,
      customerUser.role,
    );
    customerAccessToken = tokensA.accessToken;

    // Create Customer Account B
    const custB = await prisma.customer.create({
      data: {
        name: 'Customer B',
        companyName: 'Beta Corp',
        contactEmail: `full_customer_b_${Date.now()}@beta.com`,
        tier: 'BRONZE',
        currency: 'INR',
      },
    });
    customerBId = custB.id;

    customerUserB = await prisma.user.create({
      data: {
        name: 'Customer B User',
        email: custB.contactEmail,
        passwordHash: 'hashed',
        role: UserRole.CUSTOMER,
        customerId: customerBId,
        isActive: true,
      },
    });

    const tokensB = await authService.generateTokens(
      customerUserB.id,
      customerUserB.email,
      customerUserB.role,
    );
    customerBToken = tokensB.accessToken;

    // Create Product & Sales Rep
    const repUser = await prisma.user.upsert({
      where: { email: 'sales-full-test@dealflow360.com' },
      update: { role: UserRole.SALES_REP },
      create: {
        name: 'Full Test Sales Rep',
        email: 'sales-full-test@dealflow360.com',
        passwordHash: 'hashed',
        role: UserRole.SALES_REP,
        isActive: true,
      },
    });

    const product = await prisma.product.create({
      data: {
        name: 'Cloud Infrastructure License',
        sku: `SKU-CLOUD-${Date.now()}`,
        basePrice: 50000.0,
        currency: 'INR',
        isActive: true,
        productType: 'HARDWARE',
      },
    });

    // Create Sent Quotation for Customer A
    const quote = await prisma.quotation.create({
      data: {
        quoteNumber: `QT-FULL-${Date.now()}`,
        customerId: customerId,
        salesRepId: repUser.id,
        status: 'SENT',
        currency: 'INR',
        subtotalAmount: 50000.0,
        discountTotal: 2500.0,
        taxTotal: 8550.0,
        totalAmount: 56050.0,
        lines: {
          create: {
            productId: product.id,
            quantity: 1,
            unitPrice: 50000.0,
            discountPercent: 5.0,
            discountAmount: 2500.0,
            taxRate: 18.0,
            taxAmount: 8550.0,
            subtotal: 50000.0,
            finalUnitPrice: 56050.0,
            lineType: 'ONE_TIME',
          },
        },
      },
    });
    quotationId = quote.id;

    // Create Invoice for Customer A
    const inv = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-FULL-${Date.now()}`,
        customerId: customerId,
        quotationId: quotationId,
        invoiceType: 'ONE_TIME',
        amount: 56050.0,
        paidAmount: 0.0,
        remainingBalance: 56050.0,
        currency: 'INR',
        status: 'UNPAID',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });
    invoiceId = inv.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. GET /api/customer-portal/dashboard returns live customer metrics', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/customer-portal/dashboard')
      .set('Authorization', `Bearer ${customerAccessToken}`)
      .expect(200);

    expect(res.body.totalQuotations).toBe(1);
    expect(res.body.actionRequiredCount).toBe(1);
    expect(res.body.outstandingInvoiceAmount).toBe(56050.0);
    expect(res.body.recentQuotations.length).toBe(1);
    expect(res.body.recentQuotations[0].id).toBe(quotationId);
  });

  it('2. Data Isolation: Customer B cannot view Customer A invoice (404 Not Found)', async () => {
    await request(app.getHttpServer())
      .get(`/api/customer-portal/invoices/${invoiceId}`)
      .set('Authorization', `Bearer ${customerBToken}`)
      .expect(404);
  });

  it('3. GET /api/customer-portal/quotations/:id returns quotation with safe fulfillment progress & invoices', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/customer-portal/quotations/${quotationId}`)
      .set('Authorization', `Bearer ${customerAccessToken}`)
      .expect(200);

    expect(res.body.id).toBe(quotationId);
    expect(res.body.fulfillmentProgress).toBeDefined();
    expect(res.body.invoices.length).toBe(1);
    expect(res.body.invoices[0].id).toBe(invoiceId);
  });

  it('4. Razorpay Test Payment Flow: Customer creates order & verifies HMAC signature marking invoice PAID', async () => {
    // Create Razorpay Order
    const orderRes = await request(app.getHttpServer())
      .post('/api/payments/razorpay/order')
      .set('Authorization', `Bearer ${customerAccessToken}`)
      .send({ invoiceId })
      .expect(201);

    expect(orderRes.body.orderId).toBeDefined();
    expect(orderRes.body.amount).toBe(56050.0);

    // Verify Payment Signature
    const verifyRes = await request(app.getHttpServer())
      .post('/api/payments/razorpay/verify')
      .set('Authorization', `Bearer ${customerAccessToken}`)
      .send({
        invoiceId,
        razorpay_order_id: orderRes.body.orderId,
        razorpay_payment_id: `pay_test_${Date.now()}`,
        razorpay_signature: 'mock_valid_signature_for_testing',
      })
      .expect(201);

    expect(verifyRes.body.invoiceStatus).toBe('PAID');

    // Confirm invoice in DB is PAID
    const dbInvoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    expect(dbInvoice?.status).toBe('PAID');
    expect(Number(dbInvoice?.remainingBalance)).toBe(0);
  });
});
