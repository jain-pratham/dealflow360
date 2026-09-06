import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ApprovalRoleRequired,
  ApprovalStatus,
  LineType,
  NotificationPriority,
  NotificationType,
  ProductType,
  QuotationStatus,
  UserRole,
} from '@prisma/client';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PriceListsService } from '../price-lists/price-lists.service';
import { DiscountRulesService } from '../discount-rules/discount-rules.service';
import { MailService } from '../mail/mail.service';
import { DealHealthService } from '../deal-health/deal-health.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { AddQuotationLineDto } from './dto/add-quotation-line.dto';
import { UpdateQuotationLineDto } from './dto/update-quotation-line.dto';
import { QueryQuotationsDto } from './dto/query-quotations.dto';

@Injectable()
export class QuotationsService {
  private readonly logger = new Logger(QuotationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly priceListsService: PriceListsService,
    private readonly discountRulesService: DiscountRulesService,
    private readonly mailService: MailService,
    private readonly dealHealthService: DealHealthService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async generateQuoteNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.quotation.count();
    return `QT-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  private calculateLineTotals(
    unitPrice: number,
    quantity: number,
    discountPercent: number = 0,
    taxRate: number = 0,
  ) {
    const subtotal = unitPrice * quantity;
    const discountAmount = (subtotal * discountPercent) / 100;
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = (afterDiscount * taxRate) / 100;
    const finalTotal = afterDiscount + taxAmount;

    return {
      subtotal,
      discountAmount,
      taxAmount,
      finalTotal,
    };
  }

  private transformQuotationLine(l: any) {
    return {
      id: l.id,
      quotationId: l.quotationId,
      productId: l.productId,
      lineType: l.lineType || LineType.ONE_TIME,
      subscriptionPlanId: l.subscriptionPlanId,
      quantity: l.quantity,
      unitPrice: Number(l.unitPrice),
      costPrice: l.costPrice ? Number(l.costPrice) : undefined,
      discountPercent: Number(l.discountPercent),
      discountAmount: Number(l.discountAmount),
      taxRate: Number(l.taxRate),
      taxAmount: Number(l.taxAmount),
      subtotal: Number(l.subtotal),
      finalUnitPrice: Number(l.finalUnitPrice),
      product: l.product
        ? {
            id: l.product.id,
            name: l.product.name,
            sku: l.product.sku,
            category: l.product.productType,
            basePrice: Number(l.product.basePrice),
            currency: l.product.currency,
          }
        : undefined,
      subscriptionPlan: l.subscriptionPlan
        ? {
            id: l.subscriptionPlan.id,
            name: l.subscriptionPlan.name,
            interval: l.subscriptionPlan.interval,
            prorationPolicy: l.subscriptionPlan.prorationPolicy,
            refundPolicy: l.subscriptionPlan.refundPolicy,
          }
        : undefined,
    };
  }

  private transformQuotation(q: any) {
    return {
      id: q.id,
      quoteNumber: q.quoteNumber,
      customerId: q.customerId,
      salesRepId: q.salesRepId,
      status: q.status,
      currency: q.currency || 'INR',
      subtotalAmount: Number(q.subtotalAmount),
      discountTotal: Number(q.discountTotal),
      taxTotal: Number(q.taxTotal),
      totalAmount: Number(q.totalAmount),
      notes: q.notes,
      portalToken: q.portalToken,
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
      customer: q.customer
        ? {
            id: q.customer.id,
            companyName: q.customer.companyName,
            contactName: q.customer.name,
            email: q.customer.contactEmail,
            tier: q.customer.tier,
          }
        : undefined,
      salesRep: q.salesRep
        ? {
            id: q.salesRep.id,
            name: q.salesRep.name,
            email: q.salesRep.email,
          }
        : undefined,
      lines: q.lines ? q.lines.map((l: any) => this.transformQuotationLine(l)) : [],
      approvalRequests: q.approvalRequests
        ? q.approvalRequests.map((ar: any) => ({
            id: ar.id,
            approvalChainId: ar.approvalChainId,
            requiredRole: ar.requiredRole,
            requestedDiscount: ar.requestedDiscount ? Number(ar.requestedDiscount) : undefined,
            status: ar.status,
            reviewerId: ar.reviewerId,
            comments: ar.comments,
            createdAt: ar.createdAt,
            evaluatedAt: ar.evaluatedAt,
          }))
        : [],
      auditLogs: q.auditLogs
        ? q.auditLogs.map((al: any) => ({
            id: al.id,
            action: al.action,
            reason: al.reason,
            timestamp: al.timestamp,
          }))
        : [],
    };
  }

  private async recalculateQuotationTotals(tx: any, quotationId: string) {
    const lines = await tx.quotationLine.findMany({
      where: { quotationId },
    });

    let subtotalAmount = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    let totalAmount = 0;

    for (const line of lines) {
      const lineSubtotal = Number(line.unitPrice) * line.quantity;
      const lineDiscount = Number(line.discountAmount);
      const lineTax = Number(line.taxAmount);
      const lineFinal = Number(line.finalUnitPrice);

      subtotalAmount += lineSubtotal;
      discountTotal += lineDiscount;
      taxTotal += lineTax;
      totalAmount += lineFinal;
    }

    await tx.quotation.update({
      where: { id: quotationId },
      data: {
        subtotalAmount,
        discountTotal,
        taxTotal,
        totalAmount,
      },
    });
  }

  async findAll(query: QueryQuotationsDto, currentUser: any) {
    const { search, status, customerId, page = 1, limit = 20 } = query;
    const cappedLimit = Math.min(Math.max(1, limit), 100);
    const skip = (Math.max(1, page) - 1) * cappedLimit;

    const where: any = {};

    if (currentUser.role === UserRole.SALES_REP) {
      where.salesRepId = currentUser.id;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { quoteNumber: { contains: q, mode: 'insensitive' } },
        { customer: { companyName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    const [total, items] = await Promise.all([
      this.prisma.quotation.count({ where }),
      this.prisma.quotation.findMany({
        where,
        include: {
          customer: true,
          salesRep: true,
          lines: {
            include: { product: true },
          },
          approvalRequests: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: cappedLimit,
      }),
    ]);

    return {
      data: items.map((q) => this.transformQuotation(q)),
      meta: {
        total,
        page,
        limit: cappedLimit,
        totalPages: Math.ceil(total / cappedLimit) || 1,
      },
    };
  }

  async findOne(id: string) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        salesRep: true,
        lines: {
          include: { product: true },
        },
        approvalRequests: {
          orderBy: { createdAt: 'desc' },
        },
        auditLogs: {
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation with ID '${id}' not found`);
    }

    return this.transformQuotation(quotation);
  }

  async create(dto: CreateQuotationDto, currentUser: any) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID '${dto.customerId}' not found`);
    }

    if (!customer.isActive) {
      throw new BadRequestException(`Cannot create quotation for inactive customer '${customer.companyName}'`);
    }

    const quoteNumber = await this.generateQuoteNumber();
    const currency = dto.currency || customer.currency || 'INR';

    const created = await this.prisma.$transaction(async (tx) => {
      const quotation = await tx.quotation.create({
        data: {
          quoteNumber,
          customerId: customer.id,
          salesRepId: currentUser.id,
          currency,
          notes: dto.notes?.trim() || null,
          status: QuotationStatus.DRAFT,
        },
      });

      if (dto.lines && dto.lines.length > 0) {
        for (const lineDto of dto.lines) {
          const product = await tx.product.findUnique({
            where: { id: lineDto.productId },
          });

          if (!product || !product.isActive) {
            throw new BadRequestException(
              `Product '${lineDto.productId}' does not exist or is inactive`,
            );
          }

          const isProductRecurring =
            product.productType === ProductType.SUBSCRIPTION ||
            product.productType === ProductType.SUBSCRIPTIONS;
          const lineType =
            lineDto.lineType || (isProductRecurring ? LineType.RECURRING : LineType.ONE_TIME);

          let subscriptionPlanId: string | null = null;
          if (lineType === LineType.RECURRING) {
            if (!lineDto.subscriptionPlanId) {
              throw new BadRequestException(
                `Recurring product '${product.name}' requires a valid active subscription plan.`,
              );
            }
            const plan = await tx.subscriptionPlan.findUnique({
              where: { id: lineDto.subscriptionPlanId },
            });
            if (!plan || !plan.isActive) {
              throw new BadRequestException(
                `Selected subscription plan '${lineDto.subscriptionPlanId}' is invalid or inactive.`,
              );
            }
            subscriptionPlanId = plan.id;
          }

          // Resolve applicable Price List price
          const priceRes = await this.priceListsService.resolveProductPrice(
            product.id,
            customer.tier,
            currency,
          );

          const unitPrice = priceRes.price;
          const taxRate = Number(product.taxRate || 0);
          const discountPercent = lineDto.discountPercent || 0;

          const totals = this.calculateLineTotals(
            unitPrice,
            lineDto.quantity,
            discountPercent,
            taxRate,
          );

          await tx.quotationLine.create({
            data: {
              quotationId: quotation.id,
              productId: product.id,
              lineType,
              subscriptionPlanId,
              quantity: lineDto.quantity,
              unitPrice,
              costPrice: product.costPrice ? Number(product.costPrice) : null,
              discountPercent,
              discountAmount: totals.discountAmount,
              taxRate,
              taxAmount: totals.taxAmount,
              subtotal: totals.subtotal,
              finalUnitPrice: totals.finalTotal,
            },
          });
        }

        await this.recalculateQuotationTotals(tx, quotation.id);
      }

      // Create Audit Log
      await tx.quotationAuditLog.create({
        data: {
          quotationId: quotation.id,
          userId: currentUser.id,
          action: 'CREATED',
          reason: `Quotation created by ${currentUser.name}`,
        },
      });

      return tx.quotation.findUnique({
        where: { id: quotation.id },
        include: {
          customer: true,
          salesRep: true,
          lines: { include: { product: true } },
          approvalRequests: true,
        },
      });
    });

    this.logger.log(`[AUDIT] Quotation created: ID=${created?.id}, QuoteNumber=${created?.quoteNumber}`);
    
    if (created) {
      this.dealHealthService.recalculateQuotationHealth(created.id).catch(e => this.logger.error('Deal health recalculation failed', e));
    }

    return this.transformQuotation(created);
  }

  async addLine(quotationId: string, dto: AddQuotationLineDto, currentUser: any) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      include: { customer: true },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation with ID '${quotationId}' not found`);
    }

    if (quotation.status !== QuotationStatus.DRAFT) {
      throw new BadRequestException(
        `Cannot modify lines for quotation in status '${quotation.status}'. Only DRAFT quotations can be modified.`,
      );
    }

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product || !product.isActive) {
      throw new BadRequestException('Selected product is invalid or inactive');
    }

    const isProductRecurring =
      product.productType === ProductType.SUBSCRIPTION ||
      product.productType === ProductType.SUBSCRIPTIONS;
    const lineType =
      dto.lineType || (isProductRecurring ? LineType.RECURRING : LineType.ONE_TIME);

    let subscriptionPlanId: string | null = null;
    if (lineType === LineType.RECURRING) {
      if (!dto.subscriptionPlanId) {
        throw new BadRequestException(
          `Recurring product '${product.name}' requires a valid active subscription plan.`,
        );
      }
      const plan = await this.prisma.subscriptionPlan.findUnique({
        where: { id: dto.subscriptionPlanId },
      });
      if (!plan || !plan.isActive) {
        throw new BadRequestException(
          `Selected subscription plan '${dto.subscriptionPlanId}' is invalid or inactive.`,
        );
      }
      subscriptionPlanId = plan.id;
    }

    const priceRes = await this.priceListsService.resolveProductPrice(
      product.id,
      quotation.customer.tier,
      quotation.currency,
    );

    const unitPrice = priceRes.price;
    const taxRate = Number(product.taxRate || 0);
    const discountPercent = dto.discountPercent || 0;

    const totals = this.calculateLineTotals(
      unitPrice,
      dto.quantity,
      discountPercent,
      taxRate,
    );

    const createdLine = await this.prisma.$transaction(async (tx) => {
      const line = await tx.quotationLine.create({
        data: {
          quotationId,
          productId: product.id,
          lineType,
          subscriptionPlanId,
          quantity: dto.quantity,
          unitPrice,
          costPrice: product.costPrice ? Number(product.costPrice) : null,
          discountPercent,
          discountAmount: totals.discountAmount,
          taxRate,
          taxAmount: totals.taxAmount,
          subtotal: totals.subtotal,
          finalUnitPrice: totals.finalTotal,
        },
      });

      await this.recalculateQuotationTotals(tx, quotationId);
      return line;
    });

    this.logger.log(`[AUDIT] Line ${createdLine?.id} added to Quotation ${quotationId}`);

    if (createdLine) {
      this.dealHealthService.recalculateQuotationHealth(quotationId).catch(e => this.logger.error('Deal health recalculation failed', e));
    }

    return this.findOne(quotationId);
  }

  async updateLine(
    quotationId: string,
    lineId: string,
    dto: UpdateQuotationLineDto,
    currentUser: any,
  ) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation with ID '${quotationId}' not found`);
    }

    if (quotation.status !== QuotationStatus.DRAFT) {
      throw new BadRequestException(
        `Cannot modify lines for quotation in status '${quotation.status}'`,
      );
    }

    const line = await this.prisma.quotationLine.findFirst({
      where: { id: lineId, quotationId },
    });

    if (!line) {
      throw new NotFoundException(`Quotation line with ID '${lineId}' not found`);
    }

    const quantity = dto.quantity !== undefined ? dto.quantity : line.quantity;
    const discountPercent =
      dto.discountPercent !== undefined ? dto.discountPercent : Number(line.discountPercent);

    const unitPrice = Number(line.unitPrice);
    const taxRate = Number(line.taxRate);

    const totals = this.calculateLineTotals(unitPrice, quantity, discountPercent, taxRate);

    await this.prisma.$transaction(async (tx) => {
      await tx.quotationLine.update({
        where: { id: lineId },
        data: {
          quantity,
          discountPercent,
          discountAmount: totals.discountAmount,
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          finalUnitPrice: totals.finalTotal,
        },
      });

      await this.recalculateQuotationTotals(tx, quotationId);
    });
    
    this.dealHealthService.recalculateQuotationHealth(quotationId).catch(e => this.logger.error('Deal health recalculation failed', e));

    return this.findOne(quotationId);
  }

  async removeLine(quotationId: string, lineId: string, currentUser: any) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation with ID '${quotationId}' not found`);
    }

    if (quotation.status !== QuotationStatus.DRAFT) {
      throw new BadRequestException(
        `Cannot remove lines for quotation in status '${quotation.status}'`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.quotationLine.delete({
        where: { id: lineId },
      });

      await this.recalculateQuotationTotals(tx, quotationId);
    });

    this.dealHealthService.recalculateQuotationHealth(quotationId).catch(e => this.logger.error('Deal health recalculation failed', e));

    return this.findOne(quotationId);
  }

  // --- SUBMIT QUOTATION & DISCOUNT GOVERNANCE CHECK ---

  async submit(quotationId: string, currentUser: any) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        customer: true,
        lines: { include: { product: true } },
      },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation with ID '${quotationId}' not found`);
    }

    if (quotation.lines.length === 0) {
      throw new BadRequestException('Cannot submit quotation with no products');
    }

    const customerTier = quotation.customer.tier;
    let requiresApproval = false;
    let requiredRole: ApprovalRoleRequired = ApprovalRoleRequired.SALES_MANAGER;
    let maxRequestedDiscount = 0;

    // Evaluate each line against Discount Governance Rules
    for (const line of quotation.lines) {
      const discount = Number(line.discountPercent);
      if (discount > 0) {
        const evalRes = await this.discountRulesService.evaluateDiscount(
          customerTier,
          line.product.productType,
          discount,
        );

        if (!evalRes.allowed) {
          throw new BadRequestException(evalRes.reason);
        }

        if (evalRes.requiresApproval) {
          requiresApproval = true;
          if (discount > maxRequestedDiscount) {
            maxRequestedDiscount = discount;
          }
          if (evalRes.approvalRole === ApprovalRoleRequired.FINANCE) {
            requiredRole = ApprovalRoleRequired.FINANCE;
          }
        }
      }
    }

    let activeApprovalChainId: string | null = null;
    if (requiresApproval) {
      const activeChain = await this.prisma.approvalChain.findFirst({
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

    const updatedQuotation = await this.prisma.$transaction(async (tx) => {
      if (requiresApproval) {
        // Create Approval Request
        const approvalRequest = await tx.approvalRequest.create({
          data: {
            quotationId: quotation.id,
            approvalChainId: activeApprovalChainId,
            requiredRole,
            requestedDiscount: maxRequestedDiscount,
            status: ApprovalStatus.PENDING,
          },
        });

        await tx.quotation.update({
          where: { id: quotation.id },
          data: { status: QuotationStatus.PENDING_APPROVAL },
        });

        await tx.quotationAuditLog.create({
          data: {
            quotationId: quotation.id,
            userId: currentUser.id,
            action: 'SUBMITTED_FOR_APPROVAL',
            reason: `Discount of ${maxRequestedDiscount}% requires ${requiredRole} approval`,
          },
        });

        this.logger.log(
          `[AUDIT] Quotation ${quotation.quoteNumber} submitted -> PENDING_APPROVAL (${requiredRole})`,
        );
      } else {
        // Auto-Approved
        await tx.quotation.update({
          where: { id: quotation.id },
          data: { status: QuotationStatus.APPROVED },
        });

        await tx.quotationAuditLog.create({
          data: {
            quotationId: quotation.id,
            userId: currentUser.id,
            action: 'APPROVED_AUTOMATICALLY',
            reason: 'All requested discounts within standard threshold',
          },
        });

        this.logger.log(`[AUDIT] Quotation ${quotation.quoteNumber} submitted -> APPROVED`);
      }

      return tx.quotation.findUnique({
        where: { id: quotation.id },
        include: {
          customer: true,
          salesRep: true,
          lines: { include: { product: true } },
          approvalRequests: { include: { approvalChain: true, reviewer: true } },
          auditLogs: { include: { user: true }, orderBy: { timestamp: 'desc' } },
        },
      });
    });

    // Notify Reviewers (Target Role + ADMIN) of Pending Approval
    if (requiresApproval && requiredRole) {
      const targetRole = requiredRole === 'FINANCE' ? UserRole.FINANCE : UserRole.SALES_MANAGER;
      this.prisma.user.findMany({
        where: { role: { in: [targetRole, UserRole.ADMIN] }, isActive: true },
        select: { id: true, role: true },
      }).then((reviewers) => {
        const reviewerIds = reviewers.map((r) => r.id);
        if (reviewerIds.length > 0) {
          this.notificationsService.createNotificationForMultipleUsers(reviewerIds, {
            type: NotificationType.APPROVAL_REQUESTED,
            title: `Approval Required: ${quotation.quoteNumber}`,
            message: `Quotation ${quotation.quoteNumber} requires ${requiredRole} approval for ${maxRequestedDiscount}% discount.`,
            entityType: 'QUOTATION',
            entityId: quotation.id,
            priority: NotificationPriority.HIGH,
            deduplicationKey: `APPROVAL_REQ_${quotation.id}_${requiredRole}`,
            metadata: { url: targetRole === UserRole.FINANCE ? '/finance/approval-queue' : '/manager/approval-queue' },
          }).catch((e) => this.logger.error('Failed to dispatch approval request notifications', e));
        }
      }).catch((e) => this.logger.error('Failed to query reviewers for approval notification', e));

      // Notify Sales Rep who submitted
      this.notificationsService.createNotification({
        userId: currentUser.id,
        type: NotificationType.QUOTATION_SENT,
        title: `Submitted for Approval: ${quotation.quoteNumber}`,
        message: `Quotation ${quotation.quoteNumber} submitted for ${requiredRole} approval.`,
        entityType: 'QUOTATION',
        entityId: quotation.id,
        priority: NotificationPriority.NORMAL,
        deduplicationKey: `QUOTATION_SUBMITTED_REP_${quotation.id}`,
        metadata: { url: `/sales/quotations` },
      }).catch(() => {});
    } else {
      // Auto-approved notification for Sales Rep
      this.notificationsService.createNotification({
        userId: currentUser.id,
        type: NotificationType.APPROVAL_APPROVED,
        title: `Quotation Approved: ${quotation.quoteNumber}`,
        message: `Quotation ${quotation.quoteNumber} approved automatically (discounts within standard threshold).`,
        entityType: 'QUOTATION',
        entityId: quotation.id,
        priority: NotificationPriority.NORMAL,
        deduplicationKey: `QUOTATION_AUTO_APPROVED_${quotation.id}`,
        metadata: { url: `/sales/quotations` },
      }).catch(() => {});

      // Notify Admins of Auto-Approval
      this.notificationsService.notifyAdmins({
        type: NotificationType.APPROVAL_APPROVED,
        title: `Quotation Auto-Approved: ${quotation.quoteNumber}`,
        message: `Quotation ${quotation.quoteNumber} was auto-approved for customer ${quotation.customer?.name || 'Customer'}.`,
        entityType: 'QUOTATION',
        entityId: quotation.id,
        priority: NotificationPriority.NORMAL,
        deduplicationKey: `QUOTATION_AUTO_APPROVED_ADMIN_${quotation.id}`,
        metadata: { url: `/admin/approval-chains` },
      }).catch(() => {});
    }

    if (updatedQuotation) {
      this.dealHealthService.recalculateQuotationHealth(quotationId).catch(e => this.logger.error('Deal health recalculation failed', e));
    }

    return this.transformQuotation(updatedQuotation);
  }

  // --- SEND QUOTATION TO CUSTOMER ---

  async send(quotationId: string, currentUser: any) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      include: { customer: true },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation with ID '${quotationId}' not found`);
    }

    if (!quotation.customer) {
      throw new BadRequestException('Quotation has no customer assigned');
    }

    if (!quotation.customer.contactEmail) {
      throw new BadRequestException('Customer has no registered email address');
    }

    if (quotation.status !== QuotationStatus.APPROVED) {
      throw new BadRequestException(
        `Cannot send quotation in status '${quotation.status}'. Quotation must be APPROVED before sending to customer.`,
      );
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.$transaction(async (tx) => {
      await tx.customer.update({
        where: { id: quotation.customerId },
        data: {
          invitationTokenHash: tokenHash,
          invitationExpiresAt: expiresAt,
          isInvited: true,
        },
      });

      await tx.quotation.update({
        where: { id: quotationId },
        data: { status: QuotationStatus.SENT },
      });

      await tx.quotationAuditLog.create({
        data: {
          quotationId,
          userId: currentUser.id,
          action: 'SENT_TO_CUSTOMER',
          reason: `Quotation sent to customer (${quotation.customer.contactEmail}) by ${currentUser.name}`,
        },
      });
    });

    await this.mailService.sendCustomerQuotationInvitation(
      quotation.customer.contactEmail,
      quotation.customer.companyName || quotation.customer.name,
      quotation.quoteNumber,
      Number(quotation.totalAmount),
      quotation.currency,
      rawToken,
    );

    this.logger.log(`[AUDIT] Quotation ${quotation.quoteNumber} sent to customer ${quotation.customer.contactEmail}`);

    this.dealHealthService.recalculateQuotationHealth(quotationId).catch(e => this.logger.error('Deal health recalculation failed', e));

    return this.findOne(quotationId);
  }

  // --- CANCEL QUOTATION ---

  async cancel(quotationId: string, currentUser: any) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation with ID '${quotationId}' not found`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const q = await tx.quotation.update({
        where: { id: quotationId },
        data: { status: QuotationStatus.CANCELLED },
      });

      await tx.quotationAuditLog.create({
        data: {
          quotationId,
          userId: currentUser.id,
          action: 'CANCELLED',
          reason: `Quotation cancelled by ${currentUser.name}`,
        },
      });

      return q;
    });

    return this.findOne(quotationId);
  }
}
