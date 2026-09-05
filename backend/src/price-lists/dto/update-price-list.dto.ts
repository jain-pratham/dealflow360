import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { CustomerTier } from '@prisma/client';

export class UpdatePriceListDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Price list name cannot be empty' })
  @MaxLength(200, { message: 'Price list name must not exceed 200 characters' })
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(CustomerTier, { message: 'Customer tier must be BRONZE, SILVER, or GOLD' })
  customerTier?: CustomerTier;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
