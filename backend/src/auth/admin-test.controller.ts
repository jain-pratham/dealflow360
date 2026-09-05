import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { GetUser } from './decorators/get-user.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminTestController {
  @Get('test')
  @Roles(UserRole.ADMIN)
  getAdminData(@GetUser() user: any) {
    return {
      message: 'Admin access granted',
      user,
    };
  }
}
