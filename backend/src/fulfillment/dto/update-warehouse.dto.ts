import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateWarehouseDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingCostWeighting?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
