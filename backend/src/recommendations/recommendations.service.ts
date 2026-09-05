import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PairingType, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PriceListsService } from '../price-lists/price-lists.service';
import { CreateRecommendationDto } from './dto/create-recommendation.dto';
import { UpdateRecommendationDto } from './dto/update-recommendation.dto';
import { QueryRecommendationsDto } from './dto/query-recommendations.dto';

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly priceListsService: PriceListsService,
  ) {}

  private transformPairing(p: any) {
    return {
      id: p.id,
      primaryProductId: p.primaryProductId,
      suggestedProductId: p.suggestedProductId,
      type: p.type,
      priority: p.priority,
      coPurchaseScore: Number(p.coPurchaseScore),
      isActive: p.isActive,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      primaryProduct: p.primaryProduct
        ? {
            id: p.primaryProduct.id,
            name: p.primaryProduct.name,
            sku: p.primaryProduct.sku,
            basePrice: Number(p.primaryProduct.basePrice),
            category: p.primaryProduct.productType,
            isActive: p.primaryProduct.isActive,
          }
        : undefined,
      suggestedProduct: p.suggestedProduct
        ? {
            id: p.suggestedProduct.id,
            name: p.suggestedProduct.name,
            sku: p.suggestedProduct.sku,
            basePrice: Number(p.suggestedProduct.basePrice),
            category: p.suggestedProduct.productType,
            isActive: p.suggestedProduct.isActive,
          }
        : undefined,
    };
  }

  async create(dto: CreateRecommendationDto, currentUser: any) {
    if (dto.primaryProductId === dto.suggestedProductId) {
      throw new BadRequestException('Source product and recommended product cannot be the same');
    }

    const [primaryProduct, suggestedProduct] = await Promise.all([
      this.prisma.product.findUnique({ where: { id: dto.primaryProductId } }),
      this.prisma.product.findUnique({ where: { id: dto.suggestedProductId } }),
    ]);

    if (!primaryProduct) {
      throw new NotFoundException(`Source product '${dto.primaryProductId}' not found`);
    }
    if (!suggestedProduct) {
      throw new NotFoundException(`Recommended product '${dto.suggestedProductId}' not found`);
    }

    if (!primaryProduct.isActive) {
      throw new BadRequestException(`Source product '${primaryProduct.name}' is inactive`);
    }
    if (!suggestedProduct.isActive) {
      throw new BadRequestException(`Recommended product '${suggestedProduct.name}' is inactive`);
    }

    const existingPairing = await this.prisma.productPairing.findUnique({
      where: {
        primaryProductId_suggestedProductId: {
          primaryProductId: dto.primaryProductId,
          suggestedProductId: dto.suggestedProductId,
        },
      },
    });

    if (existingPairing) {
      throw new ConflictException('A recommendation pairing for these products already exists');
    }

    const created = await this.prisma.productPairing.create({
      data: {
        primaryProductId: dto.primaryProductId,
        suggestedProductId: dto.suggestedProductId,
        type: dto.type,
        priority: dto.priority || 1,
        coPurchaseScore: dto.coPurchaseScore || 1.0,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
      include: {
        primaryProduct: true,
        suggestedProduct: true,
      },
    });

    this.logger.log(
      `[AUDIT] Created recommendation pairing: ID=${created.id}, ${primaryProduct.name} -> ${suggestedProduct.name} (${dto.type})`,
    );

    return this.transformPairing(created);
  }

  async findAll(query: QueryRecommendationsDto) {
    const { search, type, primaryProductId, isActive } = query;

    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (primaryProductId) {
      where.primaryProductId = primaryProductId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search && search.trim()) {
      const s = search.trim();
      where.OR = [
        { primaryProduct: { name: { contains: s, mode: 'insensitive' } } },
        { primaryProduct: { sku: { contains: s, mode: 'insensitive' } } },
        { suggestedProduct: { name: { contains: s, mode: 'insensitive' } } },
        { suggestedProduct: { sku: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const items = await this.prisma.productPairing.findMany({
      where,
      include: {
        primaryProduct: true,
        suggestedProduct: true,
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });

    return items.map((p) => this.transformPairing(p));
  }

  async findOne(id: string) {
    const pairing = await this.prisma.productPairing.findUnique({
      where: { id },
      include: {
        primaryProduct: true,
        suggestedProduct: true,
      },
    });

    if (!pairing) {
      throw new NotFoundException(`Recommendation pairing with ID '${id}' not found`);
    }

    return this.transformPairing(pairing);
  }

  async update(id: string, dto: UpdateRecommendationDto, currentUser: any) {
    const existing = await this.prisma.productPairing.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Recommendation pairing with ID '${id}' not found`);
    }

    const nextPrimaryId = dto.primaryProductId || existing.primaryProductId;
    const nextSuggestedId = dto.suggestedProductId || existing.suggestedProductId;

    if (nextPrimaryId === nextSuggestedId) {
      throw new BadRequestException('Source product and recommended product cannot be the same');
    }

    if (dto.primaryProductId || dto.suggestedProductId) {
      const duplicate = await this.prisma.productPairing.findFirst({
        where: {
          primaryProductId: nextPrimaryId,
          suggestedProductId: nextSuggestedId,
          NOT: { id },
        },
      });
      if (duplicate) {
        throw new ConflictException('A recommendation pairing for these products already exists');
      }
    }

    const updated = await this.prisma.productPairing.update({
      where: { id },
      data: {
        ...(dto.primaryProductId && { primaryProductId: dto.primaryProductId }),
        ...(dto.suggestedProductId && { suggestedProductId: dto.suggestedProductId }),
        ...(dto.type && { type: dto.type }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.coPurchaseScore !== undefined && { coPurchaseScore: dto.coPurchaseScore }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: {
        primaryProduct: true,
        suggestedProduct: true,
      },
    });

    this.logger.log(`[AUDIT] Updated recommendation pairing ID=${id}`);

    return this.transformPairing(updated);
  }

  async toggleStatus(id: string, currentUser: any) {
    const existing = await this.prisma.productPairing.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Recommendation pairing with ID '${id}' not found`);
    }

    const updated = await this.prisma.productPairing.update({
      where: { id },
      data: { isActive: !existing.isActive },
      include: {
        primaryProduct: true,
        suggestedProduct: true,
      },
    });

    this.logger.log(`[AUDIT] Toggled recommendation pairing status ID=${id} to ${updated.isActive}`);

    return this.transformPairing(updated);
  }

  async remove(id: string, currentUser: any) {
    const existing = await this.prisma.productPairing.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Recommendation pairing with ID '${id}' not found`);
    }

    // Safety: deletes ONLY the ProductPairing relationship record
    await this.prisma.productPairing.delete({ where: { id } });

    this.logger.log(`[AUDIT] Deleted recommendation pairing ID=${id}`);

    return { message: 'Recommendation pairing deleted successfully', id };
  }

  async getRecommendationsForQuotation(quotationId: string, currentUser: any) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        customer: true,
        lines: {
          include: { product: true },
        },
      },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation with ID '${quotationId}' not found`);
    }

    // Ownership check for SALES_REP
    if (currentUser.role === UserRole.SALES_REP && quotation.salesRepId !== currentUser.id) {
      throw new ForbiddenException('You do not have access to view recommendations for this quotation');
    }

    const currentLineProductIds = quotation.lines.map((l) => l.productId);
    if (currentLineProductIds.length === 0) {
      return { upsell: [], crossSell: [] };
    }

    // Find all active pairings for products currently in quote
    const pairings = await this.prisma.productPairing.findMany({
      where: {
        primaryProductId: { in: currentLineProductIds },
        isActive: true,
        primaryProduct: { isActive: true },
        suggestedProduct: { isActive: true },
      },
      include: {
        primaryProduct: true,
        suggestedProduct: true,
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });

    const customerTier = quotation.customer.tier;
    const currency = quotation.currency || 'INR';

    const upsell: any[] = [];
    const crossSell: any[] = [];
    const seenUpsellProducts = new Set<string>();
    const seenCrossSellProducts = new Set<string>();

    for (const pairing of pairings) {
      const sourceProduct = pairing.primaryProduct;
      const suggestedProduct = pairing.suggestedProduct;

      // Check if product is already in quote
      const alreadyInQuote = currentLineProductIds.includes(suggestedProduct.id);

      // Resolve Price List price for source and suggested products
      const [sourcePriceRes, suggestedPriceRes] = await Promise.all([
        this.priceListsService.resolveProductPrice(sourceProduct.id, customerTier, currency),
        this.priceListsService.resolveProductPrice(suggestedProduct.id, customerTier, currency),
      ]);

      const sourcePrice = sourcePriceRes.price;
      const resolvedPrice = suggestedPriceRes.price;

      if (pairing.type === PairingType.UPSELL) {
        // Deterministic Upsell Rule: Suggested product must represent a higher value than source product
        if (resolvedPrice > sourcePrice && !seenUpsellProducts.has(suggestedProduct.id)) {
          seenUpsellProducts.add(suggestedProduct.id);
          upsell.push({
            id: pairing.id,
            pairingId: pairing.id,
            sourceProduct: {
              id: sourceProduct.id,
              name: sourceProduct.name,
              sku: sourceProduct.sku,
              price: sourcePrice,
            },
            recommendedProduct: {
              id: suggestedProduct.id,
              name: suggestedProduct.name,
              sku: suggestedProduct.sku,
              category: suggestedProduct.productType,
              basePrice: Number(suggestedProduct.basePrice),
              resolvedPrice,
              currency,
            },
            resolvedPrice,
            currency,
            type: PairingType.UPSELL,
            priority: pairing.priority,
            alreadyInQuote,
            explanation: 'Upgrade to a higher-value product',
          });
        }
      } else if (pairing.type === PairingType.CROSS_SELL) {
        if (!seenCrossSellProducts.has(suggestedProduct.id)) {
          seenCrossSellProducts.add(suggestedProduct.id);
          crossSell.push({
            id: pairing.id,
            pairingId: pairing.id,
            sourceProduct: {
              id: sourceProduct.id,
              name: sourceProduct.name,
              sku: sourceProduct.sku,
              price: sourcePrice,
            },
            recommendedProduct: {
              id: suggestedProduct.id,
              name: suggestedProduct.name,
              sku: suggestedProduct.sku,
              category: suggestedProduct.productType,
              basePrice: Number(suggestedProduct.basePrice),
              resolvedPrice,
              currency,
            },
            resolvedPrice,
            currency,
            type: PairingType.CROSS_SELL,
            priority: pairing.priority,
            alreadyInQuote,
            explanation: 'Frequently paired/complementary product',
          });
        }
      }
    }

    return { upsell, crossSell };
  }

  async addRecommendationToQuotation(quotationId: string, productId: string, currentUser: any) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        customer: true,
        lines: true,
      },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation with ID '${quotationId}' not found`);
    }

    if (currentUser.role === UserRole.SALES_REP && quotation.salesRepId !== currentUser.id) {
      throw new ForbiddenException('You do not have authorization to modify this quotation');
    }

    if (quotation.status !== 'DRAFT') {
      throw new BadRequestException(
        `Cannot modify lines for quotation in status '${quotation.status}'. Only DRAFT quotations can be modified.`,
      );
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.isActive) {
      throw new BadRequestException(`Product '${productId}' does not exist or is inactive`);
    }

    // Verify product is a configured active recommendation for one of the quote's current products
    const currentProductIds = quotation.lines.map((l) => l.productId);
    const pairing = await this.prisma.productPairing.findFirst({
      where: {
        primaryProductId: { in: currentProductIds },
        suggestedProductId: productId,
        isActive: true,
      },
    });

    if (!pairing) {
      throw new BadRequestException(`Product '${product.name}' is not an active recommendation for this quotation`);
    }

    // Resolve price from Price List
    const priceRes = await this.priceListsService.resolveProductPrice(
      product.id,
      quotation.customer.tier,
      quotation.currency,
    );

    const unitPrice = priceRes.price;
    const taxRate = Number(product.taxRate || 0);

    const result = await this.prisma.$transaction(async (tx) => {
      // Duplicate protection: if line exists, increase quantity
      const existingLine = await tx.quotationLine.findFirst({
        where: { quotationId, productId },
      });

      if (existingLine) {
        const newQty = existingLine.quantity + 1;
        const subtotal = unitPrice * newQty;
        const discountAmount = (subtotal * Number(existingLine.discountPercent)) / 100;
        const afterDiscount = subtotal - discountAmount;
        const taxAmount = (afterDiscount * taxRate) / 100;
        const finalTotal = afterDiscount + taxAmount;

        await tx.quotationLine.update({
          where: { id: existingLine.id },
          data: {
            quantity: newQty,
            unitPrice,
            subtotal,
            discountAmount,
            taxAmount,
            finalUnitPrice: finalTotal,
          },
        });
      } else {
        const subtotal = unitPrice * 1;
        const taxAmount = (subtotal * taxRate) / 100;
        const finalTotal = subtotal + taxAmount;

        await tx.quotationLine.create({
          data: {
            quotationId,
            productId: product.id,
            quantity: 1,
            unitPrice,
            costPrice: product.costPrice ? Number(product.costPrice) : null,
            discountPercent: 0,
            discountAmount: 0,
            taxRate,
            taxAmount,
            subtotal,
            finalUnitPrice: finalTotal,
          },
        });
      }

      // Recalculate quotation totals
      const lines = await tx.quotationLine.findMany({ where: { quotationId } });
      let subtotalAmount = 0;
      let discountTotal = 0;
      let taxTotal = 0;
      let totalAmount = 0;

      for (const line of lines) {
        subtotalAmount += Number(line.unitPrice) * line.quantity;
        discountTotal += Number(line.discountAmount);
        taxTotal += Number(line.taxAmount);
        totalAmount += Number(line.finalUnitPrice);
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

      // Audit Log
      await tx.quotationAuditLog.create({
        data: {
          quotationId,
          userId: currentUser.id,
          action: 'RECOMMENDED_PRODUCT_ADDED',
          reason: `Added recommended product '${product.name}' (${pairing.type})`,
        },
      });

      return tx.quotation.findUnique({
        where: { id: quotationId },
        include: {
          customer: true,
          salesRep: true,
          lines: { include: { product: true } },
          approvalRequests: true,
        },
      });
    });

    this.logger.log(`[AUDIT] Added recommended product '${product.name}' to quotation '${quotationId}'`);

    return result;
  }
}
