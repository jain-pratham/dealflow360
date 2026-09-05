import {
  Body,
  Controller,
  Headers,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser as CurrentUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from '@prisma/client';
import { RazorpayService } from './razorpay.service';
import {
  CreateRazorpayOrderDto,
  VerifyRazorpayPaymentDto,
} from './dto/verify-razorpay-payment.dto';

@Controller('payments/razorpay')
export class RazorpayController {
  constructor(private readonly razorpayService: RazorpayService) {}

  @Post('order')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.FINANCE)
  async createOrder(
    @Body() dto: CreateRazorpayOrderDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.razorpayService.createOrder(dto.invoiceId, currentUser);
  }

  @Post('verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.FINANCE)
  async verifyPayment(
    @Body() dto: VerifyRazorpayPaymentDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.razorpayService.verifyPaymentSignature(dto, currentUser);
  }

  @Post('webhook')
  async handleWebhook(
    @Req() req: any,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    const rawBody = req.rawBody || JSON.stringify(req.body);
    return this.razorpayService.handleWebhook(rawBody, signature);
  }
}
