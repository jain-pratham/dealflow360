import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionPlansService } from './subscription-plans.service';
import { SubscriptionPlansController } from './subscription-plans.controller';
import { RecurringBillingWorker } from './recurring-billing.worker';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SubscriptionsController, SubscriptionPlansController],
  providers: [SubscriptionsService, SubscriptionPlansService, RecurringBillingWorker],
  exports: [SubscriptionsService, SubscriptionPlansService],
})
export class SubscriptionsModule {}
