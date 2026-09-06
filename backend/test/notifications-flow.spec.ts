import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuthService } from '../src/auth/auth.service';
import { NotificationType, NotificationPriority, UserRole } from '@prisma/client';

describe('Notifications E2E Flow & Isolation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authService: AuthService;

  let testUser1: any;
  let testUser2: any;
  let user1Token: string;
  let user2Token: string;
  let createdNotifId: string;

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

    const passwordHash = await bcrypt.hash('password123', 10);

    // Create 2 test users for isolation check
    testUser1 = await prisma.user.create({
      data: {
        email: `notif_test_user1_${Date.now()}@example.com`,
        passwordHash,
        name: 'Notif Test User 1',
        role: UserRole.SALES_REP,
      },
    });

    testUser2 = await prisma.user.create({
      data: {
        email: `notif_test_user2_${Date.now()}@example.com`,
        passwordHash,
        name: 'Notif Test User 2',
        role: UserRole.SALES_REP,
      },
    });

    user1Token = (await authService.login({ email: testUser1.email, password: 'password123' }) as any).accessToken;
    user2Token = (await authService.login({ email: testUser2.email, password: 'password123' }) as any).accessToken;

    // Seed notification for User 1
    const notif = await prisma.notification.create({
      data: {
        userId: testUser1.id,
        type: NotificationType.APPROVAL_REQUESTED,
        title: 'Approval Required Test',
        message: 'Test message for notification flow',
        priority: NotificationPriority.HIGH,
        entityType: 'quotation',
        entityId: 'q-test-1',
        deduplicationKey: `TEST_DEDUP_${Date.now()}`,
      },
    });
    createdNotifId = notif.id;
  });

  afterAll(async () => {
    if (prisma) {
      if (testUser1 && testUser2) {
        await prisma.notification.deleteMany({
          where: { userId: { in: [testUser1.id, testUser2.id] } },
        });
        await prisma.user.deleteMany({
          where: { id: { in: [testUser1.id, testUser2.id] } },
        });
      }
    }
    if (app) {
      await app.close();
    }
  });

  it('GET /api/notifications should return notifications for User 1', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/notifications')
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);

    expect(res.body.items).toBeDefined();
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    expect(res.body.items[0].userId).toBe(testUser1.id);
  });

  it('GET /api/notifications/unread-count should return unread count for User 1', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);

    expect(res.body.unreadCount).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/notifications should return EMPTY for User 2 (User Isolation)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/notifications')
      .set('Authorization', `Bearer ${user2Token}`)
      .expect(200);

    expect(res.body.items).toBeDefined();
    expect(res.body.items.length).toBe(0);
  });

  it('PATCH /api/notifications/:id/read should mark notification as read', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/notifications/${createdNotifId}/read`)
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);

    expect(res.body.isRead).toBe(true);
    expect(res.body.readAt).toBeDefined();
  });

  it('PATCH /api/notifications/read-all should mark all notifications as read', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/notifications/read-all')
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });
});
