import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DealHealthGateway } from './deal-health.gateway';
import { DiscountRulesService } from '../discount-rules/discount-rules.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  DealHealthAlertType,
  DealHealthSeverity,
  QuotationStatus,
  ApprovalStatus,
  FulfillmentStatus,
  BackorderStatus,
  InvoiceStatus,
  ProductType,
  NotificationPriority,
  NotificationType,
  UserRole,
} from '@prisma/client';

@Injectable()
export class DealHealthService {
  private readonly logger = new Logger(DealHealthService.name);

  // Scoring config based on plan
  private readonly SCORING_CONFIG = {
    discount: { approvalRequired: 10, nearMax: 15 },
    approval: { pending: 8, pendingLong: 15, rejected: 25 },
    negotiation: { firstCounter: 8, escalated: 18 },
    aging: { staleDays: 14, staleRisk: 10, veryOldDays: 30, veryOldRisk: 20 },
    fulfillment: { backorder: 15, partialStock: 8 },
    billing: { unpaid: 10, overdue: 20 },
    paymentFail: { failed: 20 },
    subscription: { overdueSchedule: 10 },
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: DealHealthGateway,
    private readonly discountRulesService: DiscountRulesService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Recalculates the health score for a quotation and persists it.
   */
  async recalculateQuotationHealth(quotationId: string) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        customer: true,
        lines: {
          include: { product: true },
        },
        approvalRequests: true,
        comments: true,
        fulfillmentAllocations: true,
        backorders: true,
        invoices: {
          include: { payments: true },
        },
        subscriptionSchedules: true,
      },
    });

    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }

    let score = 100;
    const activeAlertKeys = new Set<string>();

    // Helper to deduct score and generate an alert
    const registerRisk = async (
      alertType: DealHealthAlertType,
      severity: DealHealthSeverity,
      conditionKey: string,
      title: string,
      message: string,
      penalty: number,
    ) => {
      score -= penalty;
      const deduplicationKey = `${quotationId}:${alertType}:${conditionKey}`;
      activeAlertKeys.add(deduplicationKey);

      // Application level deduplication check
      const existing = await this.prisma.dealHealthAlert.findFirst({
        where: {
          quotationId,
          deduplicationKey,
          isResolved: false,
        },
      });

      if (!existing) {
        await this.prisma.dealHealthAlert.create({
          data: {
            quotationId,
            alertType,
            severity,
            title,
            message,
            deduplicationKey,
          },
        });
      }
    };

    // 1. DISCOUNT RISK
    // Check line items against discount rules
    let highestDiscountRisk = 0;
    let maxDiscountMessage = '';
    
    for (const line of quotation.lines) {
      const discountPercent = Number(line.discountPercent);
      if (discountPercent > 0) {
        const evalResult = await this.discountRulesService.evaluateDiscount(
          quotation.customer.tier,
          line.product.productType,
          discountPercent,
        );

        if (!evalResult.allowed) {
          // Critical risk if discount is rejected by rules/near max
           if (highestDiscountRisk < this.SCORING_CONFIG.discount.nearMax) {
              highestDiscountRisk = this.SCORING_CONFIG.discount.nearMax;
              maxDiscountMessage = `Discount of ${discountPercent}% on ${line.product.name} exceeds max allowed.`;
           }
        } else if (evalResult.requiresApproval) {
           if (highestDiscountRisk < this.SCORING_CONFIG.discount.approvalRequired) {
              highestDiscountRisk = this.SCORING_CONFIG.discount.approvalRequired;
              maxDiscountMessage = `Discount of ${discountPercent}% requires ${evalResult.approvalRole} approval.`;
           }
        }
      }
    }
    if (highestDiscountRisk > 0) {
      await registerRisk(
        DealHealthAlertType.DISCOUNT_ANOMALY,
        highestDiscountRisk === this.SCORING_CONFIG.discount.nearMax ? DealHealthSeverity.CRITICAL : DealHealthSeverity.HIGH,
        'DISCOUNT_RISK',
        'Discount Anomaly',
        maxDiscountMessage,
        highestDiscountRisk
      );
    }

    // 2. APPROVAL RISK
    const approvalRequests = quotation.approvalRequests || [];
    const latestApproval = [...approvalRequests].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    )[0];

    if (latestApproval) {
      if (latestApproval.status === ApprovalStatus.REJECTED || latestApproval.status === ApprovalStatus.RETURNED_FOR_REVISION) {
        await registerRisk(
          DealHealthAlertType.APPROVAL_DELAY,
          DealHealthSeverity.CRITICAL,
          'APPROVAL_REJECTED',
          'Approval Rejected / Returned',
          'The latest approval request was rejected or returned for revision.',
          this.SCORING_CONFIG.approval.rejected,
        );
      } else if (latestApproval.status === ApprovalStatus.PENDING) {
        const pendingDays = (new Date().getTime() - latestApproval.createdAt.getTime()) / (1000 * 3600 * 24);
        if (pendingDays > 3) {
          await registerRisk(
            DealHealthAlertType.APPROVAL_DELAY,
            DealHealthSeverity.HIGH,
            'APPROVAL_PENDING_LONG',
            'Prolonged Approval Delay',
            `Quotation has been pending approval for ${Math.floor(pendingDays)} days.`,
            this.SCORING_CONFIG.approval.pendingLong,
          );
        } else {
          await registerRisk(
            DealHealthAlertType.APPROVAL_DELAY,
            DealHealthSeverity.MEDIUM,
            'APPROVAL_PENDING',
            'Pending Approval',
            'Quotation is currently pending manager or finance approval.',
            this.SCORING_CONFIG.approval.pending,
          );
        }
      }
    }

    // 3. NEGOTIATION RISK
    const comments = quotation.comments || [];
    const counterOffers = comments.filter(c => c.isNegotiationCounter);
    if (counterOffers.length > 1) {
      await registerRisk(
        DealHealthAlertType.NEGOTIATION_ESCALATION,
        DealHealthSeverity.HIGH,
        'MULTIPLE_COUNTERS',
        'Escalated Negotiation',
        `Customer has submitted ${counterOffers.length} counter offers.`,
        this.SCORING_CONFIG.negotiation.escalated,
      );
    } else if (counterOffers.length === 1) {
      await registerRisk(
        DealHealthAlertType.NEGOTIATION_ESCALATION,
        DealHealthSeverity.MEDIUM,
        'SINGLE_COUNTER',
        'Customer Counter Offer',
        'Customer has submitted a counter offer or change request.',
        this.SCORING_CONFIG.negotiation.firstCounter,
      );
    }

    // 4. QUOTE AGING RISK (Only for unresolved quotes)
    const unresolvedStatuses: string[] = [
      QuotationStatus.DRAFT,
      QuotationStatus.PENDING_APPROVAL,
      QuotationStatus.SENT_TO_CUSTOMER,
      QuotationStatus.UNDER_NEGOTIATION,
    ];
    const isUnresolved = unresolvedStatuses.includes(quotation.status as string);

    if (isUnresolved) {
      const ageDays = (new Date().getTime() - quotation.createdAt.getTime()) / (1000 * 3600 * 24);
      if (ageDays >= this.SCORING_CONFIG.aging.veryOldDays) {
        await registerRisk(
          DealHealthAlertType.STALLED_DEAL,
          DealHealthSeverity.HIGH,
          'VERY_OLD_QUOTE',
          'Severely Stalled Deal',
          `Quotation has been open for ${Math.floor(ageDays)} days.`,
          this.SCORING_CONFIG.aging.veryOldRisk,
        );
      } else if (ageDays >= this.SCORING_CONFIG.aging.staleDays) {
         await registerRisk(
          DealHealthAlertType.STALLED_DEAL,
          DealHealthSeverity.MEDIUM,
          'STALE_QUOTE',
          'Stalled Deal',
          `Quotation has been open for ${Math.floor(ageDays)} days.`,
          this.SCORING_CONFIG.aging.staleRisk,
        );
      }
    }

    // 5. FULFILLMENT RISK
    const backorders = quotation.backorders || [];
    const hasBackorders = backorders.some(b => 
      b.status !== BackorderStatus.CANCELLED && b.status !== BackorderStatus.FULFILLED
    );
    if (hasBackorders) {
       await registerRisk(
          DealHealthAlertType.STOCK_SHORTAGE,
          DealHealthSeverity.HIGH,
          'BACKORDER_ACTIVE',
          'Active Backorder',
          'One or more line items are currently on backorder.',
          this.SCORING_CONFIG.fulfillment.backorder,
        );
    } else {
       const allocations = quotation.fulfillmentAllocations || [];
       const partialFulfilled = allocations.some(a => a.status === FulfillmentStatus.PARTIALLY_FULFILLED);
       if (partialFulfilled) {
         await registerRisk(
            DealHealthAlertType.DELIVERY_SLIPPAGE,
            DealHealthSeverity.MEDIUM,
            'PARTIAL_FULFILLMENT',
            'Partial Fulfillment',
            'Some allocations could only be partially fulfilled from requested warehouses.',
            this.SCORING_CONFIG.fulfillment.partialStock,
          );
       }
    }

    // 6. BILLING RISK
    const invoices = quotation.invoices || [];
    for (const invoice of invoices) {
       if (invoice.status === InvoiceStatus.UNPAID || invoice.status === InvoiceStatus.PARTIALLY_PAID) {
          const isOverdue = invoice.dueDate < new Date();
          if (isOverdue) {
             await registerRisk(
                DealHealthAlertType.PAYMENT_DELAY,
                DealHealthSeverity.HIGH,
                `OVERDUE_INVOICE_${invoice.id}`,
                'Overdue Invoice',
                `Invoice ${invoice.invoiceNumber} is overdue for payment.`,
                this.SCORING_CONFIG.billing.overdue,
              );
          } else {
             await registerRisk(
                DealHealthAlertType.PAYMENT_DELAY,
                DealHealthSeverity.MEDIUM,
                `UNPAID_INVOICE_${invoice.id}`,
                'Unpaid Invoice',
                `Invoice ${invoice.invoiceNumber} is awaiting payment.`,
                this.SCORING_CONFIG.billing.unpaid,
              );
          }
       }

       // 7. PAYMENT FAILURE RISK
       const payments = invoice.payments || [];
       const failedPayments = payments.filter(p => p.status === 'FAILED');
       if (failedPayments.length > 0) {
          await registerRisk(
            DealHealthAlertType.PAYMENT_FAILURE,
            DealHealthSeverity.CRITICAL,
            `PAYMENT_FAILED_${invoice.id}`,
            'Payment Failure',
            `A recent payment attempt for invoice ${invoice.invoiceNumber} failed.`,
            this.SCORING_CONFIG.paymentFail.failed,
          );
       }
    }

    // 8. SUBSCRIPTION RISK
    const subscriptionSchedules = quotation.subscriptionSchedules || [];
    const activeSubs = subscriptionSchedules.filter(s => s.status === 'ACTIVE');
    for (const sub of activeSubs) {
       if (sub.nextBillingDate < new Date()) {
          await registerRisk(
            DealHealthAlertType.SUBSCRIPTION_BILLING_RISK,
            DealHealthSeverity.HIGH,
            `SUB_OVERDUE_${sub.id}`,
            'Subscription Billing Overdue',
            `A recurring subscription schedule missed its billing date.`,
            this.SCORING_CONFIG.subscription.overdueSchedule,
          );
       }
    }

    // Clamp score
    score = Math.max(0, Math.min(100, score));

    let status = 'HEALTHY';
    if (score < 50) status = 'CRITICAL';
    else if (score < 80) status = 'AT_RISK';

    // Auto-resolve alerts that are no longer active
    await this.prisma.dealHealthAlert.updateMany({
      where: {
        quotationId,
        isResolved: false,
        deduplicationKey: {
          notIn: Array.from(activeAlertKeys)
        }
      },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
      }
    });

    // Save the updated score to the quotation
    await this.prisma.quotation.update({
      where: { id: quotationId },
      data: { blendedRiskScore: score }
    });

    // Fetch the updated active alerts to emit
    const finalAlerts = await this.prisma.dealHealthAlert.findMany({
      where: { quotationId, isResolved: false },
      orderBy: { createdAt: 'desc' }
    });

    // Emit event
    this.gateway.emitHealthUpdate(quotationId, score, status, finalAlerts);

    // Notify Sales Rep & Managers if deal health is CRITICAL
    if (status === 'CRITICAL' && quotation.salesRepId) {
      this.notificationsService.createNotification({
        userId: quotation.salesRepId,
        type: NotificationType.DEAL_HEALTH_CRITICAL,
        title: `Critical Deal Risk: Quote ${quotation.quoteNumber}`,
        message: `Deal health score for quote ${quotation.quoteNumber} dropped to ${score}/100. ${finalAlerts.length} risk factor(s) detected.`,
        entityType: 'QUOTATION',
        entityId: quotationId,
        priority: NotificationPriority.CRITICAL,
        deduplicationKey: `DH_CRIT_${quotationId}_${Math.floor(Date.now() / (1000 * 3600 * 6))}`,
        metadata: { url: `/sales/deal-health` },
      }).catch((e) => this.logger.error('Failed to dispatch deal health notification', e));
    }

    return {
      quotationId,
      score,
      status,
      alerts: finalAlerts,
    };
  }

  async getDashboardMetrics(userRole: string, userId?: string) {
     const whereClause: any = {};
     if (userRole === 'SALES_REP') {
       whereClause.salesRepId = userId;
     }

     const quotes = await this.prisma.quotation.findMany({
       where: whereClause,
       select: { id: true, blendedRiskScore: true }
     });

     let totalDeals = quotes.length;
     let healthy = 0;
     let atRisk = 0;
     let critical = 0;

     for (const q of quotes) {
       const s = Number(q.blendedRiskScore);
       if (s < 50) critical++;
       else if (s < 80) atRisk++;
       else healthy++;
     }

     // Build alert where clause
     const alertWhere: any = { isResolved: false };
     if (userRole === 'SALES_REP') {
       alertWhere.quotation = { salesRepId: userId };
     }

     const alerts = await this.prisma.dealHealthAlert.findMany({
       where: alertWhere,
       select: { alertType: true, severity: true }
     });

     let openAlerts = alerts.length;
     let criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL').length;
     
     const alertsByType = alerts.reduce((acc, alert) => {
        acc[alert.alertType] = (acc[alert.alertType] || 0) + 1;
        return acc;
     }, {} as Record<string, number>);

     const alertsBySeverity = alerts.reduce((acc, alert) => {
        acc[alert.severity] = (acc[alert.severity] || 0) + 1;
        return acc;
     }, {} as Record<string, number>);

     return {
       totalDeals,
       healthyDeals: healthy,
       atRiskDeals: atRisk,
       criticalDeals: critical,
       openAlerts,
       criticalAlerts,
       alertsByType,
       alertsBySeverity
     };
  }
}
