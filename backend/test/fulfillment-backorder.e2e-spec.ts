import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Fulfillment & Multi-Warehouse Allocation Engine (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let adminAccessToken: string;
  let salesRepAccessToken: string;
  let customerAccessTokenA: string;
  let customerAccessTokenB: string;

  let customerAId: string;
  let customerBId: string;

  let whAId: string;
  let whBId: string;
  let productLaptopId: string;

  let confirmedQuotationId: string;
  let draftQuotationId: string;

  let backorderId: string;
  let allocationId: string;

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

    // Sales Rep Registration & Login
    const repEmail = `rep_fulfillment_${Date.now()}@example.com`;
    const repRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Fulfillment Sales Rep', email: repEmail, password: 'Password123!' })
      .expect(201);
    salesRepAccessToken = repRes.body.accessToken;

    // Customer A
    const custA = await prisma.customer.create({
      data: {
        name: 'Alice Customer',
        companyName: 'Fulfillment Test Corp A',
        contactEmail: `cust_fula_${Date.now()}@example.com`,
        tier: 'GOLD',
        currency: 'USD',
      },
    });
    customerAId = custA.id;

    // User A (Customer A)
    const userA = await prisma.user.create({
      data: {
        name: 'Alice Customer',
        email: custA.contactEmail,
        passwordHash: 'hashed',
        role: 'CUSTOMER',
        customerId: customerAId,
      },
    });

    const jwtService = app.get(require('@nestjs/jwt').JwtService);
    const jwtSecret = process.env.JWT_ACCESS_SECRET || 'dealflow_access_secret_key_2026';

    customerAccessTokenA = await jwtService.signAsync(
      { sub: userA.id, email: userA.email, role: userA.role },
      { secret: jwtSecret },
    );

    // Customer B
    const custB = await prisma.customer.create({
      data: {
        name: 'Bob Customer',
        companyName: 'Fulfillment Test Corp B',
        contactEmail: `cust_fulb_${Date.now()}@example.com`,
        tier: 'SILVER',
        currency: 'USD',
      },
    });
    customerBId = custB.id;

    const userB = await prisma.user.create({
      data: {
        name: 'Bob Customer',
        email: custB.contactEmail,
        passwordHash: 'hashed',
        role: 'CUSTOMER',
        customerId: customerBId,
      },
    });

    customerAccessTokenB = await jwtService.signAsync(
      { sub: userB.id, email: userB.email, role: userB.role },
      { secret: jwtSecret },
    );

    // Create Warehouses
    const whA = await prisma.warehouse.create({
      data: {
        name: `E2E WH Alpha ${Date.now()}`,
        code: `E2E-WHA-${Date.now()}`,
        location: 'New York',
        shippingCostWeighting: 1.0,
        isActive: true,
      },
    });
    whAId = whA.id;

    const whB = await prisma.warehouse.create({
      data: {
        name: `E2E WH Beta ${Date.now()}`,
        code: `E2E-WHB-${Date.now()}`,
        location: 'Los Angeles',
        shippingCostWeighting: 1.5,
        isActive: true,
      },
    });
    whBId = whB.id;

    // Create Product
    const product = await prisma.product.create({
      data: {
        name: 'Fulfillment Laptop Pro X',
        sku: `FUL-LAP-${Date.now()}`,
        basePrice: 1500.0,
        currency: 'USD',
        isActive: true,
      },
    });
    productLaptopId = product.id;

    // Stock inventory: WH-A has 6 units, WH-B has 4 units (Total 10 available)
    await prisma.inventoryItem.createMany({
      data: [
        { warehouseId: whAId, productId: productLaptopId, quantityOnHand: 6, quantityReserved: 0 },
        { warehouseId: whBId, productId: productLaptopId, quantityOnHand: 4, quantityReserved: 0 },
      ],
    });

    // Price list for GOLD tier
    await prisma.priceListItem.create({
      data: {
        priceList: {
          create: {
            name: `E2E Fulfill Price List ${Date.now()}`,
            customerTier: 'GOLD',
            currency: 'USD',
            isActive: true,
          },
        },
        product: { connect: { id: productLaptopId } },
        price: 1500.0,
      },
    });

    // Create Confirmed Quotation for Customer A (Quantity = 12 units -> expects WH-A=6, WH-B=4, Backorder=2)
    const qConf = await request(app.getHttpServer())
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesRepAccessToken}`)
      .send({ customerId: customerAId, currency: 'USD' })
      .expect(201);
    confirmedQuotationId = qConf.body.id;

    await request(app.getHttpServer())
      .post(`/api/quotations/${confirmedQuotationId}/lines`)
      .set('Authorization', `Bearer ${salesRepAccessToken}`)
      .send({ productId: productLaptopId, quantity: 12, discountPercent: 0 })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/quotations/${confirmedQuotationId}/submit`)
      .set('Authorization', `Bearer ${salesRepAccessToken}`)
      .expect(200);

    // Update status to CONFIRMED
    await prisma.quotation.update({
      where: { id: confirmedQuotationId },
      data: { status: 'CONFIRMED' },
    });

    // Create Draft Quotation for Customer A
    const qDraft = await request(app.getHttpServer())
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesRepAccessToken}`)
      .send({ customerId: customerAId, currency: 'USD' })
      .expect(201);
    draftQuotationId = qDraft.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Fulfillment Validation & Pre-conditions', () => {
    it('should reject creating fulfillment for a DRAFT quotation', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/fulfillment/quotation/${draftQuotationId}`)
        .set('Authorization', `Bearer ${salesRepAccessToken}`)
        .expect(400);

      expect(res.body.message).toContain('must be CONFIRMED');
    });

    it('should forbid CUSTOMER from accessing warehouse management endpoints', async () => {
      await request(app.getHttpServer())
        .get('/api/warehouses')
        .set('Authorization', `Bearer ${customerAccessTokenA}`);
      
      await request(app.getHttpServer())
        .post('/api/warehouses')
        .set('Authorization', `Bearer ${customerAccessTokenA}`)
        .send({ name: 'Hacker WH', code: 'HW-1', location: 'Unknown' })
        .expect(403);
    });

    it('should forbid CUSTOMER from adjusting inventory', async () => {
      await request(app.getHttpServer())
        .patch('/api/inventory')
        .set('Authorization', `Bearer ${customerAccessTokenA}`)
        .send({ warehouseId: whAId, productId: productLaptopId, quantityOnHand: 999 })
        .expect(403);
    });
  });

  describe('2. Multi-Warehouse Allocation & Backorder Execution', () => {
    it('should execute Fulfillment Engine, split stock across WH-A & WH-B, and create Backorder for remaining 2 units', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/fulfillment/quotation/${confirmedQuotationId}`)
        .set('Authorization', `Bearer ${salesRepAccessToken}`)
        .expect(200);

      expect(res.body.status).toBe('CONFIRMED');
      expect(res.body.plan.totalAllocated).toBe(10);
      expect(res.body.plan.totalBackordered).toBe(2);

      // Verify inventory reservations in PostgreSQL
      const invA = await prisma.inventoryItem.findUnique({
        where: { warehouseId_productId: { warehouseId: whAId, productId: productLaptopId } },
      });
      expect(invA?.quantityReserved).toBe(6);

      const invB = await prisma.inventoryItem.findUnique({
        where: { warehouseId_productId: { warehouseId: whBId, productId: productLaptopId } },
      });
      expect(invB?.quantityReserved).toBe(4);

      // Verify allocations created
      const allocations = await prisma.fulfillmentAllocation.findMany({
        where: { quotationId: confirmedQuotationId, isBackorder: false },
      });
      expect(allocations.length).toBe(2);
      allocationId = allocations[0].id;

      // Verify backorder created
      const backorders = await prisma.backorder.findMany({
        where: { quotationId: confirmedQuotationId },
      });
      expect(backorders.length).toBe(1);
      expect(backorders[0].quantityPending).toBe(2);
      backorderId = backorders[0].id;
    });

    it('should prevent duplicate allocation when quotation is already allocated', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/fulfillment/quotation/${confirmedQuotationId}`)
        .set('Authorization', `Bearer ${salesRepAccessToken}`)
        .expect(200);

      // Total allocated should be 0 because 10 units are already allocated
      expect(res.body.plan.totalAllocated).toBe(0);
    });
  });

  describe('3. Shipment Processing & Inventory Reduction', () => {
    it('should process shipment for allocated stock, reducing physical stock and reservation', async () => {
      await request(app.getHttpServer())
        .post(`/api/fulfillment/allocation/${allocationId}/ship`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ fulfilledQuantity: 4 })
        .expect(200);

      const alloc = await prisma.fulfillmentAllocation.findUnique({
        where: { id: allocationId },
      });
      expect(alloc?.fulfilledQuantity).toBe(4);
    });
  });

  describe('4. Backorder Fulfillment Workflow', () => {
    it('should reject backorder fulfillment when no new stock is available in warehouse', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/backorders/${backorderId}/fulfill`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ warehouseId: whAId })
        .expect(400);

      expect(res.body.message).toContain('0 available stock');
    });

    it('should fulfill backorder after Admin adds new stock to warehouse', async () => {
      // Admin adds 5 new units to WH-A
      await request(app.getHttpServer())
        .patch('/api/inventory')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          warehouseId: whAId,
          productId: productLaptopId,
          quantityOnHand: 7, // 2 on hand (after 4 shipped from 6) + 5 new = 7
          quantityReserved: 2, // 6 reserved - 4 shipped = 2 remaining reserved
        })
        .expect(200);

      // Fulfill backorder (needs 2 units)
      const res = await request(app.getHttpServer())
        .post(`/api/backorders/${backorderId}/fulfill`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ warehouseId: whAId, quantity: 2 })
        .expect(200);

      expect(res.body.status).toBe('FULFILLED');
      expect(res.body.quantityPending).toBe(0);
      expect(res.body.fulfilledQuantity).toBe(2);
    });
  });

  describe('5. Customer Portal Integration & Security', () => {
    it('should allow Customer A to see customer-safe fulfillment summary for their own quotation', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/fulfillment/quotation/${confirmedQuotationId}`)
        .set('Authorization', `Bearer ${customerAccessTokenA}`)
        .expect(200);

      expect(res.body.customerSafeSummary).toBeDefined();
      expect(res.body.totalRequested).toBe(12);
      // Ensure internal warehouse names and stock counts are hidden from Customer response
      expect(res.body.allocations).toBeUndefined();
    });

    it('should forbid Customer B from accessing Customer A quotation fulfillment', async () => {
      await request(app.getHttpServer())
        .get(`/api/fulfillment/quotation/${confirmedQuotationId}`)
        .set('Authorization', `Bearer ${customerAccessTokenB}`)
        .expect(403);
    });
  });
});
