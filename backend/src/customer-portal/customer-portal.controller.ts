import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { CustomerPortalService } from './customer-portal.service';
import { CustomerCommentDto } from './dto/customer-comment.dto';
import { SubmitNegotiationDto } from './dto/submit-negotiation.dto';

@Controller('customer-portal')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
export class CustomerPortalController {
  constructor(private readonly customerPortalService: CustomerPortalService) {}

  @Get('dashboard')
  async getDashboard(@GetUser() currentUser: any) {
    return this.customerPortalService.getDashboardData(currentUser);
  }

  @Get('quotations')
  async getQuotations(
    @GetUser() currentUser: any,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.customerPortalService.getQuotations(currentUser, search, status);
  }

  @Get('quotations/:id')
  async getQuotationById(@Param('id') id: string, @GetUser() currentUser: any) {
    return this.customerPortalService.getQuotationById(id, currentUser);
  }

  @Post('quotations/:id/comments')
  @HttpCode(HttpStatus.CREATED)
  async addComment(
    @Param('id') id: string,
    @Body() dto: CustomerCommentDto,
    @GetUser() currentUser: any,
  ) {
    return this.customerPortalService.addComment(id, dto, currentUser);
  }

  @Post('quotations/:id/negotiation')
  @HttpCode(HttpStatus.OK)
  async submitNegotiation(
    @Param('id') id: string,
    @Body() dto: SubmitNegotiationDto,
    @GetUser() currentUser: any,
  ) {
    return this.customerPortalService.submitNegotiation(id, dto, currentUser);
  }

  @Post('quotations/:id/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmQuotation(@Param('id') id: string, @GetUser() currentUser: any) {
    return this.customerPortalService.confirmQuotation(id, currentUser);
  }

  @Get('profile')
  async getProfile(@GetUser() currentUser: any) {
    return this.customerPortalService.getCustomerProfile(currentUser);
  }

  @Get('invoices')
  async getInvoices(@GetUser() currentUser: any, @Query() query: any) {
    return this.customerPortalService.getCustomerInvoices(currentUser, query);
  }

  @Get('invoices/:id')
  async getInvoiceById(@Param('id') id: string, @GetUser() currentUser: any) {
    return this.customerPortalService.getCustomerInvoiceById(id, currentUser);
  }

  @Get('subscriptions')
  async getSubscriptions(@GetUser() currentUser: any, @Query() query: any) {
    return this.customerPortalService.getCustomerSubscriptions(currentUser, query);
  }
}
