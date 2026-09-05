import { Module } from '@nestjs/common';
import { FulfillmentService } from './fulfillment.service';
import { FulfillmentEngineService } from './fulfillment-engine.service';
import { FulfillmentController } from './fulfillment.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [FulfillmentController],
  providers: [FulfillmentService, FulfillmentEngineService],
  exports: [FulfillmentService, FulfillmentEngineService],
})
export class FulfillmentModule {}
