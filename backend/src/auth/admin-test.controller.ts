import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { GetUser } from './decorators/get-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminTestController {
  @Get('admin/test')
  @Roles(UserRole.ADMIN)
  getAdminData(@GetUser() user: any) {
    return {
      message: 'Admin access granted',
      user,
    };
  }

  @Get('sales/test')
  @Roles(UserRole.SALES_REP)
  getSalesData(@GetUser() user: any) {
    return {
      message: 'Sales Rep access granted',
      user,
    };
  }

  @Get('manager/test')
  @Roles(UserRole.SALES_MANAGER)
  getManagerData(@GetUser() user: any) {
    return {
      message: 'Sales Manager access granted',
      user,
    };
  }

  @Get('finance/test')
  @Roles(UserRole.FINANCE)
  getFinanceData(@GetUser() user: any) {
    return {
      message: 'Finance access granted',
      user,
    };
  }

  @Get('portal/test')
  @Roles(UserRole.CUSTOMER)
  getPortalData(@GetUser() user: any) {
    return {
      message: 'Customer portal access granted',
      user,
    };
  }
}
