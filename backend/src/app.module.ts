import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
