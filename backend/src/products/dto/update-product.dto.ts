import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ProductType } from '@prisma/client';
import { Type } from 'class-transformer';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Product name cannot be empty' })
  @MaxLength(200, { message: 'Product name must not exceed 200 characters' })
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'SKU cannot be empty' })
  @MaxLength(100, { message: 'SKU must not exceed 100 characters' })
  sku?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ProductType, { message: 'Category must be HARDWARE, SERVICES, or SUBSCRIPTIONS' })
  category?: ProductType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Base price must be a valid number' })
  @Min(0, { message: 'Base price cannot be negative' })
  basePrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Cost price must be a valid number' })
  @Min(0, { message: 'Cost price cannot be negative' })
  costPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Tax rate must be a valid number' })
  @Min(0, { message: 'Tax rate cannot be negative' })
  taxRate?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
