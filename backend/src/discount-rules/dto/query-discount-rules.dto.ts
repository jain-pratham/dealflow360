import { IsEnum, IsOptional, IsString, IsBoolean } from 'class-validator';
import { CustomerTier, ProductType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';

export class QueryDiscountRulesDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(CustomerTier)
  customerTier?: CustomerTier;

  @IsOptional()
  @IsEnum(ProductType)
  productCategory?: ProductType;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}
