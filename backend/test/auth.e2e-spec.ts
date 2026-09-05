import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth & RBAC (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
  });

  afterAll(async () => {
    // Cleanup any test user created during tests
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'test_sales_rep@example.com',
            'test_hacker_admin@example.com',
            'test_hacker_finance@example.com',
            'test_inactive@example.com',
            'test_manager@example.com',
            'test_finance@example.com',
            'test_customer@example.com',
          ],
        },
      },
    });
    await app.close();
  });

  const testUser = {
    name: 'Test Sales Rep',
    email: 'test_sales_rep@example.com',
    password: 'Password123!',
  };

  let salesRepAccessToken: string;
  let salesRepRefreshToken: string;
  let adminAccessToken: string;

  // 1. Register new user
  // 2. New user gets SALES_REP role
  it('1 & 2. Should register a new user and force SALES_REP role', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(testUser)
      .expect(201);

    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
    expect(res.body.user.role).toBe('SALES_REP');
    expect(res.body.user.isVerified).toBe(false);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user.passwordHash).toBeUndefined();

    salesRepAccessToken = res.body.accessToken;
    salesRepRefreshToken = res.body.refreshToken;
  });

  // 3. Register duplicate email fails
  it('3. Should fail when registering with duplicate email (409 Conflict)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(testUser)
      .expect(409);

    expect(res.body.message).toContain('already exists');
  });

  // 4. Register cannot create ADMIN
  it('4. Should ignore role field and NOT create ADMIN on public signup', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Hacker Admin',
        email: 'test_hacker_admin@example.com',
        password: 'Password123!',
        role: 'ADMIN',
      })
      .expect(201);

    expect(res.body.user.role).toBe('SALES_REP');
    expect(res.body.user.role).not.toBe('ADMIN');
  });

  // 5. Register cannot create FINANCE
  it('5. Should ignore role field and NOT create FINANCE on public signup', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Hacker Finance',
        email: 'test_hacker_finance@example.com',
        password: 'Password123!',
        role: 'FINANCE',
      })
      .expect(201);

    expect(res.body.user.role).toBe('SALES_REP');
    expect(res.body.user.role).not.toBe('FINANCE');
  });

  // 6. Login succeeds
  it('6. Should successfully log in with valid credentials', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      })
      .expect(200);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
    expect(res.body.user.role).toBe('SALES_REP');
  });

  // 7. Wrong password fails
  it('7. Should fail login with incorrect password (401 Unauthorized)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'WrongPassword123!',
      })
      .expect(401);

    expect(res.body.message).toContain('Invalid email or password');
  });

  // 8. Non-existent user login fails
  it('8. Should fail login for non-existent user (401 Unauthorized)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'nonexistent_user_999@example.com',
        password: 'Password123!',
      })
      .expect(401);

    expect(res.body.message).toContain('Invalid email or password');
  });

  // 9. Inactive user cannot login
  it('9. Should fail login for inactive user (401 Unauthorized)', async () => {
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const inactiveUser = await prisma.user.create({
      data: {
        name: 'Inactive User',
        email: 'test_inactive@example.com',
        passwordHash,
        role: 'SALES_REP',
        isActive: false,
      },
    });

    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: inactiveUser.email,
        password: 'Password123!',
      })
      .expect(401);

    expect(res.body.message).toContain('inactive');
  });

  // 10. Refresh token works
  it('10. Should refresh tokens successfully', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: salesRepRefreshToken })
      .expect(200);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();

    // Update tokens for subsequent requests
    salesRepAccessToken = res.body.accessToken;
    salesRepRefreshToken = res.body.refreshToken;
  });

  // 11. Logout invalidates refresh token/session
  it('11. Should logout user and invalidate refresh session', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${salesRepAccessToken}`)
      .expect(200);

    // Old refresh token should now fail
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: salesRepRefreshToken })
      .expect(401);
  });

  // 12. /auth/me requires authentication
  it('12. Should reject /auth/me when unauthenticated (401 Unauthorized)', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  // 13. /auth/me returns correct user
  it('13. Should return user profile from /auth/me for authenticated user', async () => {
    // Log back in to get a fresh token
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      })
      .expect(200);

    salesRepAccessToken = loginRes.body.accessToken;

    const meRes = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${salesRepAccessToken}`)
      .expect(200);

    expect(meRes.body.email).toBe(testUser.email.toLowerCase());
    expect(meRes.body.role).toBe('SALES_REP');
  });

  // Seeded admin login & RBAC endpoint checks
  it('Bootstrap ADMIN login test', async () => {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@dealflow360.com';
    const adminPassword =
      process.env.ADMIN_PASSWORD || 'ChangeThisStrongPassword123!';

    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: adminEmail,
        password: adminPassword,
      })
      .expect(200);

    expect(adminLoginRes.body.user.role).toBe('ADMIN');
    adminAccessToken = adminLoginRes.body.accessToken;
  });

  // 14. ADMIN can access admin-protected endpoint
  it('14. Should allow ADMIN on admin-protected endpoint (200 OK)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/test')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    expect(res.body.message).toBe('Admin access granted');
  });

  // 15. SALES_REP cannot access admin-protected endpoint
  it('15. Should reject SALES_REP from admin-protected endpoint (403 Forbidden)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/test')
      .set('Authorization', `Bearer ${salesRepAccessToken}`)
      .expect(403);

    expect(res.body.message).toContain('is not authorized');
  });

  // 16. SALES_MANAGER cannot access admin-only endpoint
  it('16. Should reject SALES_MANAGER from admin-only endpoint (403 Forbidden)', async () => {
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const manager = await prisma.user.upsert({
      where: { email: 'test_manager@example.com' },
      update: {},
      create: {
        name: 'Test Manager',
        email: 'test_manager@example.com',
        passwordHash,
        role: 'SALES_MANAGER',
        isActive: true,
      },
    });

    const managerLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: manager.email,
        password: 'Password123!',
      })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/admin/test')
      .set('Authorization', `Bearer ${managerLoginRes.body.accessToken}`)
      .expect(403);
  });

  // 17. FINANCE cannot access admin-only endpoint
  it('17. Should reject FINANCE from admin-only endpoint (403 Forbidden)', async () => {
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const finance = await prisma.user.upsert({
      where: { email: 'test_finance@example.com' },
      update: {},
      create: {
        name: 'Test Finance',
        email: 'test_finance@example.com',
        passwordHash,
        role: 'FINANCE',
        isActive: true,
      },
    });

    const financeLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: finance.email,
        password: 'Password123!',
      })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/admin/test')
      .set('Authorization', `Bearer ${financeLoginRes.body.accessToken}`)
      .expect(403);
  });

  // 18. CUSTOMER cannot access internal admin endpoint
  it('18. Should reject CUSTOMER from internal admin endpoint (403 Forbidden)', async () => {
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const customer = await prisma.user.upsert({
      where: { email: 'test_customer@example.com' },
      update: {},
      create: {
        name: 'Test Customer',
        email: 'test_customer@example.com',
        passwordHash,
        role: 'CUSTOMER',
        isActive: true,
      },
    });

    const customerLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: customer.email,
        password: 'Password123!',
      })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/admin/test')
      .set('Authorization', `Bearer ${customerLoginRes.body.accessToken}`)
      .expect(403);
  });

  // 19. Missing JWT returns 401
  it('19. Should return 401 Unauthorized for missing JWT header', async () => {
    await request(app.getHttpServer()).get('/api/admin/test').expect(401);
  });

  // 20. Insufficient role returns 403
  it('20. Should return 403 Forbidden when authenticated user lacks required role', async () => {
    await request(app.getHttpServer())
      .get('/api/admin/test')
      .set('Authorization', `Bearer ${salesRepAccessToken}`)
      .expect(403);
  });
});
