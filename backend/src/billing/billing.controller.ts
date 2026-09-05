import {
  Body,
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
import { BillingService } from './billing.service';
import { QueryInvoicesDto } from './dto/query-invoices.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';

@Controller('billing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('invoices')
  @Roles(UserRole.ADMIN, UserRole.FINANCE, UserRole.SALES_MANAGER, UserRole.SALES_REP, UserRole.CUSTOMER)
  async findAll(@Query() query: QueryInvoicesDto, @CurrentUser() currentUser: any) {
    return this.billingService.findAllInvoices(query, currentUser);
  }

  @Get('metrics')
  @Roles(UserRole.ADMIN, UserRole.FINANCE, UserRole.SALES_MANAGER)
  async getMetrics() {
    return this.billingService.getFinanceMetrics();
  }

  @Get('invoices/:id')
  @Roles(UserRole.ADMIN, UserRole.FINANCE, UserRole.SALES_MANAGER, UserRole.SALES_REP, UserRole.CUSTOMER)
  async findOne(@Param('id') id: string, @CurrentUser() currentUser: any) {
    return this.billingService.findInvoiceById(id, currentUser);
  }

  @Post('quotations/:quotationId/generate')
  @Roles(UserRole.ADMIN, UserRole.FINANCE, UserRole.SALES_MANAGER)
  async generateBillingForQuotation(@Param('quotationId') quotationId: string) {
    return this.billingService.processConfirmedQuotation(quotationId);
  }

  @Post('invoices/:id/payments')
  @Roles(UserRole.ADMIN, UserRole.FINANCE)
  async recordPayment(
    @Param('id') id: string,
    @Body() dto: RecordPaymentDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.billingService.recordPayment(id, dto, currentUser);
  }
}
