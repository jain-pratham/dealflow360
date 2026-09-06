import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { LineType } from '@prisma/client';

export class AddQuotationLineDto {
  @IsNotEmpty({ message: 'Product ID is required' })
  @IsString()
  productId: string;

  @IsNotEmpty({ message: 'Quantity is required' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Quantity must be a valid number' })
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Discount percentage must be a valid number' })
  @Min(0, { message: 'Discount cannot be negative' })
  @Max(100, { message: 'Discount cannot exceed 100%' })
  discountPercent?: number = 0;

  @IsOptional()
  @IsEnum(LineType)
  lineType?: LineType;

  @IsOptional()
  @IsString()
  subscriptionPlanId?: string;
}
