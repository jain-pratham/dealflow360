import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Approval Chains & Dynamic Engine Integration (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let adminAccessToken: string;
  let salesRepAccessToken: string;
  let salesRepId: string;

  let testCustomerId: string;
  let testProductId: string;
  let createdChainId1: string;
  let createdChainId2: string;

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

    // Get Admin credentials from DB or .env
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    const adminEmail = adminUser ? adminUser.email : 'admin@dealflow360.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeThisStrongPassword123!';

    // Admin Login
    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: adminEmail, password: adminPassword });

    adminAccessToken = adminLoginRes.body.accessToken;

    // Register & Login Sales Rep
    const repEmail = `chain_rep_${Date.now()}@example.com`;
    const repRegisterRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Chain Sales Rep', email: repEmail, password: 'Password123!' })
      .expect(201);

    salesRepAccessToken = repRegisterRes.body.accessToken;
    salesRepId = repRegisterRes.body.user.id;

    // Clean up test approval chains, requests and test data
    await prisma.approvalRequest.deleteMany();
    await prisma.approvalChain.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. GET /api/approval-chains on clean DB returns empty list []', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/approval-chains')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  it('2. Non-admin user cannot create an approval chain (403 Forbidden)', async () => {
    await request(app.getHttpServer())
      .post('/api/approval-chains')
      .set('Authorization', `Bearer ${salesRepAccessToken}`)
      .send({
        name: 'Unauthorized Chain',
        requiredRole: 'SALES_MANAGER',
        sequence: 1,
      })
      .expect(403);
  });

  it('3. Admin creates Tier 1 Approval Chain (SALES_MANAGER)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/approval-chains')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        name: 'Standard Manager Approval',
        description: 'Triggered when discount exceeds 5%',
        requiredRole: 'SALES_MANAGER',
        sequence: 1,
        isActive: true,
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe('Standard Manager Approval');
    expect(res.body.requiredRole).toBe('SALES_MANAGER');
    expect(res.body.sequence).toBe(1);
    expect(res.body.isActive).toBe(true);

    createdChainId1 = res.body.id;
  });

  it('4. Admin creates Tier 2 Approval Chain (FINANCE)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/approval-chains')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        name: 'Finance High-Risk Governance',
        description: 'Triggered for finance-level risk',
        requiredRole: 'FINANCE',
        sequence: 2,
        isActive: true,
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe('Finance High-Risk Governance');
    expect(res.body.requiredRole).toBe('FINANCE');
    expect(res.body.sequence).toBe(2);

    createdChainId2 = res.body.id;
  });

  it('5. Admin updates an Approval Chain', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/approval-chains/${createdChainId1}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        description: 'Updated Tier 1 Manager Approval Description',
      })
      .expect(200);

    expect(res.body.description).toBe('Updated Tier 1 Manager Approval Description');
  });

  it('6. Persistence check: Approval Chains exist in PostgreSQL DB', async () => {
    const chainsInDb = await prisma.approvalChain.findMany();
    expect(chainsInDb.length).toBe(2);
  });

  it('7. Fail-safe test: Approval-required quotation fails with clear error when active chain is deactivated', async () => {
    // Setup test customer, product, and discount rule (max 10%, threshold 5%)
    const customer = await prisma.customer.create({
      data: {
        name: 'FailSafe Customer',
        companyName: 'FailSafe Corp',
        contactEmail: 'failsafe@example.com',
        tier: 'BRONZE',
      },
    });
    testCustomerId = customer.id;

    const product = await prisma.product.create({
      data: {
        name: 'FailSafe Hardware',
        sku: `SKU-FS-${Date.now()}`,
        basePrice: 1000.0,
        productType: 'HARDWARE',
      },
    });
    testProductId = product.id;

    // Create discount rule for BRONZE HARDWARE (max 10%, threshold 5%, requiredRole: SALES_MANAGER)
    await prisma.discountRule.upsert({
      where: {
        customerTier_productCategory: {
          customerTier: 'BRONZE',
          productCategory: 'HARDWARE',
        },
      },
      update: {
        maxAllowedDiscount: 10.0,
        approvalThresholdPercent: 5.0,
        approvalRoleRequired: 'SALES_MANAGER',
        isActive: true,
      },
      create: {
        name: 'BRONZE HARDWARE Governance',
        customerTier: 'BRONZE',
        productCategory: 'HARDWARE',
        maxAllowedDiscount: 10.0,
        approvalThresholdPercent: 5.0,
        approvalRoleRequired: 'SALES_MANAGER',
        isActive: true,
      },
    });

    // Deactivate Tier 1 chain
    await prisma.approvalChain.update({
      where: { id: createdChainId1 },
      data: { isActive: false },
    });

    // Create draft quotation with 8% discount (requires approval)
    const quoteRes = await request(app.getHttpServer())
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesRepAccessToken}`)
      .send({
        customerId: testCustomerId,
        currency: 'INR',
        lines: [
          {
            productId: testProductId,
            quantity: 1,
            discountPercent: 8,
          },
        ],
      })
      .expect(201);

    const quoteId = quoteRes.body.id;

    // Attempt to submit quotation -> should FAIL cleanly with 400 error
    const submitRes = await request(app.getHttpServer())
      .post(`/api/quotations/${quoteId}/submit`)
      .set('Authorization', `Bearer ${salesRepAccessToken}`)
      .expect(400);

    expect(submitRes.body.message).toContain(
      'No active approval chain configured for the required approval role: SALES_MANAGER',
    );

    // Verify quotation was NOT approved or submitted
    const quoteDb = await prisma.quotation.findUnique({ where: { id: quoteId } });
    expect(quoteDb?.status).toBe('DRAFT');

    // Verify NO approval request was created
    const reqs = await prisma.approvalRequest.findMany({ where: { quotationId: quoteId } });
    expect(reqs.length).toBe(0);
  });

  it('8. Active Approval Chain flow: 8% discount creates ApprovalRequest linked to approvalChainId & becomes PENDING_APPROVAL', async () => {
    // Re-activate Tier 1 chain
    await prisma.approvalChain.update({
      where: { id: createdChainId1 },
      data: { isActive: true },
    });

    // Create draft quotation with 8% discount
    const quoteRes = await request(app.getHttpServer())
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesRepAccessToken}`)
      .send({
        customerId: testCustomerId,
        currency: 'INR',
        lines: [
          {
            productId: testProductId,
            quantity: 1,
            discountPercent: 8,
          },
        ],
      })
      .expect(201);

    const quoteId = quoteRes.body.id;

    // Submit quotation -> SHOULD SUCCEED & require approval
    const submitRes = await request(app.getHttpServer())
      .post(`/api/quotations/${quoteId}/submit`)
      .set('Authorization', `Bearer ${salesRepAccessToken}`)
      .expect(200);

    expect(submitRes.body.status).toBe('PENDING_APPROVAL');
    expect(submitRes.body.approvalRequests).toBeDefined();
    expect(submitRes.body.approvalRequests.length).toBe(1);

    const ar = submitRes.body.approvalRequests[0];
    expect(ar.approvalChainId).toBe(createdChainId1);
    expect(ar.requiredRole).toBe('SALES_MANAGER');
    expect(ar.status).toBe('PENDING');
  });

  it('9. Discount Governance ceiling check: 12% discount (> max 10%) is blocked & NO ApprovalRequest is created', async () => {
    // Create draft quotation with 12% discount (> max allowed 10%)
    const quoteRes = await request(app.getHttpServer())
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesRepAccessToken}`)
      .send({
        customerId: testCustomerId,
        currency: 'INR',
        lines: [
          {
            productId: testProductId,
            quantity: 1,
            discountPercent: 12,
          },
        ],
      })
      .expect(201);

    const quoteId = quoteRes.body.id;

    // Submit quotation -> SHOULD BE REJECTED by Discount Governance
    const submitRes = await request(app.getHttpServer())
      .post(`/api/quotations/${quoteId}/submit`)
      .set('Authorization', `Bearer ${salesRepAccessToken}`)
      .expect(400);

    expect(submitRes.body.message).toContain('exceeds maximum allowed limit of 10%');

    // Verify NO ApprovalRequest created
    const reqs = await prisma.approvalRequest.findMany({ where: { quotationId: quoteId } });
    expect(reqs.length).toBe(0);
  });

  it('10. Safety deletion check: Cannot delete an ApprovalChain referenced by historical ApprovalRequests', async () => {
    const deleteRes = await request(app.getHttpServer())
      .delete(`/api/approval-chains/${createdChainId1}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(400);

    expect(deleteRes.body.message).toContain('Cannot delete approval chain');

    // Verify chain is still in DB
    const chainDb = await prisma.approvalChain.findUnique({ where: { id: createdChainId1 } });
    expect(chainDb).toBeDefined();
  });
});
