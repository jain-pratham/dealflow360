import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApprovalsService } from './approvals.service';

@Controller('approvals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get()
  async getQueue(@Req() req: any) {
    return this.approvalsService.getApprovalQueue(req.user);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.approvalsService.findOne(id);
  }

  @Post(':id/approve')
  @Roles(UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.FINANCE)
  @HttpCode(HttpStatus.OK)
  async approve(
    @Param('id') id: string,
    @Body('comments') comments: string,
    @Req() req: any,
  ) {
    return this.approvalsService.approve(id, comments, req.user);
  }

  @Post(':id/reject')
  @Roles(UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.FINANCE)
  @HttpCode(HttpStatus.OK)
  async reject(
    @Param('id') id: string,
    @Body('comments') comments: string,
    @Req() req: any,
  ) {
    return this.approvalsService.reject(id, comments, req.user);
  }
}
