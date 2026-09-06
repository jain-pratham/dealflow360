import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ApprovalRoleRequired, ApprovalStatus, FulfillmentStatus, QuotationStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DiscountRulesService } from '../discount-rules/discount-rules.service';
import { BillingService } from '../billing/billing.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationPriority, NotificationType } from '@prisma/client';
import { CustomerCommentDto } from './dto/customer-comment.dto';
import { SubmitNegotiationDto } from './dto/submit-negotiation.dto';

@Injectable()
export class CustomerPortalService {
  private readonly logger = new Logger(CustomerPortalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly discountRulesService: DiscountRulesService,
    private readonly billingService: BillingService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async getResolvedCustomerId(currentUser: any): Promise<string> {
    if (currentUser.customerId) {
      return currentUser.customerId;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { customerId: true },
    });

    if (!user || !user.customerId) {
      throw new ForbiddenException('Authenticated user is not linked to a Customer account');
    }

    return user.customerId;
  }

  private mapStatusLabel(status: QuotationStatus): string {
    switch (status) {
      case QuotationStatus.SENT:
        return 'Sent';
      case QuotationStatus.UNDER_NEGOTIATION:
        return 'Under Negotiation';
      case QuotationStatus.CONFIRMED:
        return 'Confirmed';
      case QuotationStatus.FULFILLED:
        return 'Fulfilled';
      case QuotationStatus.PENDING_APPROVAL:
        return 'Under Negotiation (Pending Approval)';
      default:
        return status;
    }
  }

