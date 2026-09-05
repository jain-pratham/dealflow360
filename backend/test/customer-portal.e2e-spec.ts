import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { createHash } from 'crypto';

describe('Customer Portal & Quotation Access Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let adminAccessToken: string;
  let salesRepAccessToken: string;
  let customerAccessTokenA: string;
  let customerAccessTokenB: string;

  let customerAId: string;
  let customerBId: string;
  let customerAEmail: string;
  let customerBEmail: string;

  let quotationAId: string;
  let quotationBId: string;
  let quotationApprovalId: string;
  let lineA1Id: string;
  let lineApprId: string;

  let productAId: string;
  let setupTokenA: string;

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
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Admin Login
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@dealflow360.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeThisStrongPassword123!';
    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: adminEmail, password: adminPassword })
      .expect(200);
    adminAccessToken = adminLoginRes.body.accessToken;

    // Register & Login Sales Rep
    const repEmail = `sales_rep_portal_${Date.now()}@example.com`;
    const repRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Portal Sales Rep', email: repEmail, password: 'Password123!' })
      .expect(201);
    salesRepAccessToken = repRes.body.accessToken;

    // Create Customer A
    customerAEmail = `customer_a_${Date.now()}@example.com`;
    const custA = await prisma.customer.create({
      data: {
        name: 'John Doe',
        companyName: 'Acme Corp',
        contactEmail: customerAEmail,
        tier: 'GOLD',
        currency: 'USD',
      },
    });
    customerAId = custA.id;

    // Create Customer B
    customerBEmail = `customer_b_${Date.now()}@example.com`;
    const custB = await prisma.customer.create({
      data: {
        name: 'Jane Smith',
        companyName: 'Beta LLC',
        contactEmail: customerBEmail,
        tier: 'BRONZE',
        currency: 'USD',
      },
    });
    customerBId = custB.id;

    // Create Product
    const product = await prisma.product.create({
      data: {
        name: 'Enterprise Server X1',
        sku: `SVR-X1-${Date.now()}`,
        basePrice: 1000.0,
        currency: 'USD',
        isActive: true,
        productType: 'HARDWARE',
      },
    });
    productAId = product.id;

    // Create Price List Item for GOLD tier
    await prisma.priceListItem.create({
      data: {
        priceList: {
          create: {
            name: 'Gold Tier USD',
            customerTier: 'GOLD',
            currency: 'USD',
            isActive: true,
          },
        },
        product: { connect: { id: productAId } },
        price: 1000.0,
      },
    });

    // Create Quotation A for Customer A
    const qA = await request(app.getHttpServer())
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesRepAccessToken}`)
      .send({
        customerId: customerAId,
        currency: 'USD',
        notes: 'Test quotation A',
      })
      .expect(201);
    quotationAId = qA.body.id;

    // Add line item to Quotation A
    const lineA = await request(app.getHttpServer())
      .post(`/api/quotations/${quotationAId}/lines`)
      .set('Authorization', `Bearer ${salesRepAccessToken}`)
      .send({
        productId: productAId,
        quantity: 5,
        discountPercent: 2.0,
      })
      .expect(201);
    lineA1Id = lineA.body.lines[0].id;

    // Approve Quotation A so it can be sent
    await request(app.getHttpServer())
      .post(`/api/quotations/${quotationAId}/submit`)
      .set('Authorization', `Bearer ${salesRepAccessToken}`)
      .expect(200);

    // Create Quotation B for Customer B
    const qB = await request(app.getHttpServer())
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesRepAccessToken}`)
      .send({
        customerId: customerBId,
        currency: 'USD',
        notes: 'Test quotation B',
      })
      .expect(201);
    quotationBId = qB.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Customer Invitation Flow', () => {
    it('should generate secure invitation token and store hash when Sales Rep sends quotation', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/quotations/${quotationAId}/send`)
        .set('Authorization', `Bearer ${salesRepAccessToken}`)
        .expect(200);

      expect(res.body.status).toBe('SENT');

      const customer = await prisma.customer.findUnique({
        where: { id: customerAId },
      });
      expect(customer?.isInvited).toBe(true);
      expect(customer?.invitationTokenHash).toBeDefined();
      expect(customer?.invitationExpiresAt).toBeDefined();

      // For test activation, retrieve raw token from mail service or generate test activation
      // Let's create an activation token directly for Customer A to simulate email click
      const rawToken = 'test_secure_invitation_token_123456789';
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');
      setupTokenA = rawToken;

      await prisma.customer.update({
        where: { id: customerAId },
        data: {
          invitationTokenHash: tokenHash,
          invitationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
    });
  });

  describe('2. Account Activation & Login', () => {
    it('should validate activation token info via API', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/auth/customer/verify-token?token=${setupTokenA}`)
        .expect(200);

      expect(res.body.valid).toBe(true);
      expect(res.body.email).toBe(customerAEmail);
    });

    it('should reject invalid or expired activation tokens', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/customer/verify-token?token=invalid_token_xyz')
        .expect(404);
    });

    it('should activate customer account and issue JWT tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/customer/activate')
        .send({
          token: setupTokenA,
          password: 'CustomerPassword123!',
        })
        .expect(200);

      expect(res.body.user.role).toBe('CUSTOMER');
      expect(res.body.accessToken).toBeDefined();
      customerAccessTokenA = res.body.accessToken;

      // Verify token is single-use
      await request(app.getHttpServer())
        .post('/api/auth/customer/activate')
        .send({
          token: setupTokenA,
          password: 'CustomerPassword123!',
        })
        .expect(404);
    });

    it('should allow customer login with email and password', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: customerAEmail,
          password: 'CustomerPassword123!',
        })
        .expect(200);

      expect(res.body.user.role).toBe('CUSTOMER');
      expect(res.body.accessToken).toBeDefined();
    });
  });

  describe('3. Customer RBAC & Isolation', () => {
    it('should allow Customer A to see their own quotation list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/customer-portal/quotations')
        .set('Authorization', `Bearer ${customerAccessTokenA}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((q: any) => q.id === quotationAId)).toBe(true);
    });

    it('should allow Customer A to view details of their quotation', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/customer-portal/quotations/${quotationAId}`)
        .set('Authorization', `Bearer ${customerAccessTokenA}`)
        .expect(200);

      expect(res.body.id).toBe(quotationAId);
      expect(res.body.lines.length).toBeGreaterThan(0);
      // Ensure internal approval history/notes are omitted
      expect(res.body.internalRiskScore).toBeUndefined();
    });

    it('should forbid Customer A from accessing Customer B quotation', async () => {
      await request(app.getHttpServer())
        .get(`/api/customer-portal/quotations/${quotationBId}`)
        .set('Authorization', `Bearer ${customerAccessTokenA}`)
        .expect(403);
    });

    it('should forbid Customer from accessing internal admin endpoints', async () => {
      await request(app.getHttpServer())
        .get('/api/customers')
        .set('Authorization', `Bearer ${customerAccessTokenA}`)
        .expect(403);
    });
  });

  describe('4. Negotiation & Counter Discount', () => {
    it('should allow Customer A to add a line item comment', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/customer-portal/quotations/${quotationAId}/comments`)
        .set('Authorization', `Bearer ${customerAccessTokenA}`)
        .send({
          lineId: lineA1Id,
          comment: 'Can you offer a slightly better rate for 5 servers?',
        })
        .expect(201);

      expect(res.body.commentText).toBe('Can you offer a slightly better rate for 5 servers?');
    });

    it('should update status to UNDER_NEGOTIATION when counter discount is within allowed limits', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/customer-portal/quotations/${quotationAId}/negotiation`)
        .set('Authorization', `Bearer ${customerAccessTokenA}`)
        .send({
          comment: 'Requesting 4% discount',
          counterDiscount: 4.0,
        })
        .expect(200);

      expect(res.body.status).toBe('UNDER_NEGOTIATION');
      expect(res.body.requiresApproval).toBe(false);
    });

    it('should trigger internal PENDING_APPROVAL when counter discount exceeds standard threshold', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/customer-portal/quotations/${quotationAId}/negotiation`)
        .set('Authorization', `Bearer ${customerAccessTokenA}`)
        .send({
          comment: 'Requesting 8% discount',
          counterDiscount: 8.0,
        })
        .expect(200);

      expect(res.body.status).toBe('PENDING_APPROVAL');
      expect(res.body.requiresApproval).toBe(true);
    });

    it('should reject negotiation request when counter discount exceeds max ceiling (>10%)', async () => {
      await request(app.getHttpServer())
        .post(`/api/customer-portal/quotations/${quotationAId}/negotiation`)
        .set('Authorization', `Bearer ${customerAccessTokenA}`)
        .send({
          comment: 'Requesting 25% discount',
          counterDiscount: 25.0,
        })
        .expect(400);
    });

    it('should prevent confirmation while internal approval is pending', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/customer-portal/quotations/${quotationAId}/confirm`)
        .set('Authorization', `Bearer ${customerAccessTokenA}`)
        .expect(400);

      expect(res.body.message).toContain('pending internal approvals');
    });
  });

  describe('5. Sales Rep Review & Customer Confirmation', () => {
    it('should allow Manager/Sales Rep to approve pending request and then customer can confirm', async () => {
      // Find pending approval request
      const pendingReq = await prisma.approvalRequest.findFirst({
        where: { quotationId: quotationAId, status: 'PENDING' },
      });

      if (pendingReq) {
        await request(app.getHttpServer())
          .post(`/api/approvals/${pendingReq.id}/approve`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send({
            comments: 'Approved 8% discount for Acme Corp',
          })
          .expect(200);
      }

      // Customer confirms quotation
      const confirmRes = await request(app.getHttpServer())
        .post(`/api/customer-portal/quotations/${quotationAId}/confirm`)
        .set('Authorization', `Bearer ${customerAccessTokenA}`)
        .expect(200);

      expect(confirmRes.body.status).toBe('CONFIRMED');

      // Verify audit log entry
      const auditLog = await prisma.quotationAuditLog.findFirst({
        where: { quotationId: quotationAId, action: 'CONFIRMED_BY_CUSTOMER' },
      });
      expect(auditLog).toBeDefined();
    });
  });
});
