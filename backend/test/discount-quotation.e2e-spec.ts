import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Discount Governance & Quotation Workflow Engine (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let adminAccessToken: string;
  let salesRepAccessToken: string;
  let managerAccessToken: string;
  let financeAccessToken: string;
  let salesRepId: string;

  let testCustomerId: string;
  let testProductId: string;
  let testPriceListId: string;
  let testDiscountRuleId: string;
  let createdQuotationId: string;
  let createdApprovalRequestId: string;

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
    const repEmail = `e2e_rep_${Date.now()}@example.com`;
    const repRegisterRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'E2E Sales Rep', email: repEmail, password: 'Password123!' })
      .expect(201);
    salesRepAccessToken = repRegisterRes.body.accessToken;
    salesRepId = repRegisterRes.body.user.id;

    // Create Manager User
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const managerUser = await prisma.user.create({
      data: {
        name: 'E2E Manager',
        email: `e2e_manager_${Date.now()}@example.com`,
        passwordHash,
        role: 'SALES_MANAGER',
        isActive: true,
      },
    });
    const managerLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: managerUser.email, password: 'Password123!' })
      .expect(200);
    managerAccessToken = managerLoginRes.body.accessToken;

    // Create Finance User
    const financeUser = await prisma.user.create({
      data: {
        name: 'E2E Finance',
        email: `e2e_finance_${Date.now()}@example.com`,
        passwordHash,
        role: 'FINANCE',
        isActive: true,
      },
    });
    const financeLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: financeUser.email, password: 'Password123!' })
      .expect(200);
    financeAccessToken = financeLoginRes.body.accessToken;

    // Create Test Customer (GOLD tier)
    const customer = await prisma.customer.create({
      data: {
        name: 'John Customer',
        companyName: 'E2E Gold Client Pvt Ltd',
        contactEmail: `e2e_gold_${Date.now()}@client.com`,
        tier: 'GOLD',
        currency: 'INR',
        isActive: true,
      },
    });
    testCustomerId = customer.id;

    // Create Test Product
    const product = await prisma.product.create({
      data: {
        name: 'E2E Enterprise Laptop X1',
        sku: `E2E-HW-LAP-${Date.now()}`,
        productType: 'HARDWARE',
        basePrice: 80000,
        costPrice: 50000,
        taxRate: 18,
        currency: 'INR',
        isActive: true,
      },
    });
    testProductId = product.id;

    // Create Gold Price List with override price 74000
    const priceList = await prisma.priceList.create({
      data: {
        name: 'E2E Gold Tier Price Matrix',
        customerTier: 'GOLD',
        currency: 'INR',
        isActive: true,
        items: {
          create: {
            productId: testProductId,
            price: 74000,
          },
        },
      },
    });
    testPriceListId = priceList.id;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.quotationAuditLog?.deleteMany({ where: { quotation: { quoteNumber: { contains: 'QT-' } } } });
      await prisma.approvalRequest?.deleteMany({ where: { quotation: { quoteNumber: { contains: 'QT-' } } } });
      await prisma.quotationLine?.deleteMany({ where: { quotation: { quoteNumber: { contains: 'QT-' } } } });
      await prisma.quotation?.deleteMany({ where: { quoteNumber: { contains: 'QT-' } } });
      await prisma.discountRule?.deleteMany({ where: { name: { contains: 'E2E' } } });
      await prisma.priceListItem?.deleteMany({ where: { priceListId: testPriceListId } });
      await prisma.priceList?.deleteMany({ where: { id: testPriceListId } });
      await prisma.product?.deleteMany({ where: { id: testProductId } });
      await prisma.customer?.deleteMany({ where: { id: testCustomerId } });
      await prisma.user?.deleteMany({ where: { email: { contains: 'e2e_' } } });
    }
    if (app) {
      await app.close();
    }
  });

  // 1. Admin can create discount rule
  it('1. Should allow ADMIN to create discount rule (201 Created)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/discount-rules')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        name: 'E2E Gold Hardware Rule',
        customerTier: 'GOLD',
        productCategory: 'HARDWARE',
        maxDiscountPercent: 10,
        approvalThresholdPercent: 5,
        approvalRoleRequired: 'SALES_MANAGER',
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.maxDiscountPercent).toBe(10);
    expect(res.body.approvalThresholdPercent).toBe(5);
    testDiscountRuleId = res.body.id;
  });

  // 2. Non-admin cannot create discount rule
  it('2. Should reject non-admin from creating discount rule (403 Forbidden)', async () => {
    await request(app.getHttpServer())
      .post('/api/discount-rules')
      .set('Authorization', `Bearer ${salesRepAccessToken}`)
      .send({
        name: 'Unauthorized Rule',
        customerTier: 'BRONZE',
        productCategory: 'HARDWARE',
        maxDiscountPercent: 15,
        approvalThresholdPercent: 5,
        approvalRoleRequired: 'SALES_MANAGER',
      })
      .expect(403);
  });

  // 3. Invalid discount percentage rejected
  it('3. Should reject invalid discount percentage (> 100%)', async () => {
    await request(app.getHttpServer())
      .post('/api/discount-rules')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        name: 'Invalid Max Discount Rule',
        customerTier: 'SILVER',
        productCategory: 'HARDWARE',
        maxDiscountPercent: 150,
        approvalThresholdPercent: 5,
        approvalRoleRequired: 'SALES_MANAGER',
      })
      .expect(400);
  });

  // 4. Approval threshold greater than max discount rejected
  it('4. Should reject approval threshold greater than max discount', async () => {
    await request(app.getHttpServer())
      .post('/api/discount-rules')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        name: 'Invalid Threshold Rule',
        customerTier: 'SILVER',
        productCategory: 'HARDWARE',
        maxDiscountPercent: 10,
        approvalThresholdPercent: 15,
        approvalRoleRequired: 'SALES_MANAGER',
      })
      .expect(400);
  });

  // 5. Sales Rep can create quotation
  it('5. Should allow Sales Rep to create quotation (201 Created)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesRepAccessToken}`)
      .send({
        customerId: testCustomerId,
        currency: 'INR',
        notes: 'E2E Test Quotation',
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe('DRAFT');
    expect(res.body.customer.tier).toBe('GOLD');
    createdQuotationId = res.body.id;
  });

  // 6. Sales Rep can add product & 8. Price List price is resolved correctly
  it('6 & 8. Should add product line and resolve Gold Price List price (74000)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/quotations/${createdQuotationId}/lines`)
      .set('Authorization', `Bearer ${salesRepAccessToken}`)
      .send({
        productId: testProductId,
        quantity: 2,
        discountPercent: 3,
      })
      .expect(201);

    expect(res.body.lines.length).toBe(1);
    expect(res.body.lines[0].unitPrice).toBe(74000);
    expect(res.body.lines[0].quantity).toBe(2);
    expect(res.body.lines[0].discountPercent).toBe(3);
  });

  // 7. Inactive product cannot be added
  it('7. Should block adding inactive product to quotation (400 Bad Request)', async () => {
    const inactiveProd = await prisma.product.create({
      data: {
        name: 'Inactive Prod',
        sku: `INACTIVE-${Date.now()}`,
        productType: 'HARDWARE',
        basePrice: 1000,
        isActive: false,
      },
    });

    await request(app.getHttpServer())
      .post(`/api/quotations/${createdQuotationId}/lines`)
      .set('Authorization', `Bearer ${salesRepAccessToken}`)
      .send({
        productId: inactiveProd.id,
        quantity: 1,
      })
      .expect(400);

    await prisma.product.delete({ where: { id: inactiveProd.id } });
  });

  // 9. Quantity validation works
  it('9. Should reject 0 or negative quantity', async () => {
    await request(app.getHttpServer())
      .post(`/api/quotations/${createdQuotationId}/lines`)
      .set('Authorization', `Bearer ${salesRepAccessToken}`)
      .send({
        productId: testProductId,
        quantity: 0,
      })
      .expect(400);
  });

  // 10. Line subtotal & 11. Line discount calculated correctly
  it('10 & 11 & 27. Should calculate line subtotal, discount, tax, and totals correctly', async () => {
    const qRes = await request(app.getHttpServer())
      .get(`/api/quotations/${createdQuotationId}`)
      .set('Authorization', `Bearer ${salesRepAccessToken}`)
      .expect(200);

    // 74000 * 2 = 148000
    // Discount 3% = 4440
    // After discount = 143560
    // Tax 18% = 25840.8
    // Total = 169400.8
    expect(qRes.body.subtotalAmount).toBe(148000);
    expect(qRes.body.discountTotal).toBe(4440);
    expect(qRes.body.taxTotal).toBe(25840.8);
    expect(qRes.body.totalAmount).toBe(169400.8);
  });

  // 12. Discount within threshold is allowed (Auto-Approved on submit)
  it('12. Should auto-approve quotation when discount (3%) <= threshold (5%)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/quotations/${createdQuotationId}/submit`)
      .set('Authorization', `Bearer ${salesRepAccessToken}`)
      .expect(200);

    expect(res.body.status).toBe('APPROVED');
    expect(res.body.approvalRequests.length).toBe(0);
  });

  // 23. Approved quotation can be sent to customer
  it('23. Should send approved quotation to customer (200 OK -> SENT)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/quotations/${createdQuotationId}/send`)
      .set('Authorization', `Bearer ${salesRepAccessToken}`)
      .expect(200);

    expect(res.body.status).toBe('SENT');
  });

  // 13. Discount above threshold creates approval request (PENDING_APPROVAL)
  it('13 & 15. Should set PENDING_APPROVAL & create ApprovalRequest when discount (8%) > threshold (5%)', async () => {
    // Create new quotation
    const qRes = await request(app.getHttpServer())
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesRepAccessToken}`)
      .send({ customerId: testCustomerId })
      .expect(201);
    const qId = qRes.body.id;

    // Add line with 8% discount (Threshold is 5%, Max is 10%)
    await request(app.getHttpServer())
      .post(`/api/quotations/${qId}/lines`)
      .set('Authorization', `Bearer ${salesRepAccessToken}`)
      .send({
        productId: testProductId,
        quantity: 1,
        discountPercent: 8,
      })
      .expect(201);

    // Submit
    const subRes = await request(app.getHttpServer())
      .post(`/api/quotations/${qId}/submit`)
      .set('Authorization', `Bearer ${salesRepAccessToken}`)
      .expect(200);

    expect(subRes.body.status).toBe('PENDING_APPROVAL');
    expect(subRes.body.approvalRequests.length).toBe(1);
    expect(subRes.body.approvalRequests[0].requiredRole).toBe('SALES_MANAGER');
    expect(subRes.body.approvalRequests[0].status).toBe('PENDING');

    createdApprovalRequestId = subRes.body.approvalRequests[0].id;
  });

  // 22. Pending approval quotation cannot be sent
  it('22. Should block sending quotation while approval is pending (400 Bad Request)', async () => {
    const ar = await prisma.approvalRequest.findUnique({ where: { id: createdApprovalRequestId } });
    await request(app.getHttpServer())
      .post(`/api/quotations/${ar?.quotationId}/send`)
      .set('Authorization', `Bearer ${salesRepAccessToken}`)
      .expect(400);
  });

  // 14. Discount above maximum is rejected
  it('14. Should reject submission when requested discount (15%) > max allowed (10%)', async () => {
    // Create draft quotation
    const qRes = await request(app.getHttpServer())
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesRepAccessToken}`)
      .send({ customerId: testCustomerId })
      .expect(201);
    const qId = qRes.body.id;

    // Add line with 15% discount
    await request(app.getHttpServer())
      .post(`/api/quotations/${qId}/lines`)
      .set('Authorization', `Bearer ${salesRepAccessToken}`)
      .send({
        productId: testProductId,
        quantity: 1,
        discountPercent: 15,
      })
      .expect(201);

    // Submit should be rejected
    const subRes = await request(app.getHttpServer())
      .post(`/api/quotations/${qId}/submit`)
      .set('Authorization', `Bearer ${salesRepAccessToken}`)
      .expect(400);

    expect(subRes.body.message).toContain('exceeds maximum allowed limit');
  });

  // 16. Sales Rep cannot approve own request
  it('16. Should prevent Sales Rep from approving own approval request (403 Forbidden)', async () => {
    await request(app.getHttpServer())
      .post(`/api/approvals/${createdApprovalRequestId}/approve`)
      .set('Authorization', `Bearer ${salesRepAccessToken}`)
      .send({ comments: 'Self approval' })
      .expect(403);
  });

  // 19. Wrong role cannot approve request
  it('19. Should prevent Finance from approving Sales Manager request', async () => {
    await request(app.getHttpServer())
      .post(`/api/approvals/${createdApprovalRequestId}/approve`)
      .set('Authorization', `Bearer ${financeAccessToken}`)
      .send({ comments: 'Finance approval attempt' })
      .expect(403);
  });

  // 17. Sales Manager can approve Sales Manager request
  it('17 & 21. Should allow Sales Manager to approve request (Quotation -> APPROVED)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/approvals/${createdApprovalRequestId}/approve`)
      .set('Authorization', `Bearer ${managerAccessToken}`)
      .send({ comments: 'Approved by Sales Manager' })
      .expect(200);

    expect(res.body.status).toBe('APPROVED');
    expect(res.body.quotation.status).toBe('APPROVED');
  });

  // 25. Already approved request cannot be approved again
  it('25. Should block approving an already approved request (409 Conflict)', async () => {
    await request(app.getHttpServer())
      .post(`/api/approvals/${createdApprovalRequestId}/approve`)
      .set('Authorization', `Bearer ${managerAccessToken}`)
      .send({ comments: 'Duplicate approval' })
      .expect(409);
  });

  // 20. Rejection flow test
  it('20. Should handle rejection flow cleanly', async () => {
    // Create new quotation requiring approval
    const qRes = await request(app.getHttpServer())
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesRepAccessToken}`)
      .send({ customerId: testCustomerId })
      .expect(201);
    const qId = qRes.body.id;

    await request(app.getHttpServer())
      .post(`/api/quotations/${qId}/lines`)
      .set('Authorization', `Bearer ${salesRepAccessToken}`)
      .send({ productId: testProductId, quantity: 1, discountPercent: 7 })
      .expect(201);

    const subRes = await request(app.getHttpServer())
      .post(`/api/quotations/${qId}/submit`)
      .set('Authorization', `Bearer ${salesRepAccessToken}`)
      .expect(200);

    const reqId = subRes.body.approvalRequests[0].id;

    // Reject request
    const rejRes = await request(app.getHttpServer())
      .post(`/api/approvals/${reqId}/reject`)
      .set('Authorization', `Bearer ${managerAccessToken}`)
      .send({ comments: 'Discount too high for current margin target' })
      .expect(200);

    expect(rejRes.body.status).toBe('REJECTED');
    expect(rejRes.body.quotation.status).toBe('REJECTED');
  });
});
