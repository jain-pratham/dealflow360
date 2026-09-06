import { Module } from '@nestjs/common';
import { CustomerPortalService } from './customer-portal.service';
import { CustomerPortalController } from './customer-portal.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { DiscountRulesModule } from '../discount-rules/discount-rules.module';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, DiscountRulesModule, AuthModule, BillingModule, SubscriptionsModule, NotificationsModule],
  controllers: [CustomerPortalController],
  providers: [CustomerPortalService],
  exports: [CustomerPortalService],
})
export class CustomerPortalModule {}
