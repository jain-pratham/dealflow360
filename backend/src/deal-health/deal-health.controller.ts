import { Controller, Get, Post, Patch, Param, UseGuards, Request, NotFoundException } from '@nestjs/common';
import { DealHealthService } from './deal-health.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Controller('deal-health')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DealHealthController {
  constructor(
    private readonly dealHealthService: DealHealthService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('dashboard')
  @Roles(UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.FINANCE, UserRole.SALES_REP)
  async getDashboard(@Request() req: any) {
    return this.dealHealthService.getDashboardMetrics(req.user.role, req.user.id);
  }

  @Get('alerts')
  @Roles(UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.FINANCE, UserRole.SALES_REP)
  async getAlerts(@Request() req: any) {
    const where: any = { isResolved: false };
    if (req.user.role === UserRole.SALES_REP) {
      where.quotation = { salesRepId: req.user.id };
    }
    
    return this.prisma.dealHealthAlert.findMany({
      where,
      include: {
        quotation: {
          select: { quoteNumber: true, customer: { select: { companyName: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  @Get('quotation/:id')
  @Roles(UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.FINANCE, UserRole.SALES_REP)
  async getQuotationHealth(@Param('id') id: string, @Request() req: any) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id },
      include: {
        dealHealthAlerts: {
          where: { isResolved: false },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!quotation) throw new NotFoundException('Quotation not found');

    if (req.user.role === UserRole.SALES_REP && quotation.salesRepId !== req.user.id) {
       throw new NotFoundException('Quotation not found'); // Hide unauthorized
    }

    let status = 'HEALTHY';
    const score = Number(quotation.blendedRiskScore);
    if (score < 50) status = 'CRITICAL';
    else if (score < 80) status = 'AT_RISK';

    return {
      quotationId: id,
      score,
      status,
      alerts: quotation.dealHealthAlerts,
    };
  }

  @Post('quotation/:id/recalculate')
  @Roles(UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.FINANCE)
  async recalculateQuotation(@Param('id') id: string) {
    return this.dealHealthService.recalculateQuotationHealth(id);
  }

  @Patch('alerts/:alertId/resolve')
  @Roles(UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.FINANCE)
  async resolveAlert(@Param('alertId') alertId: string) {
    const alert = await this.prisma.dealHealthAlert.findUnique({ where: { id: alertId } });
    if (!alert) throw new NotFoundException('Alert not found');

    await this.prisma.dealHealthAlert.update({
      where: { id: alertId },
      data: { isResolved: true, resolvedAt: new Date() }
    });
    
    return { success: true };
  }
}
