import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import {
  InvoiceStatus,
  InvoiceType,
  LineType,
  ProductType,
  QuotationStatus,
  SubscriptionInterval,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { QueryInvoicesDto } from './dto/query-invoices.dto';
import { DealHealthService } from '../deal-health/deal-health.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, NotificationPriority } from '@prisma/client';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => DealHealthService))
    private readonly dealHealthService: DealHealthService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async generateInvoiceNumber(type: InvoiceType): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.invoice.count();
    const prefix = type === InvoiceType.RECURRING_CYCLE ? 'INV-REC' : 'INV';
    return `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  private isRecurringLine(line: any): boolean {
    if (line.lineType === LineType.RECURRING) return true;
    if (line.product) {
      const pt = line.product.productType;
      return pt === ProductType.SUBSCRIPTION || pt === ProductType.SUBSCRIPTIONS;
    }
    return false;
  }

  private transformInvoiceLine(l: any) {
    return {
      id: l.id,
      invoiceId: l.invoiceId,
      productId: l.productId,
      description: l.description,
      quantity: l.quantity,
      unitPrice: Number(l.unitPrice),
      discountAmount: Number(l.discountAmount),
      taxAmount: Number(l.taxAmount),
      totalAmount: Number(l.totalAmount),
      lineType: l.lineType,
      createdAt: l.createdAt,
      product: l.product
        ? {
            id: l.product.id,
            name: l.product.name,
            sku: l.product.sku,
          }
        : undefined,
    };
  }

  private transformPayment(p: any) {
    return {
      id: p.id,
      invoiceId: p.invoiceId,
      amount: Number(p.amount),
      currency: p.currency || 'INR',
      paymentMethod: p.paymentMethod,
      gateway: p.gateway || 'MANUAL',
      gatewayOrderId: p.gatewayOrderId,
      gatewayPaymentId: p.gatewayPaymentId,
      status: p.status || 'SUCCESS',
      reference: p.reference,
      notes: p.notes,
      createdBy: p.createdBy,
      transactionDate: p.transactionDate,
      createdAt: p.createdAt,
    };
  }

  public transformInvoice(inv: any) {
    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      quotationId: inv.quotationId,
      customerId: inv.customerId,
      subscriptionScheduleId: inv.subscriptionScheduleId,
      invoiceType: inv.invoiceType,
      subtotal: Number(inv.subtotal),
      discountTotal: Number(inv.discountTotal),
      taxTotal: Number(inv.taxTotal),
      amount: Number(inv.amount),
      paidAmount: Number(inv.paidAmount || 0),
      remainingBalance: Number(inv.remainingBalance ?? inv.amount),
      currency: inv.currency || 'INR',
      status: inv.status,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      billingPeriodStart: inv.billingPeriodStart,
      billingPeriodEnd: inv.billingPeriodEnd,
      idempotencyKey: inv.idempotencyKey,
      createdAt: inv.createdAt,
      customer: inv.customer
        ? {
            id: inv.customer.id,
            name: inv.customer.name,
            companyName: inv.customer.companyName,
            contactEmail: inv.customer.contactEmail,
            tier: inv.customer.tier,
          }
        : undefined,
      quotation: inv.quotation
        ? {
            id: inv.quotation.id,
            quoteNumber: inv.quotation.quoteNumber,
          }
        : undefined,
      lines: inv.lines ? inv.lines.map((l: any) => this.transformInvoiceLine(l)) : [],
      payments: inv.payments ? inv.payments.map((p: any) => this.transformPayment(p)) : [],
    };
  }

  // --- Core Billing Engine: Process Confirmed Quotation ---
  async processConfirmedQuotation(quotationId: string, externalTx?: any) {
    const execute = async (tx: any) => {
      const quotation = await tx.quotation.findUnique({
        where: { id: quotationId },
        include: {
          customer: true,
          lines: {
            include: {
              product: true,
              subscriptionPlan: true,
            },
          },
        },
      });

      if (!quotation) {
        throw new NotFoundException(`Quotation '${quotationId}' not found`);
      }

      const oneTimeLines: any[] = [];
      const recurringLines: any[] = [];

      for (const line of quotation.lines) {
        if (this.isRecurringLine(line)) {
          recurringLines.push(line);
        } else {
          oneTimeLines.push(line);
        }
      }

      const results: { invoice?: any; subscriptions: any[] } = {
        subscriptions: [],
      };

      // 1. Process One-Time Lines -> Generate One-Time Invoice
      if (oneTimeLines.length > 0) {
        const existingOneTimeInvoice = await tx.invoice.findFirst({
          where: {
            quotationId,
            invoiceType: InvoiceType.ONE_TIME,
          },
        });

        if (!existingOneTimeInvoice) {
          let subtotal = 0;
          let discountTotal = 0;
          let taxTotal = 0;
          let totalAmount = 0;

          const invoiceLinesData: any[] = [];

          for (const line of oneTimeLines) {
            const unitPrice = Number(line.unitPrice);
            const qty = line.quantity;
            const lineSubtotal = unitPrice * qty;
            const lineDiscount = Number(line.discountAmount);
            const lineTax = Number(line.taxAmount);
            const lineTotal = Number(line.finalUnitPrice);

            subtotal += lineSubtotal;
            discountTotal += lineDiscount;
            taxTotal += lineTax;
            totalAmount += lineTotal;

            invoiceLinesData.push({
              productId: line.productId,
              description: line.product?.name || 'One-Time Product',
              quantity: qty,
              unitPrice,
              discountAmount: lineDiscount,
              taxAmount: lineTax,
              totalAmount: lineTotal,
              lineType: LineType.ONE_TIME,
            });
          }

          const invoiceNumber = await this.generateInvoiceNumber(InvoiceType.ONE_TIME);
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 30); // 30-day payment term

          const invoice = await tx.invoice.create({
            data: {
              quotationId,
              customerId: quotation.customerId,
              invoiceNumber,
              invoiceType: InvoiceType.ONE_TIME,
              subtotal,
              discountTotal,
              taxTotal,
              amount: totalAmount,
              paidAmount: 0,
              remainingBalance: totalAmount,
              currency: quotation.currency || 'INR',
              status: InvoiceStatus.UNPAID,
              dueDate,
              lines: {
                create: invoiceLinesData,
              },
            },
            include: {
              customer: true,
              quotation: true,
              lines: { include: { product: true } },
              payments: true,
            },
          });

          results.invoice = invoice;

          await tx.quotationAuditLog.create({
            data: {
              quotationId,
              action: 'INVOICE_GENERATED',
              reason: `One-time invoice '${invoice.invoiceNumber}' generated for amount ${quotation.currency} ${totalAmount}`,
            },
          });

          this.logger.log(`[BILLING] One-Time Invoice ${invoice.invoiceNumber} generated for Quote ${quotation.quoteNumber}`);
        }
      }

      // 2. Process Recurring Lines -> Create SubscriptionSchedules
      for (const line of recurringLines) {
        const existingSchedule = await tx.subscriptionSchedule.findFirst({
          where: {
            quotationId,
            quotationLineId: line.id,
          },
        });

        if (!existingSchedule) {
          // Resolve Plan or fallback
          let plan = line.subscriptionPlan;
          if (!plan && line.subscriptionPlanId) {
            plan = await tx.subscriptionPlan.findUnique({
              where: { id: line.subscriptionPlanId },
            });
          }
          if (!plan) {
            plan = await tx.subscriptionPlan.findFirst({
              where: { interval: SubscriptionInterval.MONTHLY, isActive: true },
            });
            if (!plan) {
              plan = await tx.subscriptionPlan.create({
                data: {
                  name: 'Standard Monthly Subscription',
                  interval: SubscriptionInterval.MONTHLY,
                  prorationPolicy: 'EXACT_DAY_PRO_RATA',
                  refundPolicy: 'PARTIAL_CREDIT_NOTE',
                  isActive: true,
                },
              });
            }
          }

          const billingInterval = plan?.interval || SubscriptionInterval.MONTHLY;
          const startDate = new Date();
          const nextBillingDate = new Date(startDate);

          if (billingInterval === SubscriptionInterval.YEARLY) {
            nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
          } else if (billingInterval === SubscriptionInterval.QUARTERLY) {
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 3);
          } else {
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
          }

          const schedule = await tx.subscriptionSchedule.create({
            data: {
              quotationId,
              quotationLineId: line.id,
              customerId: quotation.customerId,
              productId: line.productId,
              planId: plan.id,
              billingCycle: billingInterval,
              startDate,
              nextBillingDate,
              billingPeriodStart: startDate,
              billingPeriodEnd: nextBillingDate,
              unitPrice: Number(line.finalUnitPrice),
              quantity: line.quantity,
              currency: quotation.currency || 'INR',
              status: 'ACTIVE',
            },
            include: {
              product: true,
              plan: true,
            },
          });

          results.subscriptions.push(schedule);

          await tx.quotationAuditLog.create({
            data: {
              quotationId,
              action: 'SUBSCRIPTION_CREATED',
              reason: `Subscription schedule created for '${line.product?.name || 'Product'}' (${schedule.currency} ${schedule.unitPrice}/${schedule.billingCycle?.toLowerCase() || 'monthly'})`,
            },
          });

          this.logger.log(`[BILLING] Subscription schedule created for Quote ${quotation.quoteNumber}, Product ${line.productId}`);
        }
      }

      return results;
    };

    const res = externalTx ? await execute(externalTx) : await this.prisma.$transaction(execute);

    if (res.invoice) {
      this.prisma.user
        .findFirst({ where: { customerId: res.invoice.customerId, role: UserRole.CUSTOMER } })
        .then((custUser) => {
          if (custUser) {
            this.notificationsService
              .createNotification({
                userId: custUser.id,
                type: NotificationType.INVOICE_GENERATED,
                title: 'Invoice Generated',
                message: `Invoice ${res.invoice.invoiceNumber} for amount ${res.invoice.currency} ${res.invoice.amount} has been generated.`,
                priority: NotificationPriority.NORMAL,
                entityType: 'invoice',
                entityId: res.invoice.id,
                deduplicationKey: `INVOICE_GENERATED_${res.invoice.id}`,
              })
              .catch(() => {});
          }
        })
        .catch(() => {});
    }

    if (res.subscriptions && res.subscriptions.length > 0) {
      for (const sub of res.subscriptions) {
        this.prisma.user
          .findFirst({ where: { customerId: sub.customerId, role: UserRole.CUSTOMER } })
          .then((custUser) => {
            if (custUser) {
              this.notificationsService
                .createNotification({
                  userId: custUser.id,
                  type: NotificationType.SUBSCRIPTION_CREATED,
                  title: 'Subscription Activated',
                  message: `Subscription active (${sub.currency} ${sub.unitPrice}/${sub.billingCycle?.toLowerCase()}).`,
                  priority: NotificationPriority.NORMAL,
                  entityType: 'subscription',
                  entityId: sub.id,
                  deduplicationKey: `SUBSCRIPTION_CREATED_${sub.id}`,
                })
                .catch(() => {});
            }
          })
          .catch(() => {});
      }
    }

    return res;
  }

  // --- Manual Payment Recording ---
  async recordPayment(invoiceId: string, dto: RecordPaymentDto, currentUser?: any) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true, quotation: true, payments: true },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID '${invoiceId}' not found`);
    }

    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestException(`Cannot record payment for CANCELLED invoice '${invoice.invoiceNumber}'`);
    }

    const currentRemaining = Number(invoice.remainingBalance ?? invoice.amount);

    if (currentRemaining <= 0 || invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException(`Invoice '${invoice.invoiceNumber}' is already fully PAID.`);
    }

    const paymentAmount = Number(dto.amount);
    if (!paymentAmount || paymentAmount <= 0) {
      throw new BadRequestException('Payment amount must be greater than 0.');
    }

    if (paymentAmount > currentRemaining) {
      throw new BadRequestException(
        `Payment amount (${invoice.currency} ${paymentAmount}) exceeds remaining invoice balance (${invoice.currency} ${currentRemaining}).`,
      );
    }

    const newPaidAmount = Number(invoice.paidAmount || 0) + paymentAmount;
    const newRemainingBalance = Number(invoice.amount) - newPaidAmount;
    const newStatus = newRemainingBalance <= 0.01 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;

    const payment = await this.prisma.$transaction(async (tx) => {
      const createdPayment = await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: paymentAmount,
          currency: invoice.currency || 'INR',
          paymentMethod: dto.paymentMethod || 'BANK_TRANSFER',
          gateway: dto.gateway || 'MANUAL',
          reference: dto.reference?.trim() || null,
          notes: dto.notes?.trim() || null,
          createdBy: currentUser?.name || currentUser?.email || 'System',
          status: 'SUCCESS',
        },
      });

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: newPaidAmount,
          remainingBalance: Math.max(0, newRemainingBalance),
          status: newStatus,
        },
      });

      if (invoice.quotationId) {
        await tx.quotationAuditLog.create({
          data: {
            quotationId: invoice.quotationId,
            userId: currentUser?.id,
            action: newStatus === InvoiceStatus.PAID ? 'INVOICE_PAID' : 'PARTIAL_PAYMENT_RECORDED',
            reason: `Payment of ${invoice.currency} ${paymentAmount} recorded for Invoice ${invoice.invoiceNumber}. New status: ${newStatus}`,
          },
        });
      }

      return createdPayment;
    });

    this.logger.log(`[BILLING] Payment of ${invoice.currency} ${paymentAmount} recorded for Invoice ${invoice.invoiceNumber}`);

    if (invoice.quotationId) {
      this.dealHealthService
        .recalculateQuotationHealth(invoice.quotationId)
        .catch((err) =>
          this.logger.error(
            `Failed to recalculate deal health after payment for quotation ${invoice.quotationId}: ${err.message}`,
          ),
        );
    }

    // Side Effect Notifications
    // 1. Customer User
    this.prisma.user
      .findFirst({ where: { customerId: invoice.customerId, role: UserRole.CUSTOMER } })
      .then((custUser) => {
        if (custUser) {
          this.notificationsService
            .createNotification({
              userId: custUser.id,
              type: NotificationType.PAYMENT_SUCCESS,
              title: 'Payment Successful',
              message: `Payment of ${invoice.currency} ${paymentAmount} for invoice ${invoice.invoiceNumber} recorded successfully.`,
              priority: NotificationPriority.NORMAL,
              entityType: 'invoice',
              entityId: invoice.id,
              deduplicationKey: `PAYMENT_SUCCESS_${payment.id}_CUST`,
            })
            .catch(() => {});
        }
      })
      .catch(() => {});

    // 2. Finance users
    this.notificationsService
      .notifyRoles([UserRole.FINANCE], {
        type: NotificationType.PAYMENT_SUCCESS,
        title: 'Payment Received',
        message: `Payment of ${invoice.currency} ${paymentAmount} received for Invoice ${invoice.invoiceNumber}.`,
        priority: NotificationPriority.NORMAL,
        entityType: 'invoice',
        entityId: invoice.id,
        deduplicationKey: `PAYMENT_SUCCESS_${payment.id}_FIN`,
      })
      .catch(() => {});

    // 3. Sales Rep
    if (invoice.quotation?.salesRepId) {
      this.notificationsService
        .createNotification({
          userId: invoice.quotation.salesRepId,
          type: NotificationType.PAYMENT_SUCCESS,
          title: 'Payment Received',
          message: `Payment of ${invoice.currency} ${paymentAmount} received for Invoice ${invoice.invoiceNumber} (Quote ${invoice.quotation.quoteNumber}).`,
          priority: NotificationPriority.NORMAL,
          entityType: 'invoice',
          entityId: invoice.id,
          deduplicationKey: `PAYMENT_SUCCESS_${payment.id}_REP`,
        })
        .catch(() => {});
    }

    return {
      message: `Payment of ${invoice.currency} ${paymentAmount} recorded successfully`,
      invoiceStatus: newStatus,
      payment: this.transformPayment(payment),
      updatedInvoice: await this.findInvoiceById(invoiceId),
    };
  }

  // --- Query All Invoices ---
  async findAllInvoices(query: QueryInvoicesDto, currentUser?: any) {
    const { search, invoiceType, status, customerId, page = 1, limit = 20 } = query;
    const cappedLimit = Math.min(Math.max(1, limit), 100);
    const skip = (Math.max(1, page) - 1) * cappedLimit;

    const where: any = {};

    if (currentUser?.role === UserRole.CUSTOMER) {
      if (!currentUser.customerId) {
        return { data: [], meta: { total: 0, page: 1, limit: cappedLimit, totalPages: 1 } };
      }
      where.customerId = currentUser.customerId;
    } else if (customerId) {
      where.customerId = customerId;
    }

    if (invoiceType) where.invoiceType = invoiceType;
    if (status) where.status = status;

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { invoiceNumber: { contains: q, mode: 'insensitive' } },
        { customer: { companyName: { contains: q, mode: 'insensitive' } } },
        { quotation: { quoteNumber: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        include: {
          customer: true,
          quotation: true,
          lines: { include: { product: true } },
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: cappedLimit,
      }),
    ]);

    return {
      data: items.map((inv) => this.transformInvoice(inv)),
      meta: {
        total,
        page,
        limit: cappedLimit,
        totalPages: Math.ceil(total / cappedLimit) || 1,
      },
    };
  }

  // --- Find Invoice By ID ---
  async findInvoiceById(id: string, currentUser?: any) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        quotation: true,
        subscriptionSchedule: { include: { plan: true, product: true } },
        lines: { include: { product: true } },
        payments: { orderBy: { transactionDate: 'desc' } },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID '${id}' not found`);
    }

    if (currentUser?.role === UserRole.CUSTOMER) {
      if (invoice.customerId !== currentUser.customerId) {
        throw new NotFoundException(`Invoice with ID '${id}' not found`);
      }
    }

    return this.transformInvoice(invoice);
  }

  // --- Finance Metrics for Dashboard ---
  async getFinanceMetrics() {
    const invoices = await this.prisma.invoice.findMany();
    const activeSubs = await this.prisma.subscriptionSchedule.findMany({
      where: { status: 'ACTIVE' },
    });

    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let totalOverdue = 0;
    let monthlyRecurringRevenue = 0;

    const now = new Date();

    for (const inv of invoices) {
      const amt = Number(inv.amount);
      const paid = Number(inv.paidAmount || 0);
      const rem = Number(inv.remainingBalance ?? amt);

      totalInvoiced += amt;
      totalPaid += paid;

      if (inv.status !== InvoiceStatus.PAID && inv.status !== InvoiceStatus.CANCELLED) {
        totalPending += rem;
        if (inv.dueDate && new Date(inv.dueDate) < now) {
          totalOverdue += rem;
        }
      }
    }

    for (const sub of activeSubs) {
      const price = Number(sub.unitPrice) * sub.quantity;
      if (sub.billingCycle === SubscriptionInterval.YEARLY) {
        monthlyRecurringRevenue += price / 12;
      } else {
        monthlyRecurringRevenue += price;
      }
    }

    return {
      totalInvoiced,
      totalPaid,
      totalPending,
      totalOverdue,
      monthlyRecurringRevenue,
      activeSubscriptionsCount: activeSubs.length,
      totalInvoicesCount: invoices.length,
    };
  }
}
