import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CustomerTier } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePriceListDto } from './dto/create-price-list.dto';
import { UpdatePriceListDto } from './dto/update-price-list.dto';
import { AddPriceListItemDto } from './dto/add-price-list-item.dto';
import { UpdatePriceListItemDto } from './dto/update-price-list-item.dto';
import { QueryPriceListsDto } from './dto/query-price-lists.dto';

@Injectable()
export class PriceListsService {
  private readonly logger = new Logger(PriceListsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private transformPriceListItem(item: any) {
    return {
      id: item.id,
      priceListId: item.priceListId,
      productId: item.productId,
      price: Number(item.price),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      product: item.product
        ? {
            id: item.product.id,
            name: item.product.name,
            sku: item.product.sku,
            category: item.product.productType,
            basePrice: Number(item.product.basePrice),
            currency: item.product.currency,
            isActive: item.product.isActive,
          }
        : undefined,
    };
  }

  private transformPriceList(pl: any) {
    return {
      id: pl.id,
      name: pl.name,
      description: pl.description,
      customerTier: pl.customerTier,
      currency: pl.currency || 'INR',
      isActive: pl.isActive,
      createdAt: pl.createdAt,
      updatedAt: pl.updatedAt,
      itemsCount: pl.items ? pl.items.length : pl._count?.items ?? 0,
      items: pl.items ? pl.items.map((i: any) => this.transformPriceListItem(i)) : undefined,
    };
  }

  async findAll(query: QueryPriceListsDto) {
    const { search, customerTier, currency, isActive, page = 1, limit = 20 } = query;
    const cappedLimit = Math.min(Math.max(1, limit), 100);
    const skip = (Math.max(1, page) - 1) * cappedLimit;

    const where: any = {};

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (customerTier) {
      where.customerTier = customerTier;
    }

    if (currency) {
      where.currency = currency;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [total, items] = await Promise.all([
      this.prisma.priceList.count({ where }),
      this.prisma.priceList.findMany({
        where,
        include: {
          items: {
            include: {
              product: true,
            },
          },
          _count: {
            select: { items: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: cappedLimit,
      }),
    ]);

    return {
      data: items.map((pl) => this.transformPriceList(pl)),
      meta: {
        total,
        page,
        limit: cappedLimit,
        totalPages: Math.ceil(total / cappedLimit) || 1,
      },
    };
  }

  async findOne(id: string) {
    const priceList = await this.prisma.priceList.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!priceList) {
      throw new NotFoundException(`Price list with ID '${id}' not found`);
    }

    return this.transformPriceList(priceList);
  }

  async create(dto: CreatePriceListDto) {
    const currency = dto.currency || 'INR';

    // Validate item products if provided
    if (dto.items && dto.items.length > 0) {
      const productIds = dto.items.map((i) => i.productId);
      const uniqueProductIds = new Set(productIds);
      if (uniqueProductIds.size !== productIds.length) {
        throw new BadRequestException('Duplicate products are not allowed in the same price list');
      }

      const products = await this.prisma.product.findMany({
        where: { id: { in: Array.from(uniqueProductIds) } },
      });

      if (products.length !== uniqueProductIds.size) {
        throw new NotFoundException('One or more products specified for the price list do not exist');
      }

      const inactiveProducts = products.filter((p) => !p.isActive);
      if (inactiveProducts.length > 0) {
        throw new BadRequestException(
          `Cannot add inactive product '${inactiveProducts[0].name}' to a new price list`,
        );
      }
    }

    // Atomic transaction for price list + items
    const created = await this.prisma.$transaction(async (tx) => {
      const priceList = await tx.priceList.create({
        data: {
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          customerTier: dto.customerTier,
          currency,
          isActive: dto.isActive !== undefined ? dto.isActive : true,
        },
      });

      if (dto.items && dto.items.length > 0) {
        await tx.priceListItem.createMany({
          data: dto.items.map((item) => ({
            priceListId: priceList.id,
            productId: item.productId,
            price: item.price,
          })),
        });
      }

      return tx.priceList.findUnique({
        where: { id: priceList.id },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    });

    this.logger.log(`[AUDIT] Price list created: ID=${created?.id}, Name=${created?.name}`);

    return this.transformPriceList(created);
  }

  async update(id: string, dto: UpdatePriceListDto) {
    const existing = await this.prisma.priceList.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Price list with ID '${id}' not found`);
    }

    const updated = await this.prisma.priceList.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.description !== undefined && { description: dto.description?.trim() || null }),
        ...(dto.customerTier && { customerTier: dto.customerTier }),
        ...(dto.currency && { currency: dto.currency }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    this.logger.log(`[AUDIT] Price list updated: ID=${id}`);

    return this.transformPriceList(updated);
  }

  async setStatus(id: string, isActive: boolean) {
    const existing = await this.prisma.priceList.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Price list with ID '${id}' not found`);
    }

    const updated = await this.prisma.priceList.update({
      where: { id },
      data: { isActive },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    this.logger.log(`[AUDIT] Price list status changed: ID=${id}, isActive=${isActive}`);

    return this.transformPriceList(updated);
  }

  async remove(id: string) {
    const existing = await this.prisma.priceList.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Price list with ID '${id}' not found`);
    }

    await this.prisma.priceList.delete({
      where: { id },
    });

    this.logger.log(`[AUDIT] Price list deleted: ID=${id}`);

    return { message: 'Price list deleted successfully' };
  }

  // --- Price List Items Methods ---

  async addItem(priceListId: string, dto: AddPriceListItemDto) {
    const priceList = await this.prisma.priceList.findUnique({
      where: { id: priceListId },
    });

    if (!priceList) {
      throw new NotFoundException(`Price list with ID '${priceListId}' not found`);
    }

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID '${dto.productId}' not found`);
    }

    if (!product.isActive) {
      throw new BadRequestException(`Cannot add inactive product '${product.name}' to a price list`);
    }

    const existingItem = await this.prisma.priceListItem.findUnique({
      where: {
        priceListId_productId: {
          priceListId,
          productId: dto.productId,
        },
      },
    });

    if (existingItem) {
      throw new ConflictException(
        `Product '${product.name}' is already present in this price list`,
      );
    }

    const item = await this.prisma.priceListItem.create({
      data: {
        priceListId,
        productId: dto.productId,
        price: dto.price,
      },
      include: {
        product: true,
      },
    });

    this.logger.log(`[AUDIT] Price list item added: PriceListID=${priceListId}, ProductID=${dto.productId}`);

    return this.transformPriceListItem(item);
  }

  async updateItem(priceListId: string, itemId: string, dto: UpdatePriceListItemDto) {
    const item = await this.prisma.priceListItem.findFirst({
      where: { id: itemId, priceListId },
    });

    if (!item) {
      throw new NotFoundException(`Price list item with ID '${itemId}' not found in this price list`);
    }

    const updated = await this.prisma.priceListItem.update({
      where: { id: itemId },
      data: { price: dto.price },
      include: { product: true },
    });

    this.logger.log(`[AUDIT] Price list item price updated: ItemID=${itemId}, Price=${dto.price}`);

    return this.transformPriceListItem(updated);
  }

  async removeItem(priceListId: string, itemId: string) {
    const item = await this.prisma.priceListItem.findFirst({
      where: { id: itemId, priceListId },
    });

    if (!item) {
      throw new NotFoundException(`Price list item with ID '${itemId}' not found in this price list`);
    }

    await this.prisma.priceListItem.delete({
      where: { id: itemId },
    });

    this.logger.log(`[AUDIT] Price list item removed: ItemID=${itemId} (Product preserved)`);

    return { message: 'Item removed from price list successfully' };
  }

  // --- Price Resolution Engine Foundation ---

  async resolveProductPrice(
    productId: string,
    customerTier: CustomerTier,
    currency: string = 'INR',
  ): Promise<{ price: number; source: 'PRICE_LIST' | 'BASE_PRICE'; priceListId?: string }> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID '${productId}' not found`);
    }

    // 1. Find active price list matching tier + currency
    const priceList = await this.prisma.priceList.findFirst({
      where: {
        customerTier,
        currency,
        isActive: true,
      },
      include: {
        items: {
          where: { productId },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (priceList && priceList.items && priceList.items.length > 0) {
      return {
        price: Number(priceList.items[0].price),
        source: 'PRICE_LIST',
        priceListId: priceList.id,
      };
    }

    // Fallback to Product Base Price
    return {
      price: Number(product.basePrice),
      source: 'BASE_PRICE',
    };
  }
}
