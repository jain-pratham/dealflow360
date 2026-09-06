import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';
import { WebPushService } from './web-push.service';
import { MailService } from '../mail/mail.service';
import { NotificationPriority, NotificationType } from '@prisma/client';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prismaMock: any;
  let gatewayMock: any;
  let webPushMock: any;
  let mailMock: any;

  beforeEach(async () => {
    prismaMock = {
      notification: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
      },
      user: {
        findMany: vi.fn(),
      },
    };

    gatewayMock = {
      emitToUser: vi.fn(),
    };

    webPushMock = {
      sendPushNotificationToUser: vi.fn().mockResolvedValue(undefined),
    };

    mailMock = {
      sendMail: vi.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: NotificationsGateway, useValue: gatewayMock },
        { provide: WebPushService, useValue: webPushMock },
        { provide: MailService, useValue: mailMock },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createNotification', () => {
    it('should create and return notification if not deduplicated', async () => {
      const mockNotification = {
        id: 'notif-1',
        userId: 'user-1',
        type: NotificationType.APPROVAL_REQUESTED,
        title: 'Approval Required',
        message: 'Quotations QT-2026-0001 requires approval',
        priority: NotificationPriority.HIGH,
        entityType: 'quotation',
        entityId: 'q-1',
        deduplicationKey: 'APPROVAL_REQUESTED_app-1',
        isRead: false,
        readAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.notification.findUnique.mockResolvedValue(null);
      prismaMock.notification.create.mockResolvedValue(mockNotification);

      const result = await service.createNotification({
        userId: 'user-1',
        type: NotificationType.APPROVAL_REQUESTED,
        title: 'Approval Required',
        message: 'Quotations QT-2026-0001 requires approval',
        priority: NotificationPriority.HIGH,
        entityType: 'quotation',
        entityId: 'q-1',
        deduplicationKey: 'APPROVAL_REQUESTED_app-1',
      });

      expect(result).toEqual(mockNotification);
      expect(prismaMock.notification.create).toHaveBeenCalled();
      expect(gatewayMock.emitToUser).toHaveBeenCalledWith('user-1', 'notification.created', expect.any(Object));
      expect(webPushMock.sendPushNotificationToUser).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          title: 'Approval Required',
          message: 'Quotations QT-2026-0001 requires approval',
        }),
      );
    });

    it('should return existing notification if deduplicationKey matches', async () => {
      const existingNotification = {
        id: 'notif-existing',
        userId: 'user-1',
        deduplicationKey: 'APPROVAL_REQUESTED_app-1',
      };

      prismaMock.notification.findUnique.mockResolvedValue(existingNotification);

      const result = await service.createNotification({
        userId: 'user-1',
        type: NotificationType.APPROVAL_REQUESTED,
        title: 'Approval Required',
        message: 'Quotations QT-2026-0001 requires approval',
        priority: NotificationPriority.HIGH,
        deduplicationKey: 'APPROVAL_REQUESTED_app-1',
      });

      expect(result).toEqual(existingNotification);
      expect(prismaMock.notification.create).not.toHaveBeenCalled();
    });
  });

  describe('findUserNotifications', () => {
    it('should query notifications restricted to target user id', async () => {
      prismaMock.notification.findMany.mockResolvedValue([]);
      prismaMock.notification.count.mockResolvedValue(0);

      const res = await service.findUserNotifications('user-123', {});

      expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-123' }),
        }),
      );
      expect(res.items).toBeDefined();
    });
  });

  describe('markAsRead', () => {
    it('should update isRead and readAt for matching user notification', async () => {
      const existingNotif = { id: 'notif-1', userId: 'user-1', isRead: false };
      const mockUpdated = { id: 'notif-1', userId: 'user-1', isRead: true, readAt: new Date() };

      prismaMock.notification.findFirst.mockResolvedValue(existingNotif);
      prismaMock.notification.update.mockResolvedValue(mockUpdated);

      const result = await service.markAsRead('notif-1', 'user-1');

      expect(prismaMock.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: { isRead: true, readAt: expect.any(Date) },
      });
      expect(result).toEqual(mockUpdated);
    });
  });

  describe('markAllAsRead', () => {
    it('should update all unread notifications for specified user', async () => {
      prismaMock.notification.updateMany.mockResolvedValue({ count: 5 });

      const res = await service.markAllAsRead('user-1');

      expect(prismaMock.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
        data: { isRead: true, readAt: expect.any(Date) },
      });
      expect(res.success).toBe(true);
    });
  });
});
