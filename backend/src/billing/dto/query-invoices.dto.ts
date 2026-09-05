import { IsEnum, IsOptional, IsString } from 'class-validator';
import { InvoiceStatus, InvoiceType } from '@prisma/client';

export class QueryInvoicesDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(InvoiceType)
  invoiceType?: InvoiceType;

  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
