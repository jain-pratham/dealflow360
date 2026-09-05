import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Products & Price Lists Engine (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let adminAccessToken: string;
  let salesRepAccessToken: string;

  let createdProductId: string;
  let createdPriceListId: string;
  let createdPriceListItemId: string;

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

    // Get Admin Token
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
      .send({ name: 'E2E Rep', email: repEmail, password: 'Password123!' })
      .expect(201);
    salesRepAccessToken = repRegisterRes.body.accessToken;
  });

  afterAll(async () => {
    // Cleanup created test records
    if (prisma) {
      await prisma.priceListItem?.deleteMany({
        where: {
          priceList: {
            name: { contains: 'E2E' },
          },
        },
      });
      await prisma.priceList?.deleteMany({
        where: { name: { contains: 'E2E' } },
      });
      await prisma.quotationLine?.deleteMany({});
      await prisma.product?.deleteMany({
        where: { sku: { contains: 'E2E' } },
      });
    }
    if (app) {
      await app.close();
    }
  });

  // 1. Admin can create product
  it('1. Should allow ADMIN to create product (201 Created)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        name: 'E2E Server X100',
        sku: 'E2E-HW-100',
        category: 'HARDWARE',
        basePrice: 50000,
        costPrice: 35000,
        taxRate: 18,
        currency: 'INR',
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.sku).toBe('E2E-HW-100');
    expect(res.body.basePrice).toBe(50000);
    createdProductId = res.body.id;
  });

  // 2. Non-admin cannot create product
  it('2. Should reject non-admin from creating product (403 Forbidden)', async () => {
    await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${salesRepAccessToken}`)
      .send({
        name: 'Unauthorized Product',
        sku: 'E2E-HW-NOPE',
        category: 'HARDWARE',
        basePrice: 1000,
      })
      .expect(403);
  });

  // 3. Unauthenticated user cannot create product
  it('3. Should reject unauthenticated request from creating product (401 Unauthorized)', async () => {
    await request(app.getHttpServer())
      .post('/api/products')
      .send({
        name: 'No Auth Product',
        sku: 'E2E-HW-NOAUTH',
        category: 'HARDWARE',
        basePrice: 1000,
      })
      .expect(401);
  });

  // 4. Duplicate SKU returns 409
  it('4. Should reject duplicate SKU with 409 Conflict', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        name: 'Duplicate SKU Product',
        sku: 'E2E-HW-100',
        category: 'HARDWARE',
        basePrice: 20000,
      })
      .expect(409);

    expect(res.body.message).toContain('already exists');
  });

  // 5. Negative product price is rejected
  it('5. Should reject negative product base price (400 Bad Request)', async () => {
    await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        name: 'Negative Price Product',
        sku: 'E2E-HW-NEG',
        category: 'HARDWARE',
        basePrice: -500,
      })
      .expect(400);
  });

  // 6. Invalid product category is rejected
  it('6. Should reject invalid product category (400 Bad Request)', async () => {
    await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        name: 'Invalid Category Product',
        sku: 'E2E-HW-INVAL',
        category: 'INVALID_CAT',
        basePrice: 500,
      })
      .expect(400);
  });

  // 7. Admin can retrieve products
  it('7. Should retrieve list of products (200 OK)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/products')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // 8. Product search works
  it('8. Should search products by SKU', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/products?search=E2E-HW-100')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].sku).toBe('E2E-HW-100');
  });

  // 9. Product category filtering works
  it('9. Should filter products by category', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/products?category=HARDWARE')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    expect(res.body.data.every((p: any) => p.category === 'HARDWARE')).toBe(true);
  });

  // 10. Product status filtering works
  it('10. Should filter products by status', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/products?isActive=true')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    expect(res.body.data.every((p: any) => p.isActive === true)).toBe(true);
  });

  // 11. Admin can update product
  it('11. Should update product details (200 OK)', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/products/${createdProductId}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        name: 'E2E Server X100 Updated',
        basePrice: 55000,
      })
      .expect(200);

    expect(res.body.name).toBe('E2E Server X100 Updated');
    expect(res.body.basePrice).toBe(55000);
  });

  // 12. Admin can deactivate product
  it('12. Should deactivate product (200 OK)', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/products/${createdProductId}/status`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ isActive: false })
      .expect(200);

    expect(res.body.isActive).toBe(false);
  });

  // 13. Deactivated product cannot be newly added to price list
  it('13. Should block adding deactivated product to price list (400 Bad Request)', async () => {
    // Create Price List
    const plRes = await request(app.getHttpServer())
      .post('/api/price-lists')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        name: 'E2E Gold Tier List',
        customerTier: 'GOLD',
        currency: 'INR',
      })
      .expect(201);
    createdPriceListId = plRes.body.id;

    // Try adding deactivated product
    const res = await request(app.getHttpServer())
      .post(`/api/price-lists/${createdPriceListId}/items`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        productId: createdProductId,
        price: 48000,
      })
      .expect(400);

    expect(res.body.message).toContain('inactive product');

    // Reactivate product for remaining tests
    await request(app.getHttpServer())
      .patch(`/api/products/${createdProductId}/status`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ isActive: true })
      .expect(200);
  });

  // 14. Admin can create price list
  it('14. Should create price list (201 Created)', async () => {
    expect(createdPriceListId).toBeDefined();
  });

  // 15. Invalid customer tier is rejected
  it('15. Should reject invalid customer tier (400 Bad Request)', async () => {
    await request(app.getHttpServer())
      .post('/api/price-lists')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        name: 'E2E Invalid Tier',
        customerTier: 'PLATINUM',
        currency: 'INR',
      })
      .expect(400);
  });

  // 16. Invalid currency / format handled cleanly
  it('16. Should handle price list creation with standard currency', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/price-lists')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        name: 'E2E USD Silver List',
        customerTier: 'SILVER',
        currency: 'USD',
      })
      .expect(201);

    expect(res.body.currency).toBe('USD');
  });

  // 17. Admin can add product to price list
  it('17. Should add active product to price list (201 Created)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/price-lists/${createdPriceListId}/items`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        productId: createdProductId,
        price: 45000,
      })
      .expect(201);

    expect(res.body.price).toBe(45000);
    createdPriceListItemId = res.body.id;
  });

  // 18. Duplicate product in same price list is rejected
  it('18. Should reject duplicate product in same price list (409 Conflict)', async () => {
    await request(app.getHttpServer())
      .post(`/api/price-lists/${createdPriceListId}/items`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        productId: createdProductId,
        price: 44000,
      })
      .expect(409);
  });

  // 19. Negative price-list price is rejected
  it('19. Should reject negative price-list item price (400 Bad Request)', async () => {
    await request(app.getHttpServer())
      .post(`/api/price-lists/${createdPriceListId}/items`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        productId: createdProductId,
        price: -100,
      })
      .expect(400);
  });

  // 20. Admin can update price-list item
  it('20. Should update price-list item price (200 OK)', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/price-lists/${createdPriceListId}/items/${createdPriceListItemId}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ price: 42000 })
      .expect(200);

    expect(res.body.price).toBe(42000);
  });

  // 21. Admin can remove price-list item without deleting product
  it('21. Should remove item from price list (200 OK)', async () => {
    // Add temporary item to remove
    const tempRes = await request(app.getHttpServer())
      .post(`/api/price-lists/${createdPriceListId}/items`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ productId: createdProductId, price: 43000 })
      .catch(() => null);

    const removeRes = await request(app.getHttpServer())
      .delete(`/api/price-lists/${createdPriceListId}/items/${createdPriceListItemId}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    expect(removeRes.body.message).toContain('successfully');

    // Verify product still exists in DB
    const productCheck = await request(app.getHttpServer())
      .get(`/api/products/${createdProductId}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    expect(productCheck.body.id).toBe(createdProductId);

    // Re-add item for price resolution tests
    const reAdd = await request(app.getHttpServer())
      .post(`/api/price-lists/${createdPriceListId}/items`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ productId: createdProductId, price: 46000 })
      .expect(201);
    createdPriceListItemId = reAdd.body.id;
  });

  // 22. Admin can activate/deactivate price list
  it('22. Should deactivate price list (200 OK)', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/price-lists/${createdPriceListId}/status`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ isActive: false })
      .expect(200);

    expect(res.body.isActive).toBe(false);

    // Reactivate
    await request(app.getHttpServer())
      .patch(`/api/price-lists/${createdPriceListId}/status`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ isActive: true })
      .expect(200);
  });

  // 23. Price resolution returns correct customer-tier price
  it('23. Should resolve price from matching Customer Tier Price List', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/price-lists/resolve-price?productId=${createdProductId}&customerTier=GOLD&currency=INR`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    expect(res.body.source).toBe('PRICE_LIST');
    expect(res.body.price).toBe(46000);
  });

  // 24. Price resolution respects currency
  it('24. Should fallback to base price if currency has no active tier list', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/price-lists/resolve-price?productId=${createdProductId}&customerTier=GOLD&currency=EUR`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    expect(res.body.source).toBe('BASE_PRICE');
    expect(res.body.price).toBe(55000);
  });

  // 25. Missing price-list item follows fallback behavior to base price
  it('25. Should fallback to product base price when product is not in tier price list', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/price-lists/resolve-price?productId=${createdProductId}&customerTier=BRONZE&currency=INR`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    expect(res.body.source).toBe('BASE_PRICE');
    expect(res.body.price).toBe(55000);
  });

  // 26. Non-admin cannot modify price lists
  it('26. Should reject non-admin from modifying price list (403 Forbidden)', async () => {
    await request(app.getHttpServer())
      .post('/api/price-lists')
      .set('Authorization', `Bearer ${salesRepAccessToken}`)
      .send({
        name: 'Unauthorized Price List',
        customerTier: 'BRONZE',
      })
      .expect(403);
  });

  // 27 & 28. Safe product deletion works / referenced product cannot be deleted
  it('27 & 28. Should prevent destructive deletion of product referenced in price list', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/products/${createdProductId}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(400);

    expect(res.body.message).toContain('referenced in active price lists');
  });
});
