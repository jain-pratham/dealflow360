import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { UsersModule } from './users/users.module';
import { CustomersModule } from './customers/customers.module';
import { ProductsModule } from './products/products.module';
import { PriceListsModule } from './price-lists/price-lists.module';
import { DiscountRulesModule } from './discount-rules/discount-rules.module';
import { QuotationsModule } from './quotations/quotations.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { CustomerPortalModule } from './customer-portal/customer-portal.module';
import { FulfillmentModule } from './fulfillment/fulfillment.module';
import { BillingModule } from './billing/billing.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { PaymentsModule } from './payments/payments.module';
import { DealHealthModule } from './deal-health/deal-health.module';
import { ReportsModule } from './reports/reports.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          maxRetriesPerRequest: null,
        },
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
    AuthModule,
    MailModule,
    UsersModule,
    CustomersModule,
    ProductsModule,
    PriceListsModule,
    DiscountRulesModule,
    QuotationsModule,
    ApprovalsModule,
    RecommendationsModule,
    CustomerPortalModule,
    FulfillmentModule,
    BillingModule,
    SubscriptionsModule,
    PaymentsModule,
    DealHealthModule,
    ReportsModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
