import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private transformProduct(p: any) {
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      description: p.description,
      category: p.productType,
      basePrice: p.basePrice ? Number(p.basePrice) : 0,
      costPrice: p.costPrice ? Number(p.costPrice) : undefined,
      taxRate: p.taxRate ? Number(p.taxRate) : 0,
      currency: p.currency || 'INR',
      isActive: p.isActive,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  async findAll(query: QueryProductsDto) {
    const { search, category, isActive, page = 1, limit = 20 } = query;
    const cappedLimit = Math.min(Math.max(1, limit), 100);
    const skip = (Math.max(1, page) - 1) * cappedLimit;

    const where: any = {};

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.productType = category;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [total, items] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: cappedLimit,
      }),
    ]);

    return {
      data: items.map((p) => this.transformProduct(p)),
      meta: {
        total,
        page,
        limit: cappedLimit,
        totalPages: Math.ceil(total / cappedLimit) || 1,
      },
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID '${id}' not found`);
    }

    return this.transformProduct(product);
  }

  async create(dto: CreateProductDto) {
    const trimmedSku = dto.sku.trim();
    const trimmedName = dto.name.trim();

    const existingSku = await this.prisma.product.findUnique({
      where: { sku: trimmedSku },
    });

    if (existingSku) {
      throw new ConflictException(`Product with SKU '${trimmedSku}' already exists`);
    }

    const created = await this.prisma.product.create({
      data: {
        name: trimmedName,
        sku: trimmedSku,
        description: dto.description?.trim() || null,
        productType: dto.category,
        basePrice: dto.basePrice,
        costPrice: dto.costPrice ?? null,
        taxRate: dto.taxRate ?? 0,
        currency: dto.currency || 'INR',
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });

    this.logger.log(`[AUDIT] Product created: ID=${created.id}, SKU=${created.sku}, Name=${created.name}`);

    return this.transformProduct(created);
  }

  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Product with ID '${id}' not found`);
    }

    if (dto.sku && dto.sku.trim() !== existing.sku) {
      const trimmedSku = dto.sku.trim();
      const skuConflict = await this.prisma.product.findUnique({
        where: { sku: trimmedSku },
      });
      if (skuConflict && skuConflict.id !== id) {
        throw new ConflictException(`Product with SKU '${trimmedSku}' already exists`);
      }
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.sku && { sku: dto.sku.trim() }),
        ...(dto.description !== undefined && { description: dto.description?.trim() || null }),
        ...(dto.category && { productType: dto.category }),
        ...(dto.basePrice !== undefined && { basePrice: dto.basePrice }),
        ...(dto.costPrice !== undefined && { costPrice: dto.costPrice }),
        ...(dto.taxRate !== undefined && { taxRate: dto.taxRate }),
        ...(dto.currency && { currency: dto.currency }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    this.logger.log(`[AUDIT] Product updated: ID=${updated.id}, SKU=${updated.sku}`);

    return this.transformProduct(updated);
  }

  async setStatus(id: string, isActive: boolean) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Product with ID '${id}' not found`);
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: { isActive },
    });

    this.logger.log(`[AUDIT] Product status changed: ID=${id}, isActive=${isActive}`);

    return this.transformProduct(updated);
  }

  async remove(id: string) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Product with ID '${id}' not found`);
    }

    // Check safe deletion constraints
    const [priceListItemsCount, quotationLinesCount] = await Promise.all([
      this.prisma.priceListItem.count({ where: { productId: id } }),
      this.prisma.quotationLine.count({ where: { productId: id } }),
    ]);

    if (priceListItemsCount > 0 || quotationLinesCount > 0) {
      throw new BadRequestException(
        `Cannot delete product '${existing.name}' because it is referenced in active price lists or quotations. Deactivate it instead.`,
      );
    }

    await this.prisma.product.delete({
      where: { id },
    });

    this.logger.log(`[AUDIT] Product deleted safely: ID=${id}, SKU=${existing.sku}`);

    return { message: 'Product deleted successfully' };
  }
}
