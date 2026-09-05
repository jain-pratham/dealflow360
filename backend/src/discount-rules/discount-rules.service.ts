import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CustomerTier, ProductType, ApprovalRoleRequired } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDiscountRuleDto } from './dto/create-discount-rule.dto';
import { UpdateDiscountRuleDto } from './dto/update-discount-rule.dto';
import { QueryDiscountRulesDto } from './dto/query-discount-rules.dto';

export interface DiscountEvaluationResult {
  allowed: boolean;
  requiresApproval: boolean;
  approvalRole: ApprovalRoleRequired | null;
  maxDiscountPercent: number;
  approvalThresholdPercent: number;
  reason: string;
}

@Injectable()
export class DiscountRulesService {
  private readonly logger = new Logger(DiscountRulesService.name);

  constructor(private readonly prisma: PrismaService) {}

  private transformRule(r: any) {
    return {
      id: r.id,
      name: r.name || `${r.customerTier} ${r.productCategory} Rule`,
      customerTier: r.customerTier,
      productCategory: r.productCategory,
      maxDiscountPercent: Number(r.maxAllowedDiscount),
      approvalThresholdPercent: Number(r.approvalThresholdPercent),
      approvalRoleRequired: r.approvalRoleRequired,
      isActive: r.isActive,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  async findAll(query: QueryDiscountRulesDto) {
    const { search, customerTier, productCategory, isActive, page = 1, limit = 20 } = query;
    const cappedLimit = Math.min(Math.max(1, limit), 100);
    const skip = (Math.max(1, page) - 1) * cappedLimit;

    const where: any = {};

    if (search && search.trim()) {
      const q = search.trim();
      where.name = { contains: q, mode: 'insensitive' };
    }

    if (customerTier) {
      where.customerTier = customerTier;
    }

    if (productCategory) {
      where.productCategory = productCategory;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [total, items] = await Promise.all([
      this.prisma.discountRule.count({ where }),
      this.prisma.discountRule.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: cappedLimit,
      }),
    ]);

    return {
      data: items.map((r) => this.transformRule(r)),
      meta: {
        total,
        page,
        limit: cappedLimit,
        totalPages: Math.ceil(total / cappedLimit) || 1,
      },
    };
  }

  async findOne(id: string) {
    const rule = await this.prisma.discountRule.findUnique({
      where: { id },
    });

    if (!rule) {
      throw new NotFoundException(`Discount rule with ID '${id}' not found`);
    }

    return this.transformRule(rule);
  }

  async create(dto: CreateDiscountRuleDto) {
    if (dto.approvalThresholdPercent > dto.maxDiscountPercent) {
      throw new BadRequestException(
        'Approval threshold percentage cannot be greater than maximum allowed discount percentage',
      );
    }

    const existing = await this.prisma.discountRule.findUnique({
      where: {
        customerTier_productCategory: {
          customerTier: dto.customerTier,
          productCategory: dto.productCategory,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `A discount rule for tier '${dto.customerTier}' and category '${dto.productCategory}' already exists`,
      );
    }

    const created = await this.prisma.discountRule.create({
      data: {
        name: dto.name.trim(),
        customerTier: dto.customerTier,
        productCategory: dto.productCategory,
        maxAllowedDiscount: dto.maxDiscountPercent,
        approvalThresholdPercent: dto.approvalThresholdPercent,
        approvalRoleRequired: dto.approvalRoleRequired,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });

    this.logger.log(`[AUDIT] Discount rule created: ID=${created.id}, Name=${created.name}`);

    return this.transformRule(created);
  }

  async update(id: string, dto: UpdateDiscountRuleDto) {
    const existing = await this.prisma.discountRule.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Discount rule with ID '${id}' not found`);
    }

    const maxVal = dto.maxDiscountPercent ?? Number(existing.maxAllowedDiscount);
    const threshVal = dto.approvalThresholdPercent ?? Number(existing.approvalThresholdPercent);

    if (threshVal > maxVal) {
      throw new BadRequestException(
        'Approval threshold percentage cannot be greater than maximum allowed discount percentage',
      );
    }

    const updated = await this.prisma.discountRule.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.customerTier && { customerTier: dto.customerTier }),
        ...(dto.productCategory && { productCategory: dto.productCategory }),
        ...(dto.maxDiscountPercent !== undefined && { maxAllowedDiscount: dto.maxDiscountPercent }),
        ...(dto.approvalThresholdPercent !== undefined && {
          approvalThresholdPercent: dto.approvalThresholdPercent,
        }),
        ...(dto.approvalRoleRequired && { approvalRoleRequired: dto.approvalRoleRequired }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    this.logger.log(`[AUDIT] Discount rule updated: ID=${id}`);

    return this.transformRule(updated);
  }

  async setStatus(id: string, isActive: boolean) {
    const existing = await this.prisma.discountRule.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Discount rule with ID '${id}' not found`);
    }

    const updated = await this.prisma.discountRule.update({
      where: { id },
      data: { isActive },
    });

    this.logger.log(`[AUDIT] Discount rule status changed: ID=${id}, isActive=${isActive}`);

    return this.transformRule(updated);
  }

  async remove(id: string) {
    const existing = await this.prisma.discountRule.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Discount rule with ID '${id}' not found`);
    }

    await this.prisma.discountRule.delete({
      where: { id },
    });

    this.logger.log(`[AUDIT] Discount rule deleted: ID=${id}`);

    return { message: 'Discount rule deleted successfully' };
  }

  // --- DISCOUNT GOVERNANCE EVALUATION ENGINE ---

  async evaluateDiscount(
    customerTier: CustomerTier,
    productCategory: ProductType,
    discountPercent: number,
  ): Promise<DiscountEvaluationResult> {
    const rule = await this.prisma.discountRule.findFirst({
      where: {
        customerTier,
        productCategory,
        isActive: true,
      },
    });

    // Default safe fallback if no matching active rule exists
    const maxDiscount = rule ? Number(rule.maxAllowedDiscount) : 10;
    const threshold = rule ? Number(rule.approvalThresholdPercent) : 5;
    const role = rule ? rule.approvalRoleRequired : ApprovalRoleRequired.SALES_MANAGER;

    if (discountPercent > maxDiscount) {
      return {
        allowed: false,
        requiresApproval: false,
        approvalRole: null,
        maxDiscountPercent: maxDiscount,
        approvalThresholdPercent: threshold,
        reason: `Requested discount of ${discountPercent}% exceeds maximum allowed limit of ${maxDiscount}% for ${customerTier} ${productCategory}`,
      };
    }

    if (discountPercent > threshold) {
      return {
        allowed: true,
        requiresApproval: true,
        approvalRole: role,
        maxDiscountPercent: maxDiscount,
        approvalThresholdPercent: threshold,
        reason: `Discount of ${discountPercent}% exceeds threshold of ${threshold}%, requiring ${role} approval`,
      };
    }

    return {
      allowed: true,
      requiresApproval: false,
      approvalRole: null,
      maxDiscountPercent: maxDiscount,
      approvalThresholdPercent: threshold,
      reason: `Discount of ${discountPercent}% is within standard limit of ${threshold}%`,
    };
  }
}
