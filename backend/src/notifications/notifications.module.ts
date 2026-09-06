import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { WebPushService } from './web-push.service';

import { BullModule } from '@nestjs/bullmq';
import { NotificationsProcessor } from './notifications.processor';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    MailModule,
    AuthModule,
    BullModule.registerQueue({
      name: 'notifications-queue',
    }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway, WebPushService, NotificationsProcessor],
  exports: [NotificationsService, NotificationsGateway, WebPushService, BullModule],
})
export class NotificationsModule {}
