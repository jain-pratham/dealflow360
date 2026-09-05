import { IsInt, IsNotEmpty, IsOptional, IsUUID, Min } from 'class-validator';

export class UpdateInventoryDto {
  @IsUUID()
  @IsNotEmpty()
  warehouseId: string;

  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsInt()
  @Min(0, { message: 'Quantity on hand cannot be negative' })
  quantityOnHand: number;

  @IsOptional()
  @IsInt()
  @Min(0, { message: 'Quantity reserved cannot be negative' })
  quantityReserved?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  reorderLevel?: number;
}
