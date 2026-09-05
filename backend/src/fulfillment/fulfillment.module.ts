import { Module, forwardRef } from '@nestjs/common';
import { FulfillmentService } from './fulfillment.service';
import { FulfillmentEngineService } from './fulfillment-engine.service';
import { FulfillmentController } from './fulfillment.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { DealHealthModule } from '../deal-health/deal-health.module';

@Module({
  imports: [PrismaModule, AuthModule, forwardRef(() => DealHealthModule)],
  controllers: [FulfillmentController],
  providers: [FulfillmentService, FulfillmentEngineService],
  exports: [FulfillmentService, FulfillmentEngineService],
})
export class FulfillmentModule {}
