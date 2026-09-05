import { Module } from '@nestjs/common';
import { CustomerPortalService } from './customer-portal.service';
import { CustomerPortalController } from './customer-portal.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { DiscountRulesModule } from '../discount-rules/discount-rules.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, DiscountRulesModule, AuthModule],
  controllers: [CustomerPortalController],
  providers: [CustomerPortalService],
  exports: [CustomerPortalService],
})
export class CustomerPortalModule {}
