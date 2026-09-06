import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { WebPushService } from './web-push.service';

import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ConfigModule, PrismaModule, MailModule, AuthModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway, WebPushService],
  exports: [NotificationsService, NotificationsGateway, WebPushService],
})
export class NotificationsModule {}
