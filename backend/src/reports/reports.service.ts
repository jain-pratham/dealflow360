import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReportFilterDto } from './dto/report-filter.dto';
import {
  UserRole,
  QuotationStatus,
  ApprovalStatus,
  InvoiceStatus,
  CustomerTier,
  DealHealthSeverity,
  FulfillmentStatus,
} from '@prisma/client';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to build Quotation filter where clause based on user role and filter params.
   */
  private buildQuotationWhere(user: any, filter?: ReportFilterDto) {
    const where: any = {};

    // Mandatory Scoping for SALES_REP
    if (user.role === UserRole.SALES_REP) {
      where.salesRepId = user.id;
    } else if (filter?.salesRepId) {
      where.salesRepId = filter.salesRepId;
    }

    if (filter?.customerId) {
      where.customerId = filter.customerId;
    }

    if (filter?.customerTier) {
      where.customer = { tier: filter.customerTier };
    }

    if (filter?.quotationStatus) {
      where.status = filter.quotationStatus;
    }

    if (filter?.currency) {
      where.currency = filter.currency;
    }

    if (filter?.dateFrom || filter?.dateTo) {
      where.createdAt = {};
      if (filter.dateFrom) where.createdAt.gte = new Date(filter.dateFrom);
      if (filter.dateTo) where.createdAt.lte = new Date(filter.dateTo);
    }

    return where;
  }

  // ---------------------------------------------------------------------------
  // 1. OVERVIEW REPORT
  // ---------------------------------------------------------------------------
  async getOverview(user: any, filter?: ReportFilterDto) {
    if (user.role === UserRole.CUSTOMER) {
      throw new ForbiddenException('Customers cannot access internal reports.');
    }

    const qWhere = this.buildQuotationWhere(user, filter);

    const [
      totalCustomers,
      activeCustomers,
      totalProducts,
      totalQuotations,
      confirmedQuotations,
      pendingApprovals,
      backordersCount,
      criticalDealAlerts,
    ] = await Promise.all([
      this.prisma.customer.count(),
      this.prisma.customer.count({ where: { isActive: true } }),
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.quotation.count({ where: qWhere }),
      this.prisma.quotation.count({
        where: { ...qWhere, status: QuotationStatus.CONFIRMED },
      }),
      this.prisma.approvalRequest.count({
        where: {
          status: ApprovalStatus.PENDING,
          ...(user.role === UserRole.SALES_REP ? { quotation: { salesRepId: user.id } } : {}),
        },
      }),
      this.prisma.backorder.count({
        where: {
          status: { notIn: ['CANCELLED', 'FULFILLED'] },
          ...(user.role === UserRole.SALES_REP ? { quotation: { salesRepId: user.id } } : {}),
        },
      }),
      this.prisma.dealHealthAlert.count({
        where: {
          severity: DealHealthSeverity.CRITICAL,
          isResolved: false,
          ...(user.role === UserRole.SALES_REP ? { quotation: { salesRepId: user.id } } : {}),
        },
      }),
    ]);

    // Currency-separated Confirmed Revenue
    const confirmedQuotes = await this.prisma.quotation.findMany({
      where: { ...qWhere, status: QuotationStatus.CONFIRMED },
      select: { totalAmount: true, currency: true },
    });

    const revenueByCurrency: Record<string, number> = {};
    for (const q of confirmedQuotes) {
      const curr = q.currency || 'INR';
      revenueByCurrency[curr] = (revenueByCurrency[curr] || 0) + Number(q.totalAmount);
    }

    // Invoices summary
    const invoices = await this.prisma.invoice.findMany({
      where: user.role === UserRole.SALES_REP ? { quotation: { salesRepId: user.id } } : {},
      select: { amount: true, paidAmount: true, remainingBalance: true, currency: true, status: true },
    });

    const outstandingByCurrency: Record<string, number> = {};
    const paidByCurrency: Record<string, number> = {};

    for (const inv of invoices) {
      const curr = inv.currency || 'INR';
      if (inv.status !== InvoiceStatus.CANCELLED) {
        paidByCurrency[curr] = (paidByCurrency[curr] || 0) + Number(inv.paidAmount || 0);
        if (inv.status !== InvoiceStatus.PAID) {
          outstandingByCurrency[curr] =
            (outstandingByCurrency[curr] || 0) + Number(inv.remainingBalance ?? inv.amount);
        }
      }
    }

    // Active Subscriptions
    const activeSubs = await this.prisma.subscriptionSchedule.count({
      where: {
        status: 'ACTIVE',
        ...(user.role === UserRole.SALES_REP ? { quotation: { salesRepId: user.id } } : {}),
      },
    });

    return {
      totalCustomers,
      activeCustomers,
      totalProducts,
      totalQuotations,
      confirmedQuotations,
      pendingApprovals,
      activeSubscriptions: activeSubs,
      backordersCount,
      criticalDealAlerts,
      revenueByCurrency,
      paidByCurrency,
      outstandingByCurrency,
    };
  }

  // ---------------------------------------------------------------------------
  // 2. SALES REPORT
  // ---------------------------------------------------------------------------
  async getSalesReport(user: any, filter?: ReportFilterDto) {
    if (user.role === UserRole.CUSTOMER) {
      throw new ForbiddenException('Customers cannot access internal reports.');
    }

    const qWhere = this.buildQuotationWhere(user, filter);

    const quotations = await this.prisma.quotation.findMany({
      where: qWhere,
      include: {
        customer: true,
        salesRep: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    let totalQuotations = quotations.length;
    let confirmedCount = 0;
    let cancelledOrRejectedCount = 0;
    const revenueByCurrency: Record<string, number> = {};
    const totalValueByCurrency: Record<string, number> = {};
    const revenueByTier: Record<string, number> = {};
    const revenueByRep: Record<string, number> = {};

    const dateTrendMap: Record<string, { count: number; revenue: number }> = {};

    for (const q of quotations) {
      const curr = q.currency || 'INR';
      const amt = Number(q.totalAmount);
      totalValueByCurrency[curr] = (totalValueByCurrency[curr] || 0) + amt;

      const dateKey = new Date(q.createdAt).toISOString().split('T')[0];
      if (!dateTrendMap[dateKey]) {
        dateTrendMap[dateKey] = { count: 0, revenue: 0 };
      }
      dateTrendMap[dateKey].count += 1;

      if (q.status === QuotationStatus.CONFIRMED || q.status === QuotationStatus.FULFILLED) {
        confirmedCount += 1;
        revenueByCurrency[curr] = (revenueByCurrency[curr] || 0) + amt;
        dateTrendMap[dateKey].revenue += amt;

        const tier = q.customer?.tier || CustomerTier.BRONZE;
        revenueByTier[tier] = (revenueByTier[tier] || 0) + amt;

        const repName = q.salesRep?.name || q.salesRep?.email || 'Unassigned';
        revenueByRep[repName] = (revenueByRep[repName] || 0) + amt;
      } else if (
        q.status === QuotationStatus.REJECTED ||
        q.status === QuotationStatus.CANCELLED
      ) {
        cancelledOrRejectedCount += 1;
      }
    }

    const conversionRate = totalQuotations > 0 ? (confirmedCount / totalQuotations) * 100 : 0;
    const averageDealValue =
      confirmedCount > 0
        ? Object.values(revenueByCurrency).reduce((a, b) => a + b, 0) / confirmedCount
        : 0;

    const trend = Object.entries(dateTrendMap).map(([date, data]) => ({
      date,
      quotations: data.count,
      revenue: data.revenue,
    }));

    return {
      totalQuotations,
      confirmedQuotations: confirmedCount,
      cancelledOrRejectedQuotations: cancelledOrRejectedCount,
      conversionRate: Math.round(conversionRate * 10) / 10,
      totalValueByCurrency,
      confirmedRevenueByCurrency: revenueByCurrency,
      averageDealValue: Math.round(averageDealValue * 100) / 100,
      revenueByTier,
      revenueBySalesRep: revenueByRep,
      trend,
    };
  }

  // ---------------------------------------------------------------------------
  // 3. QUOTATION FUNNEL REPORT
  // ---------------------------------------------------------------------------
  async getQuotationsReport(user: any, filter?: ReportFilterDto) {
    if (user.role === UserRole.CUSTOMER) {
      throw new ForbiddenException('Customers cannot access internal reports.');
    }

    const qWhere = this.buildQuotationWhere(user, filter);
    const quotations = await this.prisma.quotation.findMany({
      where: qWhere,
      select: { status: true, totalAmount: true, currency: true },
    });

    const statusCounts: Record<string, number> = {};
    const statusAmounts: Record<string, number> = {};

    for (const statusVal of Object.values(QuotationStatus)) {
      statusCounts[statusVal] = 0;
      statusAmounts[statusVal] = 0;
    }

    const total = quotations.length;
    for (const q of quotations) {
      statusCounts[q.status] = (statusCounts[q.status] || 0) + 1;
      statusAmounts[q.status] = (statusAmounts[q.status] || 0) + Number(q.totalAmount);
    }

    const funnel = Object.values(QuotationStatus).map((status) => {
      const count = statusCounts[status] || 0;
      return {
        status,
        count,
        percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
        totalAmount: statusAmounts[status] || 0,
      };
    });

    return {
      totalQuotations: total,
      funnel,
    };
  }

  // ---------------------------------------------------------------------------
  // 4. DISCOUNT REPORT
  // ---------------------------------------------------------------------------
  async getDiscountsReport(user: any, filter?: ReportFilterDto) {
    if (user.role === UserRole.CUSTOMER) {
      throw new ForbiddenException('Customers cannot access internal reports.');
    }

    const qWhere = this.buildQuotationWhere(user, filter);
    const lines = await this.prisma.quotationLine.findMany({
      where: {
        quotation: qWhere,
      },
      include: {
        product: { include: { category: true } },
        quotation: { include: { customer: true } },
      },
    });

    let totalLines = lines.length;
    let sumDiscountPercent = 0;
    let totalDiscountAmount = 0;
    let quotesWithDiscount = 0;

    const discountByTier: Record<string, number> = {};
    const discountByCategory: Record<string, number> = {};

    for (const line of lines) {
      const discPct = Number(line.discountPercent || 0);
      const discAmt = Number(line.discountAmount || 0);

      sumDiscountPercent += discPct;
      totalDiscountAmount += discAmt;
      if (discPct > 0) quotesWithDiscount += 1;

      const tier = line.quotation?.customer?.tier || CustomerTier.BRONZE;
      discountByTier[tier] = (discountByTier[tier] || 0) + discAmt;

      const catName = line.product?.category?.name || 'Uncategorized';
      discountByCategory[catName] = (discountByCategory[catName] || 0) + discAmt;
    }

    const avgDiscountPercent = totalLines > 0 ? sumDiscountPercent / totalLines : 0;

    const approvalCount = await this.prisma.approvalRequest.count({
      where: {
        ...(user.role === UserRole.SALES_REP ? { quotation: { salesRepId: user.id } } : {}),
      },
    });

    return {
      totalLinesEvaluated: totalLines,
      averageDiscountPercent: Math.round(avgDiscountPercent * 100) / 100,
      totalDiscountAmount: Math.round(totalDiscountAmount * 100) / 100,
      quotesWithDiscount,
      approvalRequiredCount: approvalCount,
      discountByTier,
      discountByCategory,
    };
  }

  // ---------------------------------------------------------------------------
  // 5. APPROVAL REPORT
  // ---------------------------------------------------------------------------
  async getApprovalsReport(user: any, filter?: ReportFilterDto) {
    if (user.role === UserRole.CUSTOMER) {
      throw new ForbiddenException('Customers cannot access internal reports.');
    }

    const approvals = await this.prisma.approvalRequest.findMany({
      where: user.role === UserRole.SALES_REP ? { quotation: { salesRepId: user.id } } : {},
      include: {
        quotation: { select: { quoteNumber: true, totalAmount: true, currency: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let returned = 0;

    const roleBreakdown: Record<string, { pending: number; approved: number; rejected: number }> = {
      SALES_MANAGER: { pending: 0, approved: 0, rejected: 0 },
      FINANCE: { pending: 0, approved: 0, rejected: 0 },
    };

    let totalDurationMs = 0;
    let completedCount = 0;

    for (const app of approvals) {
      const role = app.requiredRole || 'SALES_MANAGER';
      if (!roleBreakdown[role]) {
        roleBreakdown[role] = { pending: 0, approved: 0, rejected: 0 };
      }

      if (app.status === ApprovalStatus.PENDING) {
        pending += 1;
        roleBreakdown[role].pending += 1;
      } else if (app.status === ApprovalStatus.APPROVED) {
        approved += 1;
        roleBreakdown[role].approved += 1;
        const endTime = app.evaluatedAt || app.createdAt;
        if (endTime && app.createdAt) {
          totalDurationMs += new Date(endTime).getTime() - new Date(app.createdAt).getTime();
          completedCount += 1;
        }
      } else if (app.status === ApprovalStatus.REJECTED) {
        rejected += 1;
        roleBreakdown[role].rejected += 1;
        const endTime = app.evaluatedAt || app.createdAt;
        if (endTime && app.createdAt) {
          totalDurationMs += new Date(endTime).getTime() - new Date(app.createdAt).getTime();
          completedCount += 1;
        }
      } else if (app.status === ApprovalStatus.RETURNED_FOR_REVISION) {
        returned += 1;
      }
    }

    const avgApprovalTimeHours =
      completedCount > 0 ? totalDurationMs / (1000 * 3600 * completedCount) : 0;

    return {
      totalRequests: approvals.length,
      pending,
      approved,
      rejected,
      returned,
      avgApprovalTimeHours: Math.round(avgApprovalTimeHours * 10) / 10,
      roleBreakdown,
    };
  }

  // ---------------------------------------------------------------------------
  // 6. FULFILLMENT REPORT
  // ---------------------------------------------------------------------------
  async getFulfillmentReport(user: any, filter?: ReportFilterDto) {
    if (user.role === UserRole.CUSTOMER) {
      throw new ForbiddenException('Customers cannot access internal reports.');
    }

    const allocations = await this.prisma.fulfillmentAllocation.findMany({
      where: user.role === UserRole.SALES_REP ? { quotation: { salesRepId: user.id } } : {},
      include: {
        warehouse: true,
        product: true,
      },
    });

    const backorders = await this.prisma.backorder.findMany({
      where: user.role === UserRole.SALES_REP ? { quotation: { salesRepId: user.id } } : {},
    });

    let totalAllocations = allocations.length;
    let pendingCount = 0;
    let partialCount = 0;
    let fulfilledCount = 0;

    let totalQuantityAllocated = 0;
    let totalQuantityFulfilled = 0;

    const warehouseMap: Record<string, { name: string; allocated: number; fulfilled: number; backordered: number }> = {};

    for (const alloc of allocations) {
      totalQuantityAllocated += alloc.allocatedQuantity;
      totalQuantityFulfilled += alloc.fulfilledQuantity;

      if (alloc.status === FulfillmentStatus.FULFILLED) fulfilledCount += 1;
      else if (alloc.status === FulfillmentStatus.PARTIALLY_FULFILLED) partialCount += 1;
      else pendingCount += 1;

      const whName = alloc.warehouse?.name || 'Unassigned';
      if (!warehouseMap[whName]) {
        warehouseMap[whName] = { name: whName, allocated: 0, fulfilled: 0, backordered: 0 };
      }
      warehouseMap[whName].allocated += alloc.allocatedQuantity;
      warehouseMap[whName].fulfilled += alloc.fulfilledQuantity;
    }

    let totalQuantityBackordered = 0;
    for (const bo of backorders) {
      totalQuantityBackordered += bo.quantityPending;
    }

    const fulfillmentRate =
      totalQuantityAllocated > 0
        ? (totalQuantityFulfilled / totalQuantityAllocated) * 100
        : 0;

    return {
      totalAllocations,
      pendingCount,
      partialCount,
      fulfilledCount,
      backorderedOrdersCount: backorders.length,
      totalQuantityAllocated,
      totalQuantityFulfilled,
      totalQuantityBackordered,
      fulfillmentRate: Math.round(fulfillmentRate * 10) / 10,
      warehousePerformance: Object.values(warehouseMap),
    };
  }

  // ---------------------------------------------------------------------------
  // 7. WAREHOUSE REPORT
  // ---------------------------------------------------------------------------
  async getWarehouseReport(user: any, filter?: ReportFilterDto) {
    if (user.role === UserRole.CUSTOMER) {
      throw new ForbiddenException('Customers cannot access internal reports.');
    }

    const warehouses = await this.prisma.warehouse.findMany({
      include: {
        inventoryItems: {
          include: { product: true },
        },
        allocations: true,
      },
    });

    const warehouseStats = warehouses.map((wh) => {
      let stockOnHand = 0;
      let reservedStock = 0;

      for (const item of wh.inventoryItems) {
        stockOnHand += item.quantityOnHand;
        reservedStock += item.quantityReserved;
      }

      const availableStock = Math.max(0, stockOnHand - reservedStock);

      let allocatedQty = 0;
      let fulfilledQty = 0;

      for (const alloc of wh.allocations) {
        allocatedQty += alloc.allocatedQuantity;
        fulfilledQty += alloc.fulfilledQuantity;
      }

      const rate = allocatedQty > 0 ? (fulfilledQty / allocatedQty) * 100 : 100;

      return {
        id: wh.id,
        name: wh.name,
        code: wh.code,
        stockOnHand,
        reservedStock,
        availableStock,
        allocatedQty,
        fulfilledQty,
        fulfillmentRate: Math.round(rate * 10) / 10,
      };
    });

    return {
      totalWarehouses: warehouses.length,
      warehouses: warehouseStats,
    };
  }

  // ---------------------------------------------------------------------------
  // 8. BILLING REPORT
  // ---------------------------------------------------------------------------
  async getBillingReport(user: any, filter?: ReportFilterDto) {
    if (user.role === UserRole.CUSTOMER) {
      throw new ForbiddenException('Customers cannot access internal reports.');
    }

    const invoices = await this.prisma.invoice.findMany({
      where: user.role === UserRole.SALES_REP ? { quotation: { salesRepId: user.id } } : {},
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
    });

    let totalInvoices = invoices.length;
    let paidCount = 0;
    let unpaidCount = 0;
    let overdueCount = 0;

    const amountByCurrency: Record<string, number> = {};
    const paidByCurrency: Record<string, number> = {};
    const outstandingByCurrency: Record<string, number> = {};
    const overdueByCurrency: Record<string, number> = {};

    const statusDistribution: Record<string, number> = {
      UNPAID: 0,
      PARTIALLY_PAID: 0,
      PAID: 0,
      CANCELLED: 0,
    };

    const now = new Date();

    for (const inv of invoices) {
      const curr = inv.currency || 'INR';
      const amt = Number(inv.amount);
      const paid = Number(inv.paidAmount || 0);
      const remaining = Number(inv.remainingBalance ?? amt);

      statusDistribution[inv.status] = (statusDistribution[inv.status] || 0) + 1;

      if (inv.status !== InvoiceStatus.CANCELLED) {
        amountByCurrency[curr] = (amountByCurrency[curr] || 0) + amt;
        paidByCurrency[curr] = (paidByCurrency[curr] || 0) + paid;

        if (inv.status === InvoiceStatus.PAID) {
          paidCount += 1;
        } else {
          unpaidCount += 1;
          outstandingByCurrency[curr] = (outstandingByCurrency[curr] || 0) + remaining;

          if (inv.dueDate && inv.dueDate < now) {
            overdueCount += 1;
            overdueByCurrency[curr] = (overdueByCurrency[curr] || 0) + remaining;
          }
        }
      }
    }

    return {
      totalInvoices,
      paidCount,
      unpaidCount,
      overdueCount,
      amountByCurrency,
      paidByCurrency,
      outstandingByCurrency,
      overdueByCurrency,
      statusDistribution,
    };
  }

  // ---------------------------------------------------------------------------
  // 9. PAYMENT REPORT
  // ---------------------------------------------------------------------------
  async getPaymentReport(user: any, filter?: ReportFilterDto) {
    if (user.role === UserRole.CUSTOMER) {
      throw new ForbiddenException('Customers cannot access internal reports.');
    }

    const payments = await this.prisma.payment.findMany({
      where: user.role === UserRole.SALES_REP ? { invoice: { quotation: { salesRepId: user.id } } } : {},
      include: { invoice: { select: { invoiceNumber: true } } },
      orderBy: { createdAt: 'desc' },
    });

    let totalAttempts = payments.length;
    let successCount = 0;
    let failedCount = 0;
    let totalCollected = 0;
    let failedAmount = 0;

    const gatewayBreakdown: Record<string, { success: number; failed: number; collected: number }> = {};

    for (const pmt of payments) {
      const amt = Number(pmt.amount);
      const gw = pmt.gateway || 'MANUAL';

      if (!gatewayBreakdown[gw]) {
        gatewayBreakdown[gw] = { success: 0, failed: 0, collected: 0 };
      }

      if (pmt.status === 'SUCCESS') {
        successCount += 1;
        totalCollected += amt;
        gatewayBreakdown[gw].success += 1;
        gatewayBreakdown[gw].collected += amt;
      } else if (pmt.status === 'FAILED') {
        failedCount += 1;
        failedAmount += amt;
        gatewayBreakdown[gw].failed += 1;
      }
    }

    const successRate = totalAttempts > 0 ? (successCount / totalAttempts) * 100 : 0;

    return {
      totalAttempts,
      successCount,
      failedCount,
      totalCollected: Math.round(totalCollected * 100) / 100,
      failedAmount: Math.round(failedAmount * 100) / 100,
      successRate: Math.round(successRate * 10) / 10,
      gatewayBreakdown,
    };
  }

  // ---------------------------------------------------------------------------
  // 10. SUBSCRIPTION REPORT
  // ---------------------------------------------------------------------------
  async getSubscriptionReport(user: any, filter?: ReportFilterDto) {
    if (user.role === UserRole.CUSTOMER) {
      throw new ForbiddenException('Customers cannot access internal reports.');
    }

    const schedules = await this.prisma.subscriptionSchedule.findMany({
      where: user.role === UserRole.SALES_REP ? { quotation: { salesRepId: user.id } } : {},
      include: { plan: true, product: true },
    });

    let activeCount = 0;
    let pausedCount = 0;
    let cancelledCount = 0;
    let monthlyRecurringRevenue = 0;
    let overdueSchedulesCount = 0;

    const intervalBreakdown: Record<string, number> = {};
    const planBreakdown: Record<string, number> = {};

    const now = new Date();

    for (const sub of schedules) {
      const price = Number(sub.unitPrice) * sub.quantity;
      const cycle = sub.billingCycle || 'MONTHLY';
      intervalBreakdown[cycle] = (intervalBreakdown[cycle] || 0) + 1;

      const planName = sub.plan?.name || sub.product?.name || 'Standard Plan';
      planBreakdown[planName] = (planBreakdown[planName] || 0) + 1;

      if (sub.status === 'ACTIVE') {
        activeCount += 1;
        if (cycle === 'YEARLY') {
          monthlyRecurringRevenue += price / 12;
        } else if (cycle === 'QUARTERLY') {
          monthlyRecurringRevenue += price / 3;
        } else {
          monthlyRecurringRevenue += price;
        }

        if (sub.nextBillingDate && sub.nextBillingDate < now) {
          overdueSchedulesCount += 1;
        }
      } else if (sub.status === 'PAUSED') {
        pausedCount += 1;
      } else if (sub.status === 'CANCELLED') {
        cancelledCount += 1;
      }
    }

    return {
      totalSchedules: schedules.length,
      activeSubscriptions: activeCount,
      pausedSubscriptions: pausedCount,
      cancelledSubscriptions: cancelledCount,
      monthlyRecurringRevenue: Math.round(monthlyRecurringRevenue * 100) / 100,
      overdueSchedulesCount,
      intervalBreakdown,
      planBreakdown,
    };
  }

  // ---------------------------------------------------------------------------
  // 11. DEAL HEALTH REPORT
  // ---------------------------------------------------------------------------
  async getDealHealthReport(user: any, filter?: ReportFilterDto) {
    if (user.role === UserRole.CUSTOMER) {
      throw new ForbiddenException('Customers cannot access internal reports.');
    }

    const qWhere = this.buildQuotationWhere(user, filter);
    const quotes = await this.prisma.quotation.findMany({
      where: qWhere,
      select: { blendedRiskScore: true, quoteNumber: true },
    });

    let healthyCount = 0;
    let atRiskCount = 0;
    let criticalCount = 0;
    let totalScore = 0;

    for (const q of quotes) {
      const score = Number(q.blendedRiskScore ?? 100);
      totalScore += score;

      if (score >= 80) healthyCount += 1;
      else if (score >= 50) atRiskCount += 1;
      else criticalCount += 1;
    }

    const avgScore = quotes.length > 0 ? totalScore / quotes.length : 100;

    const alerts = await this.prisma.dealHealthAlert.findMany({
      where: {
        isResolved: false,
        ...(user.role === UserRole.SALES_REP ? { quotation: { salesRepId: user.id } } : {}),
      },
    });

    const alertsByType: Record<string, number> = {};
    const alertsBySeverity: Record<string, number> = {};

    for (const a of alerts) {
      alertsByType[a.alertType] = (alertsByType[a.alertType] || 0) + 1;
      alertsBySeverity[a.severity] = (alertsBySeverity[a.severity] || 0) + 1;
    }

    return {
      totalDealsAnalyzed: quotes.length,
      healthyCount,
      atRiskCount,
      criticalCount,
      avgHealthScore: Math.round(avgScore * 10) / 10,
      activeAlertsCount: alerts.length,
      alertsByType,
      alertsBySeverity,
    };
  }

  // ---------------------------------------------------------------------------
  // 12. CUSTOMER REPORT
  // ---------------------------------------------------------------------------
  async getCustomerReport(user: any, filter?: ReportFilterDto) {
    if (user.role === UserRole.CUSTOMER) {
      throw new ForbiddenException('Customers cannot access internal reports.');
    }

    const customers = await this.prisma.customer.findMany({
      include: {
        quotations: {
          where: { status: QuotationStatus.CONFIRMED },
          select: { totalAmount: true },
        },
      },
    });

    const tierBreakdown: Record<string, number> = { BRONZE: 0, SILVER: 0, GOLD: 0 };
    let activeCustomers = 0;

    const customerSpendList = customers.map((cust) => {
      if (cust.isActive) activeCustomers += 1;
      tierBreakdown[cust.tier] = (tierBreakdown[cust.tier] || 0) + 1;

      const confirmedRev = cust.quotations.reduce((sum, q) => sum + Number(q.totalAmount), 0);

      return {
        id: cust.id,
        name: cust.name,
        companyName: cust.companyName,
        tier: cust.tier,
        confirmedRevenue: confirmedRev,
        quotationsCount: cust.quotations.length,
      };
    });

    customerSpendList.sort((a, b) => b.confirmedRevenue - a.confirmedRevenue);

    return {
      totalCustomers: customers.length,
      activeCustomers,
      tierBreakdown,
      topCustomers: customerSpendList.slice(0, 10),
    };
  }

  // ---------------------------------------------------------------------------
  // 13. PRODUCT REPORT
  // ---------------------------------------------------------------------------
  async getProductReport(user: any, filter?: ReportFilterDto) {
    if (user.role === UserRole.CUSTOMER) {
      throw new ForbiddenException('Customers cannot access internal reports.');
    }

    const lines = await this.prisma.quotationLine.findMany({
      where: {
        quotation: {
          status: QuotationStatus.CONFIRMED,
          ...(user.role === UserRole.SALES_REP ? { salesRepId: user.id } : {}),
        },
      },
      include: {
        product: { include: { category: true } },
      },
    });

    const productSalesMap: Record<string, { name: string; sku: string; category: string; quantity: number; revenue: number }> = {};
    const categoryRevenueMap: Record<string, number> = {};

    for (const line of lines) {
      const pId = line.productId;
      const pName = line.product?.name || 'Unknown';
      const sku = line.product?.sku || 'N/A';
      const cat = line.product?.category?.name || 'Uncategorized';
      const qty = line.quantity;
      const rev = Number(line.finalUnitPrice);

      if (!productSalesMap[pId]) {
        productSalesMap[pId] = { name: pName, sku, category: cat, quantity: 0, revenue: 0 };
      }
      productSalesMap[pId].quantity += qty;
      productSalesMap[pId].revenue += rev;

      categoryRevenueMap[cat] = (categoryRevenueMap[cat] || 0) + rev;
    }

    const topProducts = Object.values(productSalesMap).sort((a, b) => b.revenue - a.revenue);

    return {
      totalProductsSold: topProducts.length,
      topProducts: topProducts.slice(0, 10),
      categoryRevenueMap,
    };
  }
}
