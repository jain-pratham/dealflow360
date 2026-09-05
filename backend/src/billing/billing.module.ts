import { Module, forwardRef } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { DealHealthModule } from '../deal-health/deal-health.module';

@Module({
  imports: [PrismaModule, AuthModule, forwardRef(() => DealHealthModule)],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}

