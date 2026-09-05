import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PairingType } from '@prisma/client';
import { Transform } from 'class-transformer';

export class QueryRecommendationsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(PairingType)
  type?: PairingType;

  @IsOptional()
  @IsString()
  primaryProductId?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  isActive?: boolean;
}
