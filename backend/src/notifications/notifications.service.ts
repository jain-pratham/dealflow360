import { Injectable, Logger, NotFoundException, Optional, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { NotificationsGateway } from './notifications.gateway';
import { WebPushService } from './web-push.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { NotificationPriority, NotificationType, UserRole } from '@prisma/client';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly gateway: NotificationsGateway,
    private readonly webPushService: WebPushService,
    @Optional() @InjectQueue('notifications-queue') private readonly notificationsQueue?: Queue,
  ) {}

  async createNotification(dto: CreateNotificationDto) {
    const priority = dto.priority || NotificationPriority.NORMAL;

    // Deduplication check scoped per recipient userId to ensure multi-recipient saves work reliably
    const effectiveDedupKey = dto.deduplicationKey
      ? (dto.deduplicationKey.endsWith(`_${dto.userId}`) ? dto.deduplicationKey : `${dto.deduplicationKey}_${dto.userId}`)
      : undefined;

    if (effectiveDedupKey) {
      const existing = await this.prisma.notification.findUnique({
        where: { deduplicationKey: effectiveDedupKey },
      });
      if (existing) {
        this.logger.log(`[DEDUPLICATION] Notification with key '${effectiveDedupKey}' already exists for user '${dto.userId}'. Skipping duplicate.`);
        return existing;
      }
    }

    // Persist Notification to PostgreSQL Database
    let notification;
    try {
      notification = await this.prisma.notification.create({
        data: {
          userId: dto.userId,
          type: dto.type,
          title: dto.title,
          message: dto.message,
          entityType: dto.entityType,
          entityId: dto.entityId,
          metadata: dto.metadata || {},
          priority,
          deduplicationKey: effectiveDedupKey,
        },
      });
    } catch (err: any) {
      if (err.code === 'P2002' && effectiveDedupKey) {
        this.logger.log(`[DEDUPLICATION] Unique constraint match for key '${effectiveDedupKey}'. Returning existing.`);
        return this.prisma.notification.findUnique({ where: { deduplicationKey: effectiveDedupKey } });
      }
      throw err;
    }

    // 1. Emit targeted Socket.IO event to recipient's room
    try {
      this.gateway.emitToUser(dto.userId, 'notification.created', {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        entityType: notification.entityType,
        entityId: notification.entityId,
        metadata: notification.metadata,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
      });
    } catch (socketErr: any) {
      this.logger.error(`Socket.IO delivery error: ${socketErr?.message || socketErr}`);
    }

    // 2. Deliver Web Push Notification if high priority / push requested
    const shouldSendPush =
      dto.sendPush !== false &&
      (dto.sendPush ||
        priority === NotificationPriority.HIGH ||
        priority === NotificationPriority.CRITICAL ||
        [
          NotificationType.APPROVAL_REQUESTED,
          NotificationType.CUSTOMER_NEGOTIATION_SUBMITTED,
          NotificationType.PAYMENT_FAILED,
          NotificationType.DEAL_HEALTH_CRITICAL,
          NotificationType.RECURRING_PAYMENT_FAILED,
        ].includes(dto.type as any));

    if (shouldSendPush) {
      if (this.notificationsQueue) {
        this.notificationsQueue
          .add('send-web-push', {
            type: 'WEB_PUSH',
            userId: dto.userId,
            title: dto.title,
            message: dto.message,
            url: dto.metadata?.url || `/notifications`,
            tag: `notif-${dto.type}`,
          })
          .catch((err) => this.logger.error(`Failed to enqueue BullMQ push notification: ${err?.message || err}`));
      } else {
        this.webPushService
          .sendPushNotificationToUser(dto.userId, {
            title: dto.title,
            message: dto.message,
            url: dto.metadata?.url || `/notifications`,
            tag: `notif-${dto.type}`,
          })
          .catch((pushErr) => this.logger.error(`Web Push delivery background error: ${pushErr?.message || pushErr}`));
      }
    }

    return notification;
  }

  async createNotificationForMultipleUsers(userIds: string[], dto: Omit<CreateNotificationDto, 'userId'>) {
    const results: any[] = [];
    for (const userId of userIds) {
      const dedupKey = dto.deduplicationKey ? `${dto.deduplicationKey}_${userId}` : undefined;
      const notif = await this.createNotification({
        ...dto,
        userId,
        deduplicationKey: dedupKey,
      });
      results.push(notif);
    }
    return results;
  }

  async notifyRoles(roles: any[], dto: Omit<CreateNotificationDto, 'userId'>) {
    const users = await this.prisma.user.findMany({
      where: { role: { in: roles }, isActive: true },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);
    if (userIds.length === 0) return [];
    return this.createNotificationForMultipleUsers(userIds, dto);
  }

  async notifyAdmins(dto: Omit<CreateNotificationDto, 'userId'>) {
    return this.notifyRoles([UserRole.ADMIN], dto);
  }

  async findUserNotifications(userId: string, query: QueryNotificationsDto) {
    const where: any = { userId };

    if (query.unreadOnly === 'true') {
      where.isRead = false;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { message: { contains: q, mode: 'insensitive' } },
      ];
    }

    const limit = query.limit ? parseInt(query.limit, 10) : 50;
    const offset = query.offset ? parseInt(query.offset, 10) : 0;

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return { items, total, limit, offset };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { unreadCount: count };
  }

  async markAsRead(id: string, userId: string) {
    const notif = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notif) {
      throw new NotFoundException(`Notification with ID '${id}' not found`);
    }

    return this.prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
    return { success: true, message: 'All notifications marked as read' };
  }

  async deleteNotification(id: string, userId: string) {
    const notif = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notif) {
      throw new NotFoundException(`Notification with ID '${id}' not found`);
    }

    await this.prisma.notification.delete({ where: { id } });
    return { success: true, id };
  }
}
