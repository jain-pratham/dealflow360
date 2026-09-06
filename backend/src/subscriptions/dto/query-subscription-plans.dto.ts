import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { SubscriptionInterval } from '@prisma/client';
import { Transform } from 'class-transformer';

export class QuerySubscriptionPlansDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(SubscriptionInterval)
  interval?: SubscriptionInterval;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
