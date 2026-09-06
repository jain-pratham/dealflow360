import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RazorpayService } from './razorpay.service';
import { RazorpayController } from './razorpay.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, ConfigModule, AuthModule, BillingModule, NotificationsModule],
  controllers: [RazorpayController],
  providers: [RazorpayService],
  exports: [RazorpayService],
})
export class PaymentsModule {}
