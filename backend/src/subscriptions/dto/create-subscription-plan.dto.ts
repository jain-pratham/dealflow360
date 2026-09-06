import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { SubscriptionInterval } from '@prisma/client';

export class CreateSubscriptionPlanDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsEnum(SubscriptionInterval)
  interval: SubscriptionInterval;

  @IsOptional()
  @IsString()
  prorationPolicy?: string;

  @IsOptional()
  @IsString()
  refundPolicy?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