  async getDashboardData(currentUser: any) {
    const customerId = await this.getResolvedCustomerId(currentUser);

    const allQuotations = await this.prisma.quotation.findMany({
      where: {
        customerId,
        status: {
          in: [
            QuotationStatus.SENT,
            QuotationStatus.UNDER_NEGOTIATION,
            QuotationStatus.CONFIRMED,
            QuotationStatus.FULFILLED,
            QuotationStatus.PENDING_APPROVAL,
          ],
        },
      },
      include: {
        lines: true,
        invoices: {
          select: { id: true, invoiceNumber: true, status: true, amount: true, remainingBalance: true, dueDate: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const totalQuotations = allQuotations.length;
    const actionRequiredCount = allQuotations.filter((q) => q.status === QuotationStatus.SENT).length;
    const underNegotiationCount = allQuotations.filter(
      (q) => q.status === QuotationStatus.UNDER_NEGOTIATION || q.status === QuotationStatus.PENDING_APPROVAL,
    ).length;
    const confirmedCount = allQuotations.filter(
      (q) => q.status === QuotationStatus.CONFIRMED || q.status === QuotationStatus.FULFILLED,
    ).length;

    const invoices = await this.prisma.invoice.findMany({
      where: { customerId },
      select: { amount: true, remainingBalance: true, status: true },
    });

    const outstandingInvoiceAmount = invoices.reduce(
      (acc, inv) => (inv.status !== 'PAID' && inv.status !== 'CANCELLED' ? acc + Number(inv.remainingBalance ?? inv.amount) : acc),
      0,
    );

    const recentLogs = await this.prisma.quotationAuditLog.findMany({
      where: {
        quotation: { customerId },
      },
      take: 8,
      orderBy: { timestamp: 'desc' },
      include: {
        quotation: {
          select: { quoteNumber: true },
        },
      },
    });

    const recentActivity = recentLogs.map((log) => ({
      id: log.id,
      quoteNumber: log.quotation.quoteNumber,
      action: log.action,
      reason: log.reason,
      timestamp: log.timestamp,
    }));

    const recentQuotations = allQuotations.slice(0, 5).map((q) => ({
      id: q.id,
      quoteNumber: q.quoteNumber,
      status: q.status,
      statusLabel: this.mapStatusLabel(q.status),
      totalAmount: Number(q.totalAmount),
      currency: q.currency,
      itemCount: q.lines.length,
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
      invoice: q.invoices[0]
        ? {
            id: q.invoices[0].id,
            invoiceNumber: q.invoices[0].invoiceNumber,
            status: q.invoices[0].status,
            remainingBalance: Number(q.invoices[0].remainingBalance),
          }
        : null,
    }));

    return {
      totalQuotations,
      actionRequiredCount,
      underNegotiationCount,
      confirmedCount,
      outstandingInvoiceAmount,
      recentActivity,
      recentQuotations,
    };
  }

  async getQuotations(currentUser: any, search?: string, status?: string) {
    const customerId = await this.getResolvedCustomerId(currentUser);

    const allowedStatuses: QuotationStatus[] = [
      QuotationStatus.SENT,
      QuotationStatus.UNDER_NEGOTIATION,
      QuotationStatus.CONFIRMED,
      QuotationStatus.FULFILLED,
      QuotationStatus.PENDING_APPROVAL,
    ];

    const where: any = { customerId };

    if (status) {
      if (status === QuotationStatus.CONFIRMED) {
        where.status = {
          in: [QuotationStatus.CONFIRMED, QuotationStatus.FULFILLED],
        };
      } else if (allowedStatuses.includes(status as QuotationStatus)) {
        where.status = status;
      } else {
        where.status = 'NON_EXISTENT_STATUS_FILTER';
      }
    } else {
      where.status = {
        in: allowedStatuses,
      };
    }

    if (search && search.trim()) {
      where.quoteNumber = { contains: search.trim(), mode: 'insensitive' };
    }

    const quotations = await this.prisma.quotation.findMany({
      where,
      include: {
        customer: true,
        lines: {
          include: { product: true },
        },
        invoices: {
          select: { id: true, invoiceNumber: true, status: true, remainingBalance: true },
        },
        fulfillmentAllocations: {
          select: { id: true, status: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return quotations.map((q) => ({
      id: q.id,
      quoteNumber: q.quoteNumber,
      status: q.status,
      statusLabel: this.mapStatusLabel(q.status),
      subtotalAmount: Number(q.subtotalAmount),
      discountTotal: Number(q.discountTotal),
      taxTotal: Number(q.taxTotal),
      totalAmount: Number(q.totalAmount),
      currency: q.currency,
      itemCount: q.lines.length,
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
      invoice: q.invoices[0]
        ? {
            id: q.invoices[0].id,
            invoiceNumber: q.invoices[0].invoiceNumber,
            status: q.invoices[0].status,
            remainingBalance: Number(q.invoices[0].remainingBalance),
          }
        : null,
      fulfillmentStatus: (q.status === QuotationStatus.CONFIRMED || q.status === QuotationStatus.FULFILLED)
        ? (q.fulfillmentAllocations.every(a => a.status === FulfillmentStatus.FULFILLED) && q.fulfillmentAllocations.length > 0)
          ? 'FULFILLED'
          : (q.fulfillmentAllocations.some(a => a.status === FulfillmentStatus.PARTIALLY_FULFILLED))
          ? 'PARTIALLY_FULFILLED'
          : (q.fulfillmentAllocations.length > 0)
          ? 'ALLOCATED'
          : 'PROCESSING'
        : 'N/A',
    }));
  }

  async getQuotationById(quotationId: string, currentUser: any) {
    const customerId = await this.getResolvedCustomerId(currentUser);

    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        customer: true,
        lines: {
          include: { product: true, subscriptionPlan: true },
        },
        comments: {
          orderBy: { timestamp: 'asc' },
        },
        approvalRequests: {
          orderBy: { createdAt: 'desc' },
        },
        subscriptionSchedules: {
          include: { plan: true },
        },
        fulfillmentAllocations: true,
        invoices: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation not found`);
    }

    if (quotation.customerId !== customerId) {
      throw new ForbiddenException('You do not have access to this quotation');
    }

    const isPendingInternalApproval = quotation.approvalRequests.some(
      (r) => r.status === ApprovalStatus.PENDING,
    );

    return {
      id: quotation.id,
      quoteNumber: quotation.quoteNumber,
      status: quotation.status,
      statusLabel: this.mapStatusLabel(quotation.status),
      isPendingInternalApproval,
      currency: quotation.currency,
      subtotalAmount: Number(quotation.subtotalAmount),
      discountTotal: Number(quotation.discountTotal),
      taxTotal: Number(quotation.taxTotal),
      totalAmount: Number(quotation.totalAmount),
      createdAt: quotation.createdAt,
      updatedAt: quotation.updatedAt,
      customer: {
        companyName: quotation.customer.companyName,
        contactName: quotation.customer.name,
        email: quotation.customer.contactEmail,
        phone: quotation.customer.phone,
        address: quotation.customer.address,
      },
      lines: quotation.lines.map((line) => ({
        id: line.id,
        productId: line.productId,
        productName: line.product.name,
        sku: line.product.sku,
        description: line.product.description,
        lineType: line.lineType,
        subscriptionPlanId: line.subscriptionPlanId,
        subscriptionPlan: line.subscriptionPlan
          ? {
              id: line.subscriptionPlan.id,
              name: line.subscriptionPlan.name,
              interval: line.subscriptionPlan.interval,
            }
          : undefined,
        quantity: line.quantity,
        unitPrice: Number(line.unitPrice),
        discountPercent: Number(line.discountPercent),
        discountAmount: Number(line.discountAmount),
        taxRate: Number(line.taxRate),
        taxAmount: Number(line.taxAmount),
        subtotal: Number(line.subtotal),
        finalUnitPrice: Number(line.finalUnitPrice),
      })),
      subscriptionSchedules: quotation.subscriptionSchedules.map((s) => ({
        id: s.id,
        planName: s.plan?.name,
        billingCycle: s.billingCycle,
        nextBillingDate: s.nextBillingDate,
        status: s.status,
      })),
      comments: quotation.comments.map((c) => ({
        id: c.id,
        authorType: c.authorType,
        comment: c.commentText,
        quotationLineId: c.quotationLineId,
        isNegotiationCounter: c.isNegotiationCounter,
        proposedDiscount: c.proposedDiscount ? Number(c.proposedDiscount) : null,
        timestamp: c.timestamp,
      })),
      fulfillmentProgress: {
        totalAllocations: quotation.fulfillmentAllocations.length,
        status: (quotation.status === QuotationStatus.CONFIRMED || quotation.status === QuotationStatus.FULFILLED)
          ? (quotation.fulfillmentAllocations.every(a => a.status === FulfillmentStatus.FULFILLED) && quotation.fulfillmentAllocations.length > 0)
            ? 'FULFILLED'
            : (quotation.fulfillmentAllocations.some(a => a.status === FulfillmentStatus.PARTIALLY_FULFILLED))
            ? 'PARTIALLY_FULFILLED'
            : (quotation.fulfillmentAllocations.length > 0)
            ? 'ALLOCATED'
            : 'PROCESSING'
          : 'N/A',
      },
      invoices: quotation.invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        invoiceType: inv.invoiceType,
        amount: Number(inv.amount),
        paidAmount: Number(inv.paidAmount),
        remainingBalance: Number(inv.remainingBalance),
        currency: inv.currency,
        status: inv.status,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
      })),
    };
  }

  async addComment(quotationId: string, dto: CustomerCommentDto, currentUser: any) {
    const customerId = await this.getResolvedCustomerId(currentUser);

    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
    });

    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }

    if (quotation.customerId !== customerId) {
      throw new ForbiddenException('You do not have access to this quotation');
    }

    const comment = await this.prisma.quotationComment.create({
      data: {
        quotationId,
        authorId: currentUser.id,
        authorType: UserRole.CUSTOMER,
        commentText: dto.comment,
        quotationLineId: dto.lineId || null,
      },
    });

    await this.prisma.quotationAuditLog.create({
      data: {
        quotationId,
        userId: currentUser.id,
        action: 'CUSTOMER_COMMENT_ADDED',
        reason: `Customer added comment: "${dto.comment.substring(0, 50)}..."`,
      },
    });

    return comment;
  }

  async submitNegotiation(quotationId: string, dto: SubmitNegotiationDto, currentUser: any) {
    const customerId = await this.getResolvedCustomerId(currentUser);

    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        customer: true,
        lines: { include: { product: true } },
      },
    });

    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }

    if (quotation.customerId !== customerId) {
      throw new ForbiddenException('You do not have access to this quotation');
    }

    if (
      quotation.status !== QuotationStatus.SENT &&
      quotation.status !== QuotationStatus.UNDER_NEGOTIATION &&
      quotation.status !== QuotationStatus.APPROVED
    ) {
      throw new BadRequestException(
        `Cannot submit negotiation for quotation in status '${quotation.status}'`,
      );
    }

    const customerTier = quotation.customer.tier;
    let requiresApproval = false;
    let requiredRole: ApprovalRoleRequired = ApprovalRoleRequired.SALES_MANAGER;
    let maxRequestedDiscount = 0;

    const lineUpdates: Array<{
      lineId: string;
      newDiscountPercent: number;
      comment?: string;
    }> = [];

    const lineMap = new Map(quotation.lines.map((l) => [l.id, l]));

    if (dto.lineRequests && dto.lineRequests.length > 0) {
      for (const req of dto.lineRequests) {
        const line = lineMap.get(req.lineId);
        if (!line) {
          throw new BadRequestException(`Quotation line '${req.lineId}' does not exist`);
        }
        const newDiscount = req.requestedDiscount !== undefined ? req.requestedDiscount : Number(line.discountPercent);

        if (newDiscount > 0) {
          const evalRes = await this.discountRulesService.evaluateDiscount(
            customerTier,
            line.product.productType,
            newDiscount,
          );

          if (!evalRes.allowed) {
            throw new BadRequestException(
              `Requested discount of ${newDiscount}% for product '${line.product.name}' is rejected: ${evalRes.reason}`,
            );
          }

          if (evalRes.requiresApproval) {
            requiresApproval = true;
            if (newDiscount > maxRequestedDiscount) {
              maxRequestedDiscount = newDiscount;
            }
            if (evalRes.approvalRole === ApprovalRoleRequired.FINANCE) {
              requiredRole = ApprovalRoleRequired.FINANCE;
            }
          }
        }

        lineUpdates.push({
          lineId: req.lineId,
          newDiscountPercent: newDiscount,
          comment: req.comment,
        });
      }
    } else if (dto.counterDiscount !== undefined) {
      const counterDiscount = dto.counterDiscount;
      for (const line of quotation.lines) {
        if (counterDiscount > 0) {
          const evalRes = await this.discountRulesService.evaluateDiscount(
            customerTier,
            line.product.productType,
            counterDiscount,
          );

          if (!evalRes.allowed) {
            throw new BadRequestException(
              `Counter discount of ${counterDiscount}% for product '${line.product.name}' exceeds governance rules: ${evalRes.reason}`,
            );
          }

          if (evalRes.requiresApproval) {
            requiresApproval = true;
            if (counterDiscount > maxRequestedDiscount) {
              maxRequestedDiscount = counterDiscount;
            }
            if (evalRes.approvalRole === ApprovalRoleRequired.FINANCE) {
              requiredRole = ApprovalRoleRequired.FINANCE;
            }
          }
        }

        lineUpdates.push({
          lineId: line.id,
          newDiscountPercent: counterDiscount,
        });
      }
    }

    await this.prisma.$transaction(async (tx) => {
      let subtotalAmount = 0;
      let discountTotal = 0;
      let taxTotal = 0;
      let totalAmount = 0;

      for (const line of quotation.lines) {
        const updateInfo = lineUpdates.find((u) => u.lineId === line.id);
        const discountPercent = updateInfo ? updateInfo.newDiscountPercent : Number(line.discountPercent);

        const unitPrice = Number(line.unitPrice);
        const qty = line.quantity;
        const taxRate = Number(line.taxRate);

        const subtotal = unitPrice * qty;
        const discountAmount = (subtotal * discountPercent) / 100;
        const afterDiscount = subtotal - discountAmount;
        const taxAmount = (afterDiscount * taxRate) / 100;
        const finalUnitPrice = afterDiscount + taxAmount;

        subtotalAmount += subtotal;
        discountTotal += discountAmount;
        taxTotal += taxAmount;
        totalAmount += finalUnitPrice;

        await tx.quotationLine.update({
          where: { id: line.id },
          data: {
            discountPercent,
            discountAmount,
            subtotal,
            taxAmount,
            finalUnitPrice,
          },
        });

        if (updateInfo?.comment) {
          await tx.quotationComment.create({
            data: {
              quotationId,
              quotationLineId: line.id,
              authorId: currentUser.id,
              authorType: UserRole.CUSTOMER,
              commentText: updateInfo.comment,
              isNegotiationCounter: true,
              proposedDiscount: discountPercent,
            },
          });
        }
      }

      const nextStatus = requiresApproval
        ? QuotationStatus.PENDING_APPROVAL
        : QuotationStatus.UNDER_NEGOTIATION;

      await tx.quotation.update({
        where: { id: quotationId },
        data: {
          subtotalAmount,
          discountTotal,
          taxTotal,
          totalAmount,
          status: nextStatus,
        },
      });

      let activeApprovalChainId: string | null = null;
      if (requiresApproval) {
        const activeChain = await tx.approvalChain.findFirst({
          where: {
            requiredRole,
            isActive: true,
          },
          orderBy: { sequence: 'asc' },
        });

        if (!activeChain) {
          throw new BadRequestException(
            `No active approval chain configured for the required approval role: ${requiredRole}`,
          );
        }

        activeApprovalChainId = activeChain.id;
      }

      if (requiresApproval) {
        await tx.approvalRequest.create({
          data: {
            quotationId,
            approvalChainId: activeApprovalChainId,
            requiredRole,
            requestedDiscount: maxRequestedDiscount,
            status: ApprovalStatus.PENDING,
          },
        });
      }

      if (dto.comment) {
        await tx.quotationComment.create({
          data: {
            quotationId,
            authorId: currentUser.id,
            authorType: UserRole.CUSTOMER,
            commentText: dto.comment,
            isNegotiationCounter: true,
            proposedDiscount: dto.counterDiscount || maxRequestedDiscount || null,
          },
        });
      }

      await tx.quotationAuditLog.create({
        data: {
          quotationId,
          userId: currentUser.id,
          action: 'CUSTOMER_SUBMITTED_NEGOTIATION',
          reason: `Customer submitted negotiation request (${requiresApproval ? 'Triggers ' + requiredRole + ' approval' : 'Status set to UNDER_NEGOTIATION'})`,
        },
      });
    });

    this.logger.log(`[AUDIT] Customer submitted negotiation for quotation ${quotation.quoteNumber}`);

    // Notify Sales Rep of Customer Negotiation
    if (quotation.salesRepId) {
      this.notificationsService.createNotification({
        userId: quotation.salesRepId,
        type: NotificationType.CUSTOMER_NEGOTIATION_SUBMITTED,
        title: `Customer Counter-Offer: ${quotation.quoteNumber}`,
        message: `Customer submitted a negotiation request for quotation ${quotation.quoteNumber}.`,
        entityType: 'QUOTATION',
        entityId: quotation.id,
        priority: NotificationPriority.HIGH,
        deduplicationKey: `NEGOTIATION_${quotation.id}_${Date.now()}`,
        metadata: { url: `/sales/quotations` },
      }).catch((e) => this.logger.error('Failed to dispatch negotiation notification', e));
    }

    return {
      message: 'Negotiation request submitted successfully.',
      status: requiresApproval ? QuotationStatus.PENDING_APPROVAL : QuotationStatus.UNDER_NEGOTIATION,
      requiresApproval,
    };
  }

  async confirmQuotation(quotationId: string, currentUser: any) {
    const customerId = await this.getResolvedCustomerId(currentUser);

    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        customer: true,
        lines: { include: { product: true } },
        approvalRequests: true,
      },
    });

    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }

    if (quotation.customerId !== customerId) {
      throw new ForbiddenException('You do not have access to this quotation');
    }

    const hasPendingApproval = quotation.approvalRequests.some(
      (r) => r.status === ApprovalStatus.PENDING,
    );

    if (hasPendingApproval) {
      throw new BadRequestException(
        'Quotation has pending internal approvals and cannot be confirmed yet.',
      );
    }

    if (
      quotation.status !== QuotationStatus.SENT &&
      quotation.status !== QuotationStatus.UNDER_NEGOTIATION &&
      quotation.status !== QuotationStatus.APPROVED
    ) {
      throw new BadRequestException(
        `Quotation in status '${quotation.status}' cannot be confirmed.`,
      );
    }

    for (const line of quotation.lines) {
      const discount = Number(line.discountPercent);
      if (discount > 0) {
        const evalRes = await this.discountRulesService.evaluateDiscount(
          quotation.customer.tier,
          line.product.productType,
          discount,
        );

        if (!evalRes.allowed) {
          throw new BadRequestException(
            `Line item '${line.product.name}' discount of ${discount}% violates discount rules: ${evalRes.reason}`,
          );
        }
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.quotation.update({
        where: { id: quotationId },
        data: { status: QuotationStatus.CONFIRMED },
      });

      await tx.quotationAuditLog.create({
        data: {
          quotationId,
          userId: currentUser.id,
          action: 'CONFIRMED_BY_CUSTOMER',
          reason: `Quotation confirmed by customer (${currentUser.name || currentUser.email})`,
        },
      });

      // Auto-generate one-time invoices and subscription schedules
      await this.billingService.processConfirmedQuotation(quotationId, tx);
    });

    this.logger.log(`[AUDIT] Quotation ${quotation.quoteNumber} confirmed by customer`);

    // Notify Sales Rep of Quotation Confirmation
    if (quotation.salesRepId) {
      this.notificationsService.createNotification({
        userId: quotation.salesRepId,
        type: NotificationType.QUOTATION_CONFIRMED,
        title: `Order Confirmed: ${quotation.quoteNumber}`,
        message: `Quotation ${quotation.quoteNumber} has been confirmed by the customer.`,
        entityType: 'QUOTATION',
        entityId: quotation.id,
        priority: NotificationPriority.HIGH,
        deduplicationKey: `CONFIRMED_${quotationId}`,
        metadata: { url: `/sales/quotations` },
      }).catch((e) => this.logger.error('Failed to dispatch confirmation notification to sales rep', e));
    }

    // Notify Finance Users
    this.prisma.user.findMany({
      where: { role: UserRole.FINANCE, isActive: true },
      select: { id: true },
    }).then((finUsers) => {
      const ids = finUsers.map(u => u.id);
      if (ids.length > 0) {
        this.notificationsService.createNotificationForMultipleUsers(ids, {
          type: NotificationType.QUOTATION_CONFIRMED,
          title: `Confirmed Order Invoice: ${quotation.quoteNumber}`,
          message: `Quotation ${quotation.quoteNumber} confirmed. Invoice generated for ₹${Number(quotation.totalAmount)}.`,
          entityType: 'QUOTATION',
          entityId: quotation.id,
          priority: NotificationPriority.NORMAL,
          deduplicationKey: `CONFIRMED_FIN_${quotationId}`,
          metadata: { url: `/finance/billing` },
        }).catch((e) => this.logger.error('Failed to dispatch confirmation notifications to finance', e));
      }
    }).catch((e) => this.logger.error('Failed to query finance users for confirmation notification', e));

    return {
      message: 'Quotation confirmed successfully!',
      status: QuotationStatus.CONFIRMED,
      quotationId,
    };
  }

  async getCustomerProfile(currentUser: any) {
    const customerId = await this.getResolvedCustomerId(currentUser);

    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    return {
      id: customer.id,
      companyName: customer.companyName,
      contactName: customer.name,
      email: customer.contactEmail,
      phone: customer.phone,
      address: customer.address,
      currency: customer.currency,
      createdAt: customer.createdAt,
    };
  }

  async getCustomerInvoices(currentUser: any, query: any = {}) {
    const customerId = await this.getResolvedCustomerId(currentUser);
    return this.billingService.findAllInvoices(
      { ...query, customerId },
      { ...currentUser, customerId, role: UserRole.CUSTOMER },
    );
  }

  async getCustomerInvoiceById(invoiceId: string, currentUser: any) {
    const customerId = await this.getResolvedCustomerId(currentUser);
    return this.billingService.findInvoiceById(
      invoiceId,
      { ...currentUser, customerId, role: UserRole.CUSTOMER },
    );
  }

  async getCustomerSubscriptions(currentUser: any, query: any = {}) {
    const customerId = await this.getResolvedCustomerId(currentUser);
    return this.subscriptionsService.findAll(
      { ...query, customerId },
      { ...currentUser, customerId, role: UserRole.CUSTOMER },
    );
  }
}
