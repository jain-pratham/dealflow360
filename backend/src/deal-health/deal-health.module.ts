import { Module, forwardRef } from '@nestjs/common';
import { DealHealthService } from './deal-health.service';
import { DealHealthController } from './deal-health.controller';
import { DealHealthGateway } from './deal-health.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { DiscountRulesModule } from '../discount-rules/discount-rules.module';

@Module({
  imports: [PrismaModule, AuthModule, forwardRef(() => DiscountRulesModule)],
  controllers: [DealHealthController],
  providers: [DealHealthService, DealHealthGateway],
  exports: [DealHealthService],
})
export class DealHealthModule {}

