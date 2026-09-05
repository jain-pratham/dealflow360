import { IsEnum, IsOptional, IsString } from 'class-validator';
import { QuotationStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class QueryQuotationsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(QuotationStatus)
  status?: QuotationStatus;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}
