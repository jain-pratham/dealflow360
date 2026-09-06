import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser as CurrentUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from '@prisma/client';
import { SubscriptionPlansService } from './subscription-plans.service';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { QuerySubscriptionPlansDto } from './dto/query-subscription-plans.dto';

@Controller('subscription-plans')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionPlansController {
  constructor(
    private readonly subscriptionPlansService: SubscriptionPlansService,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.FINANCE, UserRole.SALES_MANAGER, UserRole.SALES_REP)
  async findAll(@Query() query: QuerySubscriptionPlansDto) {
    return this.subscriptionPlansService.findAll(query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.FINANCE, UserRole.SALES_MANAGER, UserRole.SALES_REP)
  async findOne(@Param('id') id: string) {
    return this.subscriptionPlansService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  async create(
    @Body() dto: CreateSubscriptionPlanDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.subscriptionPlansService.create(dto, currentUser);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionPlanDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.subscriptionPlansService.update(id, dto, currentUser);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  async updateStatus(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
    @CurrentUser() currentUser: any,
  ) {
    return this.subscriptionPlansService.updateStatus(id, isActive, currentUser);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    return this.subscriptionPlansService.remove(id);
  }
}
