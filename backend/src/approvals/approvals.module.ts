import { Module, forwardRef } from '@nestjs/common';
import { ApprovalsService } from './approvals.service';
import { ApprovalsController } from './approvals.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { DealHealthModule } from '../deal-health/deal-health.module';

@Module({
  imports: [PrismaModule, AuthModule, forwardRef(() => DealHealthModule)],
  controllers: [ApprovalsController],
  providers: [ApprovalsService],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}
