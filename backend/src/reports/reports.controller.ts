import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { ReportsService } from './reports.service';
import { ReportFilterDto } from './dto/report-filter.dto';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('overview')
  @Roles(UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.SALES_REP, UserRole.FINANCE)
  getOverview(@GetUser() user: any, @Query() filter: ReportFilterDto) {
    return this.reportsService.getOverview(user, filter);
  }

  @Get('sales')
  @Roles(UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.SALES_REP, UserRole.FINANCE)
  getSalesReport(@GetUser() user: any, @Query() filter: ReportFilterDto) {
    return this.reportsService.getSalesReport(user, filter);
  }

  @Get('quotations')
  @Roles(UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.SALES_REP, UserRole.FINANCE)
  getQuotationsReport(@GetUser() user: any, @Query() filter: ReportFilterDto) {
    return this.reportsService.getQuotationsReport(user, filter);
  }

  @Get('discounts')
  @Roles(UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.SALES_REP, UserRole.FINANCE)
  getDiscountsReport(@GetUser() user: any, @Query() filter: ReportFilterDto) {
    return this.reportsService.getDiscountsReport(user, filter);
  }

  @Get('approvals')
  @Roles(UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.SALES_REP, UserRole.FINANCE)
  getApprovalsReport(@GetUser() user: any, @Query() filter: ReportFilterDto) {
    return this.reportsService.getApprovalsReport(user, filter);
  }

  @Get('fulfillment')
  @Roles(UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.FINANCE)
  getFulfillmentReport(@GetUser() user: any, @Query() filter: ReportFilterDto) {
    return this.reportsService.getFulfillmentReport(user, filter);
  }

  @Get('warehouses')
  @Roles(UserRole.ADMIN, UserRole.FINANCE)
  getWarehouseReport(@GetUser() user: any, @Query() filter: ReportFilterDto) {
    return this.reportsService.getWarehouseReport(user, filter);
  }

  @Get('billing')
  @Roles(UserRole.ADMIN, UserRole.FINANCE)
  getBillingReport(@GetUser() user: any, @Query() filter: ReportFilterDto) {
    return this.reportsService.getBillingReport(user, filter);
  }

  @Get('payments')
  @Roles(UserRole.ADMIN, UserRole.FINANCE)
  getPaymentReport(@GetUser() user: any, @Query() filter: ReportFilterDto) {
    return this.reportsService.getPaymentReport(user, filter);
  }

  @Get('subscriptions')
  @Roles(UserRole.ADMIN, UserRole.FINANCE)
  getSubscriptionReport(@GetUser() user: any, @Query() filter: ReportFilterDto) {
    return this.reportsService.getSubscriptionReport(user, filter);
  }

  @Get('deal-health')
  @Roles(UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.SALES_REP, UserRole.FINANCE)
  getDealHealthReport(@GetUser() user: any, @Query() filter: ReportFilterDto) {
    return this.reportsService.getDealHealthReport(user, filter);
  }

  @Get('customers')
  @Roles(UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.FINANCE)
  getCustomerReport(@GetUser() user: any, @Query() filter: ReportFilterDto) {
    return this.reportsService.getCustomerReport(user, filter);
  }

  @Get('products')
  @Roles(UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.FINANCE)
  getProductReport(@GetUser() user: any, @Query() filter: ReportFilterDto) {
    return this.reportsService.getProductReport(user, filter);
  }
}
