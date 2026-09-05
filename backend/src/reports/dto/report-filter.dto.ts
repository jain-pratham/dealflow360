import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';
import { CustomerTier, QuotationStatus } from '@prisma/client';

export class ReportFilterDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  salesRepId?: string;

  @IsOptional()
  @IsEnum(CustomerTier)
  customerTier?: CustomerTier;

  @IsOptional()
  @IsEnum(QuotationStatus)
  quotationStatus?: QuotationStatus;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;
}
