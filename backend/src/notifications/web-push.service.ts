import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WebPushService implements OnModuleInit {
  private readonly logger = new Logger(WebPushService.name);
  private vapidPublicKey: string;
  private vapidPrivateKey: string;
  private vapidSubject: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.initVapidKeys();
  }

  private initVapidKeys() {
    let pubKey =
      this.configService.get<string>('VAPID_PUBLIC_KEY') || process.env.VAPID_PUBLIC_KEY;
    let privKey =
      this.configService.get<string>('VAPID_PRIVATE_KEY') || process.env.VAPID_PRIVATE_KEY;
    const subject =
      this.configService.get<string>('VAPID_SUBJECT') ||
      process.env.VAPID_SUBJECT ||
      'mailto:admin@dealflow360.com';

    if (!pubKey || !privKey) {
      this.logger.warn('VAPID keys not found in environment. Generating fallback key pair for dev/testing...');
      const keys = webpush.generateVAPIDKeys();
      pubKey = keys.publicKey;
      privKey = keys.privateKey;
    }

    this.vapidPublicKey = pubKey;
    this.vapidPrivateKey = privKey;
    this.vapidSubject = subject;

    try {
      webpush.setVapidDetails(this.vapidSubject, this.vapidPublicKey, this.vapidPrivateKey);
      this.logger.log('Web Push initialized with VAPID details');
    } catch (err: any) {
      this.logger.error(`Failed to set VAPID details: ${err?.message || err}`);
    }
  }

  getVapidPublicKey(): string {
    return this.vapidPublicKey;
  }

  async saveSubscription(userId: string, endpoint: string, p256dh: string, auth: string) {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        userId,
        endpoint,
        p256dh,
        auth,
      },
      update: {
        userId,
        p256dh,
        auth,
      },
    });
  }

  async removeSubscription(userId: string, subscriptionId: string) {
    const sub = await this.prisma.pushSubscription.findFirst({
      where: { id: subscriptionId, userId },
    });
    if (sub) {
      await this.prisma.pushSubscription.delete({ where: { id: subscriptionId } });
    }
  }

  async sendPushNotificationToUser(userId: string, payload: { title: string; message: string; url?: string; tag?: string }) {
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (!subscriptions || subscriptions.length === 0) {
      return;
    }

    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.message,
      icon: '/logo.png',
      badge: '/logo.png',
      data: {
        url: payload.url || '/notifications',
      },
      tag: payload.tag || 'dealflow360-notif',
    });

    const sendPromises = subscriptions.map(async (sub) => {
      const pushSub = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSub, pushPayload);
        this.logger.log(`Web Push delivered to user ${userId} endpoint ${sub.endpoint.substring(0, 30)}...`);
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          this.logger.warn(`Expired push subscription removed for user ${userId}: ${sub.endpoint}`);
          await this.prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          this.logger.error(`Failed to send web push to user ${userId}: ${err?.message || err}`);
        }
      }
    });

    await Promise.allSettled(sendPromises);
  }
}
