import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  InvoiceStatus,
  InvoiceType,
  LineType,
  SubscriptionInterval,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QuerySubscriptionsDto } from './dto/query-subscriptions.dto';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private transformSubscription(s: any) {
    return {
      id: s.id,
      quotationId: s.quotationId,
      quotationLineId: s.quotationLineId,
      customerId: s.customerId,
      productId: s.productId,
      planId: s.planId,
      billingCycle: s.billingCycle,
      startDate: s.startDate,
      nextBillingDate: s.nextBillingDate,
      billingPeriodStart: s.billingPeriodStart,
      billingPeriodEnd: s.billingPeriodEnd,
      unitPrice: Number(s.unitPrice),
      quantity: s.quantity,
      currency: s.currency || 'INR',
      status: s.status,
      endDate: s.endDate,
      cancellationDate: s.cancellationDate,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      product: s.product
        ? {
            id: s.product.id,
            name: s.product.name,
            sku: s.product.sku,
          }
        : undefined,
      plan: s.plan
        ? {
            id: s.plan.id,
            name: s.plan.name,
            interval: s.plan.interval,
          }
        : undefined,
      quotation: s.quotation
        ? {
            id: s.quotation.id,
            quoteNumber: s.quotation.quoteNumber,
            customer: s.quotation.customer
              ? {
                  id: s.quotation.customer.id,
                  name: s.quotation.customer.name,
                  companyName: s.quotation.customer.companyName,
                  contactEmail: s.quotation.customer.contactEmail,
                }
              : undefined,
          }
        : undefined,
      invoices: s.invoices
        ? s.invoices.map((inv: any) => ({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            amount: Number(inv.amount),
            status: inv.status,
            dueDate: inv.dueDate,
          }))
        : [],
    };
  }

  async findAll(query: QuerySubscriptionsDto, currentUser?: any) {
    const { search, status, customerId, page = 1, limit = 20 } = query;
    const cappedLimit = Math.min(Math.max(1, limit), 100);
    const skip = (Math.max(1, page) - 1) * cappedLimit;

    const where: any = {};

    if (currentUser?.role === UserRole.CUSTOMER) {
      if (!currentUser.customerId) {
        return { data: [], meta: { total: 0, page: 1, limit: cappedLimit, totalPages: 1 } };
      }
      where.quotation = { customerId: currentUser.customerId };
    } else if (customerId) {
      where.quotation = { customerId };
    }

    if (status) {
      where.status = status;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { product: { name: { contains: q, mode: 'insensitive' } } },
        { quotation: { quoteNumber: { contains: q, mode: 'insensitive' } } },
        { quotation: { customer: { companyName: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.subscriptionSchedule.count({ where }),
      this.prisma.subscriptionSchedule.findMany({
        where,
        include: {
          product: true,
          plan: true,
          quotation: {
            include: { customer: true },
          },
          invoices: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: cappedLimit,
      }),
    ]);

    return {
      data: items.map((s) => this.transformSubscription(s)),
      meta: {
        total,
        page,
        limit: cappedLimit,
        totalPages: Math.ceil(total / cappedLimit) || 1,
      },
    };
  }

  async findOne(id: string, currentUser?: any) {
    const sub = await this.prisma.subscriptionSchedule.findUnique({
      where: { id },
      include: {
        product: true,
        plan: true,
        quotation: {
          include: { customer: true },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!sub) {
      throw new NotFoundException(`Subscription schedule '${id}' not found`);
    }

    if (currentUser?.role === UserRole.CUSTOMER) {
      if (sub.quotation?.customerId !== currentUser.customerId) {
        throw new NotFoundException(`Subscription schedule '${id}' not found`);
      }
    }

    return this.transformSubscription(sub);
  }

  async pause(id: string, currentUser?: any) {
    const sub = await this.prisma.subscriptionSchedule.findUnique({
      where: { id },
    });

    if (!sub) {
      throw new NotFoundException(`Subscription schedule '${id}' not found`);
    }

    if (sub.status !== 'ACTIVE') {
      throw new BadRequestException(`Subscription status is '${sub.status}', only ACTIVE subscriptions can be paused.`);
    }

    const updated = await this.prisma.subscriptionSchedule.update({
      where: { id },
      data: { status: 'PAUSED' },
      include: { product: true, plan: true, quotation: { include: { customer: true } } },
    });

    await this.prisma.quotationAuditLog.create({
      data: {
        quotationId: sub.quotationId,
        userId: currentUser?.id,
        action: 'SUBSCRIPTION_PAUSED',
        reason: `Subscription paused by ${currentUser?.name || 'User'}`,
      },
    });

    this.logger.log(`[SUBSCRIPTION] Subscription '${id}' PAUSED`);
    return this.transformSubscription(updated);
  }

  async resume(id: string, currentUser?: any) {
    const sub = await this.prisma.subscriptionSchedule.findUnique({
      where: { id },
    });

    if (!sub) {
      throw new NotFoundException(`Subscription schedule '${id}' not found`);
    }

    if (sub.status !== 'PAUSED') {
      throw new BadRequestException(`Subscription status is '${sub.status}', only PAUSED subscriptions can be resumed.`);
    }

    const now = new Date();
    const nextBillingDate = new Date(now);
    if (sub.billingCycle === SubscriptionInterval.YEARLY) {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
    } else if (sub.billingCycle === SubscriptionInterval.QUARTERLY) {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 3);
    } else {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    }

    const updated = await this.prisma.subscriptionSchedule.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        nextBillingDate,
        billingPeriodStart: now,
        billingPeriodEnd: nextBillingDate,
      },
      include: { product: true, plan: true, quotation: { include: { customer: true } } },
    });

    await this.prisma.quotationAuditLog.create({
      data: {
        quotationId: sub.quotationId,
        userId: currentUser?.id,
        action: 'SUBSCRIPTION_RESUMED',
        reason: `Subscription resumed by ${currentUser?.name || 'User'}. Next billing date: ${nextBillingDate.toISOString()}`,
      },
    });

    this.logger.log(`[SUBSCRIPTION] Subscription '${id}' RESUMED`);
    return this.transformSubscription(updated);
  }

  async cancel(id: string, currentUser?: any) {
    const sub = await this.prisma.subscriptionSchedule.findUnique({
      where: { id },
    });

    if (!sub) {
      throw new NotFoundException(`Subscription schedule '${id}' not found`);
    }

    if (sub.status === 'CANCELLED') {
      throw new BadRequestException(`Subscription is already CANCELLED.`);
    }

    const cancellationDate = new Date();

    const updated = await this.prisma.subscriptionSchedule.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancellationDate,
      },
      include: { product: true, plan: true, quotation: { include: { customer: true } } },
    });

    await this.prisma.quotationAuditLog.create({
      data: {
        quotationId: sub.quotationId,
        userId: currentUser?.id,
        action: 'SUBSCRIPTION_CANCELLED',
        reason: `Subscription cancelled on ${cancellationDate.toISOString()}`,
      },
    });

    this.logger.log(`[SUBSCRIPTION] Subscription '${id}' CANCELLED`);
    return this.transformSubscription(updated);
  }

  // --- Background Recurring Billing Job ---
  async generateRecurringInvoices() {
    const now = new Date();

    const dueSubscriptions = await this.prisma.subscriptionSchedule.findMany({
      where: {
        status: 'ACTIVE',
        nextBillingDate: { lte: now },
      },
      include: {
        product: true,
        plan: true,
        quotation: true,
      },
    });

    const generatedInvoices: any[] = [];
    const year = now.getFullYear();

    for (const sub of dueSubscriptions) {
      const periodStart = sub.nextBillingDate || now;
      const periodEnd = new Date(periodStart);

      if (sub.billingCycle === SubscriptionInterval.YEARLY) {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else if (sub.billingCycle === SubscriptionInterval.QUARTERLY) {
        periodEnd.setMonth(periodEnd.getMonth() + 3);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      const idempotencyKey = `${sub.id}:${periodStart.toISOString().split('T')[0]}:${periodEnd.toISOString().split('T')[0]}`;

      // Idempotency Check: Prevent duplicate recurring invoice for same period!
      const existingInvoice = await this.prisma.invoice.findUnique({
        where: { idempotencyKey },
      });

      if (existingInvoice) {
        this.logger.warn(`[RECURRING BILLING] Skipping duplicate invoice for subscription ${sub.id}, key=${idempotencyKey}`);
        continue;
      }

      const unitPrice = Number(sub.unitPrice);
      const qty = sub.quantity;
      const amount = unitPrice * qty;

      const invoiceCount = await this.prisma.invoice.count();
      const invoiceNumber = `INV-REC-${year}-${String(invoiceCount + 1).padStart(4, '0')}`;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 15); // 15 day terms for recurring cycle

      const invoice = await this.prisma.$transaction(async (tx) => {
        const createdInvoice = await tx.invoice.create({
          data: {
            quotationId: sub.quotationId,
            customerId: sub.quotation.customerId,
            subscriptionScheduleId: sub.id,
            invoiceNumber,
            invoiceType: InvoiceType.RECURRING_CYCLE,
            subtotal: amount,
            discountTotal: 0,
            taxTotal: 0,
            amount,
            paidAmount: 0,
            remainingBalance: amount,
            currency: sub.currency || 'INR',
            status: InvoiceStatus.UNPAID,
            dueDate,
            billingPeriodStart: periodStart,
            billingPeriodEnd: periodEnd,
            idempotencyKey,
            lines: {
              create: [
                {
                  productId: sub.productId,
                  description: `${sub.product.name} Subscription (${sub.billingCycle})`,
                  quantity: qty,
                  unitPrice,
                  discountAmount: 0,
                  taxAmount: 0,
                  totalAmount: amount,
                  lineType: LineType.RECURRING,
                },
              ],
            },
          },
          include: {
            customer: true,
            quotation: true,
            lines: true,
          },
        });

        // Advance Next Billing Date
        await tx.subscriptionSchedule.update({
          where: { id: sub.id },
          data: {
            nextBillingDate: periodEnd,
            billingPeriodStart: periodStart,
            billingPeriodEnd: periodEnd,
          },
        });

        await tx.quotationAuditLog.create({
          data: {
            quotationId: sub.quotationId,
            action: 'RECURRING_INVOICE_GENERATED',
            reason: `Automated recurring invoice '${createdInvoice.invoiceNumber}' generated for period ${periodStart.toISOString().split('T')[0]} to ${periodEnd.toISOString().split('T')[0]}`,
          },
        });

        return createdInvoice;
      });

      generatedInvoices.push(invoice);
      this.logger.log(`[RECURRING BILLING] Generated recurring invoice ${invoice.invoiceNumber} for Subscription ${sub.id}`);
    }

    return {
      message: `Processed ${dueSubscriptions.length} subscriptions. Generated ${generatedInvoices.length} recurring invoices.`,
      generatedInvoicesCount: generatedInvoices.length,
      invoices: generatedInvoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        amount: Number(inv.amount),
        currency: inv.currency,
      })),
    };
  }
}
