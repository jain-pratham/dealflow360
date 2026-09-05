import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser as CurrentUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from '@prisma/client';
import { SubscriptionsService } from './subscriptions.service';
import { QuerySubscriptionsDto } from './dto/query-subscriptions.dto';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.FINANCE, UserRole.SALES_MANAGER, UserRole.SALES_REP, UserRole.CUSTOMER)
  async findAll(@Query() query: QuerySubscriptionsDto, @CurrentUser() currentUser: any) {
    return this.subscriptionsService.findAll(query, currentUser);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.FINANCE, UserRole.SALES_MANAGER, UserRole.SALES_REP, UserRole.CUSTOMER)
  async findOne(@Param('id') id: string, @CurrentUser() currentUser: any) {
    return this.subscriptionsService.findOne(id, currentUser);
  }

  @Post(':id/pause')
  @Roles(UserRole.ADMIN, UserRole.FINANCE, UserRole.SALES_MANAGER)
  async pause(@Param('id') id: string, @CurrentUser() currentUser: any) {
    return this.subscriptionsService.pause(id, currentUser);
  }

  @Post(':id/resume')
  @Roles(UserRole.ADMIN, UserRole.FINANCE, UserRole.SALES_MANAGER)
  async resume(@Param('id') id: string, @CurrentUser() currentUser: any) {
    return this.subscriptionsService.resume(id, currentUser);
  }

  @Post(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.FINANCE, UserRole.SALES_MANAGER)
  async cancel(@Param('id') id: string, @CurrentUser() currentUser: any) {
    return this.subscriptionsService.cancel(id, currentUser);
  }

  @Post('process-recurring-billing')
  @Roles(UserRole.ADMIN, UserRole.FINANCE)
  async processRecurringBilling() {
    return this.subscriptionsService.generateRecurringInvoices();
  }
}
