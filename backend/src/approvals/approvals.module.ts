import { Module, forwardRef } from '@nestjs/common';
import { ApprovalsService } from './approvals.service';
import { ApprovalsController } from './approvals.controller';
import { ApprovalChainsService } from './approval-chains.service';
import { ApprovalChainsController } from './approval-chains.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { DealHealthModule } from '../deal-health/deal-health.module';

@Module({
  imports: [PrismaModule, AuthModule, forwardRef(() => DealHealthModule)],
  controllers: [ApprovalsController, ApprovalChainsController],
  providers: [ApprovalsService, ApprovalChainsService],
  exports: [ApprovalsService, ApprovalChainsService],
})
export class ApprovalsModule {}
