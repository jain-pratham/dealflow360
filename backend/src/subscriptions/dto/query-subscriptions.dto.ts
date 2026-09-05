import { IsOptional, IsString } from 'class-validator';

export class QuerySubscriptionsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
