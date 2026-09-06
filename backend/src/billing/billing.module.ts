import { Module, forwardRef } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { DealHealthModule } from '../deal-health/deal-health.module';

import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, AuthModule, forwardRef(() => DealHealthModule), NotificationsModule],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}

