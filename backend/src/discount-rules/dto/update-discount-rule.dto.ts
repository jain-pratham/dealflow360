import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';
import { CustomerTier, ProductType, ApprovalRoleRequired } from '@prisma/client';
import { Type } from 'class-transformer';

export class UpdateDiscountRuleDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Rule name cannot be empty' })
  @MaxLength(200, { message: 'Rule name must not exceed 200 characters' })
  name?: string;

  @IsOptional()
  @IsEnum(CustomerTier, { message: 'Customer tier must be BRONZE, SILVER, or GOLD' })
  customerTier?: CustomerTier;

  @IsOptional()
  @IsEnum(ProductType, { message: 'Product category must be HARDWARE, SERVICES, or SUBSCRIPTIONS' })
  productCategory?: ProductType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Maximum discount must be a valid number' })
  @Min(0, { message: 'Maximum discount cannot be negative' })
  @Max(100, { message: 'Maximum discount cannot exceed 100%' })
  maxDiscountPercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Approval threshold must be a valid number' })
  @Min(0, { message: 'Approval threshold cannot be negative' })
  @Max(100, { message: 'Approval threshold cannot exceed 100%' })
  approvalThresholdPercent?: number;

  @IsOptional()
  @IsEnum(ApprovalRoleRequired, { message: 'Approval role must be SALES_MANAGER or FINANCE' })
  approvalRoleRequired?: ApprovalRoleRequired;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
