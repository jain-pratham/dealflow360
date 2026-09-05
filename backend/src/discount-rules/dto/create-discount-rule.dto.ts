import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
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

export class CreateDiscountRuleDto {
  @IsNotEmpty({ message: 'Rule name is required' })
  @IsString()
  @MinLength(1, { message: 'Rule name cannot be empty' })
  @MaxLength(200, { message: 'Rule name must not exceed 200 characters' })
  name: string;

  @IsNotEmpty({ message: 'Customer tier is required' })
  @IsEnum(CustomerTier, { message: 'Customer tier must be BRONZE, SILVER, or GOLD' })
  customerTier: CustomerTier;

  @IsNotEmpty({ message: 'Product category is required' })
  @IsEnum(ProductType, { message: 'Product category must be HARDWARE, SERVICES, or SUBSCRIPTIONS' })
  productCategory: ProductType;

  @IsNotEmpty({ message: 'Maximum allowed discount is required' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Maximum discount must be a valid number' })
  @Min(0, { message: 'Maximum discount cannot be negative' })
  @Max(100, { message: 'Maximum discount cannot exceed 100%' })
  maxDiscountPercent: number;

  @IsNotEmpty({ message: 'Approval threshold is required' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Approval threshold must be a valid number' })
  @Min(0, { message: 'Approval threshold cannot be negative' })
  @Max(100, { message: 'Approval threshold cannot exceed 100%' })
  approvalThresholdPercent: number;

  @IsNotEmpty({ message: 'Approval role required is required' })
  @IsEnum(ApprovalRoleRequired, { message: 'Approval role must be SALES_MANAGER or FINANCE' })
  approvalRoleRequired: ApprovalRoleRequired;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
