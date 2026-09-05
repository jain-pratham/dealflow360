import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';
import { PairingType } from '@prisma/client';
import { Type } from 'class-transformer';

export class UpdateRecommendationDto {
  @IsOptional()
  @IsUUID('4', { message: 'Primary product ID must be a valid UUID' })
  primaryProductId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Suggested product ID must be a valid UUID' })
  suggestedProductId?: string;

  @IsOptional()
  @IsEnum(PairingType, { message: 'Recommendation type must be UPSELL or CROSS_SELL' })
  type?: PairingType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Priority must be a number' })
  @Min(1, { message: 'Priority must be at least 1' })
  priority?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Co-purchase score must be a number' })
  @Min(0, { message: 'Co-purchase score must be at least 0' })
  coPurchaseScore?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
