import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class FulfillBackorderDto {
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Fulfillment quantity must be at least 1' })
  quantity?: number;
}
