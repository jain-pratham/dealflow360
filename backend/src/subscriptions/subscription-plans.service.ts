import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { QuerySubscriptionPlansDto } from './dto/query-subscription-plans.dto';

@Injectable()
export class SubscriptionPlansService {
  private readonly logger = new Logger(SubscriptionPlansService.name);

  constructor(private readonly prisma: PrismaService) {}

  public transformPlan(plan: any) {
    return {
      id: plan.id,
      name: plan.name,
      description: plan.description || '',
      price: Number(plan.price || 0),
      currency: plan.currency || 'INR',
      interval: plan.interval,
      prorationPolicy: plan.prorationPolicy || 'EXACT_DAY_PRO_RATA',
      refundPolicy: plan.refundPolicy || 'PARTIAL_CREDIT_NOTE',
      isActive: plan.isActive,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }

  async findAll(query: QuerySubscriptionPlansDto) {
    const { search, interval, isActive, page = 1, limit = 100 } = query;
    const cappedLimit = Math.min(Math.max(1, limit), 100);
    const skip = (Math.max(1, page) - 1) * cappedLimit;

    const where: any = {};

    if (typeof isActive === 'boolean') {
      where.isActive = isActive;
    }

    if (interval) {
      where.interval = interval;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.subscriptionPlan.count({ where }),
      this.prisma.subscriptionPlan.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: cappedLimit,
      }),
    ]);

    return {
      data: items.map((p) => this.transformPlan(p)),
      meta: {
        total,
        page,
        limit: cappedLimit,
        totalPages: Math.ceil(total / cappedLimit) || 1,
      },
    };
  }

  async findOne(id: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
    });

    if (!plan) {
      throw new NotFoundException(`Subscription plan '${id}' not found`);
    }

    return this.transformPlan(plan);
  }

  async create(dto: CreateSubscriptionPlanDto, currentUser?: any) {
    const created = await this.prisma.subscriptionPlan.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        price: dto.price ?? 0,
        currency: dto.currency || 'INR',
        interval: dto.interval,
        prorationPolicy: dto.prorationPolicy || 'EXACT_DAY_PRO_RATA',
        refundPolicy: dto.refundPolicy || 'PARTIAL_CREDIT_NOTE',
        isActive: dto.isActive ?? true,
      },
    });

    this.logger.log(`[SUBSCRIPTION PLAN] Created plan '${created.id}' (${created.name})`);
    return this.transformPlan(created);
  }

  async update(id: string, dto: UpdateSubscriptionPlanDto, currentUser?: any) {
    const existing = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Subscription plan '${id}' not found`);
    }

    const updated = await this.prisma.subscriptionPlan.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        ...(dto.currency ? { currency: dto.currency } : {}),
        ...(dto.interval ? { interval: dto.interval } : {}),
        ...(dto.prorationPolicy ? { prorationPolicy: dto.prorationPolicy } : {}),
        ...(dto.refundPolicy ? { refundPolicy: dto.refundPolicy } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    this.logger.log(`[SUBSCRIPTION PLAN] Updated plan '${id}' (${updated.name})`);
    return this.transformPlan(updated);
  }

  async updateStatus(id: string, isActive: boolean, currentUser?: any) {
    const existing = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Subscription plan '${id}' not found`);
    }

    const updated = await this.prisma.subscriptionPlan.update({
      where: { id },
      data: { isActive },
    });

    this.logger.log(`[SUBSCRIPTION PLAN] Set active status of plan '${id}' to ${isActive}`);
    return this.transformPlan(updated);
  }

  async remove(id: string) {
    const existing = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
      include: {
        quotationLines: { take: 1 },
        subscriptionSchedules: { take: 1 },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Subscription plan '${id}' not found`);
    }

    if (existing.quotationLines.length > 0 || existing.subscriptionSchedules.length > 0) {
      throw new BadRequestException(
        `Cannot delete subscription plan '${existing.name}' as it is referenced by existing historical quotation lines or subscription schedules. Please deactivate the plan instead.`,
      );
    }

    await this.prisma.subscriptionPlan.delete({
      where: { id },
    });

    return { message: `Subscription plan '${id}' deleted successfully` };
  }
}
