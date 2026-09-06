import { Module } from '@nestjs/common';
import { QuotationsService } from './quotations.service';
import { QuotationsController } from './quotations.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { PriceListsModule } from '../price-lists/price-lists.module';
import { DiscountRulesModule } from '../discount-rules/discount-rules.module';
import { MailModule } from '../mail/mail.module';
import { DealHealthModule } from '../deal-health/deal-health.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    PriceListsModule,
    DiscountRulesModule,
    MailModule,
    DealHealthModule,
    NotificationsModule,
  ],
  controllers: [QuotationsController],
  providers: [QuotationsService],
  exports: [QuotationsService],
})
export class QuotationsModule {}
