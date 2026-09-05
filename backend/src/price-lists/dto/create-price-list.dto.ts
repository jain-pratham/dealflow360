import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
} from 'class-validator';
import { CustomerTier } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreatePriceListItemDto {
  @IsNotEmpty({ message: 'Product ID is required' })
  @IsString()
  productId: string;

  @IsNotEmpty({ message: 'Price is required' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Price must be a valid number' })
  @Min(0, { message: 'Price cannot be negative' })
  price: number;
}

export class CreatePriceListDto {
  @IsNotEmpty({ message: 'Price list name is required' })
  @IsString()
  @MinLength(1, { message: 'Price list name cannot be empty' })
  @MaxLength(200, { message: 'Price list name must not exceed 200 characters' })
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty({ message: 'Customer tier is required' })
  @IsEnum(CustomerTier, { message: 'Customer tier must be BRONZE, SILVER, or GOLD' })
  customerTier: CustomerTier;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePriceListItemDto)
  items?: CreatePriceListItemDto[];
}
