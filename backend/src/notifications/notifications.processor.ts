import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MailService } from '../mail/mail.service';
import { WebPushService } from './web-push.service';

export interface NotificationJobData {
  type: 'EMAIL' | 'WEB_PUSH';
  recipientEmail?: string;
  recipientName?: string;
  subject?: string;
  htmlContent?: string;
  userId?: string;
  title?: string;
  message?: string;
  url?: string;
  tag?: string;
}

@Processor('notifications-queue')
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly mailService: MailService,
    private readonly webPushService: WebPushService,
  ) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<any> {
    this.logger.log(`[BULLMQ REDIS] Processing notification job #${job.id} of type ${job.data.type}`);
    const data = job.data;

    try {
      if (data.type === 'EMAIL' && data.recipientEmail && data.subject && data.htmlContent) {
        await this.mailService.sendMail(data.recipientEmail, data.subject, data.htmlContent);
        this.logger.log(`[BULLMQ REDIS] Email delivered to ${data.recipientEmail}`);
        return { success: true, deliveredTo: data.recipientEmail };
      } else if (data.type === 'WEB_PUSH' && data.userId && data.title && data.message) {
        await this.webPushService.sendPushNotificationToUser(data.userId, {
          title: data.title,
          message: data.message,
          url: data.url,
          tag: data.tag,
        });
        this.logger.log(`[BULLMQ REDIS] Web push delivered to user ${data.userId}`);
        return { success: true, deliveredToUser: data.userId };
      }
    } catch (err: any) {
      this.logger.error(`[BULLMQ REDIS] Job #${job.id} failed: ${err?.message || err}`);
      throw err;
    }
  }
}
