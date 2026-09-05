import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Upsell & Cross-Sell Recommendation Engine (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let adminAccessToken: string;
  let salesRepAccessToken: string;
  let otherRepAccessToken: string;
  let salesRepId: string;

  let customerId: string;
  let productBasicId: string;
  let productProId: string;
  let productMouseId: string;
  let inactiveProductId: string;

  let upsellPairingId: string;
  let crossSellPairingId: string;
  let testQuotationId: string;

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

    // Register & Login Primary Sales Rep
    const repEmail = `upsell_rep_${Date.now()}@example.com`;
    const repRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Upsell Sales Rep', email: repEmail, password: 'Password123!' })
      .expect(201);
    salesRepAccessToken = repRes.body.accessToken;
    salesRepId = repRes.body.user.id;

    // Register & Login Other Sales Rep
    const otherRepEmail = `other_rep_${Date.now()}@example.com`;
    const otherRepRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Other Sales Rep', email: otherRepEmail, password: 'Password123!' })
      .expect(201);
    otherRepAccessToken = otherRepRes.body.accessToken;

    // Create Test Customer (GOLD Tier)
    const customer = await prisma.customer.create({
      data: {
        name: 'Recommendation Test Customer',
        companyName: 'Rec Test Corp',
        contactEmail: `rec_test_${Date.now()}@example.com`,
        tier: 'GOLD',
        currency: 'INR',
      },
    });
    customerId = customer.id;

    // Create Test Products
    const basicProd = await prisma.product.create({
      data: {
        name: 'Laptop Basic',
        sku: `LAP-BSC-${Date.now()}`,
        basePrice: 50000.0,
        currency: 'INR',
        isActive: true,
        productType: 'HARDWARE',
      },
    });
    productBasicId = basicProd.id;

    const proProd = await prisma.product.create({
      data: {
        name: 'Laptop Pro',
        sku: `LAP-PRO-${Date.now()}`,
        basePrice: 70000.0,
        currency: 'INR',
        isActive: true,
        productType: 'HARDWARE',
      },
    });
    productProId = proProd.id;

    const mouseProd = await prisma.product.create({
      data: {
        name: 'Wireless Mouse',
        sku: `MSE-WLS-${Date.now()}`,
        basePrice: 2000.0,
        currency: 'INR',
        isActive: true,
        productType: 'HARDWARE',
      },
    });
    productMouseId = mouseProd.id;

    const inactProd = await prisma.product.create({
      data: {
        name: 'Discontinued Laptop',
        sku: `LAP-DIS-${Date.now()}`,
        basePrice: 60000.0,
        currency: 'INR',
        isActive: false,
        productType: 'HARDWARE',
      },
    });
    inactiveProductId = inactProd.id;
  }, 30000);

  afterAll(async () => {
    // Cleanup created test records safely
    if (testQuotationId) {
      await prisma.quotation.deleteMany({ where: { id: testQuotationId } });
    }
    if (upsellPairingId || crossSellPairingId) {
      await prisma.productPairing.deleteMany({
        where: { id: { in: [upsellPairingId, crossSellPairingId].filter(Boolean) } },
      });
    }
    if (productBasicId) {
      await prisma.product.deleteMany({
        where: { id: { in: [productBasicId, productProId, productMouseId, inactiveProductId].filter(Boolean) } },
      });
    }
    if (customerId) {
      await prisma.customer.deleteMany({ where: { id: customerId } });
    }
    if (app) {
      await app.close();
    }
  });

  describe('1. Admin Recommendation Configuration & RBAC', () => {
    it('should allow ADMIN to create an UPSELL pairing rule', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/recommendations')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          primaryProductId: productBasicId,
          suggestedProductId: productProId,
          type: 'UPSELL',
          priority: 1,
          coPurchaseScore: 1.5,
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.type).toBe('UPSELL');
      upsellPairingId = res.body.id;
    });

    it('should allow ADMIN to create a CROSS_SELL pairing rule', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/recommendations')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          primaryProductId: productBasicId,
          suggestedProductId: productMouseId,
          type: 'CROSS_SELL',
          priority: 2,
          coPurchaseScore: 1.0,
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.type).toBe('CROSS_SELL');
      crossSellPairingId = res.body.id;
    });

    it('should reject non-admin from creating recommendation rules', async () => {
      await request(app.getHttpServer())
        .post('/api/recommendations')
        .set('Authorization', `Bearer ${salesRepAccessToken}`)
        .send({
          primaryProductId: productBasicId,
          suggestedProductId: productProId,
          type: 'UPSELL',
        })
        .expect(403);
    });

    it('should reject duplicate recommendation pairing for same products', async () => {
      await request(app.getHttpServer())
        .post('/api/recommendations')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          primaryProductId: productBasicId,
          suggestedProductId: productProId,
          type: 'UPSELL',
        })
        .expect(409);
    });

    it('should reject when source product and recommended product are the same', async () => {
      await request(app.getHttpServer())
        .post('/api/recommendations')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          primaryProductId: productBasicId,
          suggestedProductId: productBasicId,
          type: 'UPSELL',
        })
        .expect(400);
    });
  });

  describe('2. Recommendation Engine & Quotation Flow', () => {
    it('should create a draft quotation with source product', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/quotations')
        .set('Authorization', `Bearer ${salesRepAccessToken}`)
        .send({
          customerId,
          currency: 'INR',
          lines: [{ productId: productBasicId, quantity: 1 }],
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(Number(res.body.subtotalAmount)).toBe(50000);
      testQuotationId = res.body.id;
    });

    it('should return UPSELL and CROSS_SELL recommendations for quotation', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/recommendations/quotation/${testQuotationId}`)
        .set('Authorization', `Bearer ${salesRepAccessToken}`)
        .expect(200);

      expect(res.body.upsell).toBeDefined();
      expect(res.body.crossSell).toBeDefined();
      expect(res.body.upsell.length).toBeGreaterThanOrEqual(1);
      expect(res.body.crossSell.length).toBeGreaterThanOrEqual(1);

      // Verify Upsell rule: Laptop Pro (70,000) > Laptop Basic (50,000)
      const upsellItem = res.body.upsell[0];
      expect(upsellItem.recommendedProduct.id).toBe(productProId);
      expect(upsellItem.resolvedPrice).toBeGreaterThan(upsellItem.sourceProduct.price);

      // Verify Cross-sell rule: Wireless Mouse (2,000)
      const crossSellItem = res.body.crossSell[0];
      expect(crossSellItem.recommendedProduct.id).toBe(productMouseId);
    });

    it('should allow Sales Rep to add recommended product to quotation', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/recommendations/quotation/${testQuotationId}/add/${productMouseId}`)
        .set('Authorization', `Bearer ${salesRepAccessToken}`)
        .expect(200);

      expect(res.body.lines.length).toBe(2);
      expect(Number(res.body.subtotalAmount)).toBe(52000); // 50000 + 2000
    });

    it('should prevent unauthorized Sales Rep from adding product to another rep quote', async () => {
      await request(app.getHttpServer())
        .post(`/api/recommendations/quotation/${testQuotationId}/add/${productProId}`)
        .set('Authorization', `Bearer ${otherRepAccessToken}`)
        .expect(403);
    });
  });

  describe('3. Database Safety & Cleanup', () => {
    it('should safely delete recommendation pairing without deleting products', async () => {
      await request(app.getHttpServer())
        .delete(`/api/recommendations/${crossSellPairingId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      // Verify products still exist
      const mouseProduct = await prisma.product.findUnique({ where: { id: productMouseId } });
      expect(mouseProduct).not.toBeNull();
      expect(mouseProduct?.name).toBe('Wireless Mouse');
    });
  });
});
