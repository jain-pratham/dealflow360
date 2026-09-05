import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export enum InventoryAdjustmentType {
  INCREASE = 'INCREASE',
  DECREASE = 'DECREASE',
  SET = 'SET',
}

export class AdjustInventoryDto {
  @IsEnum(InventoryAdjustmentType, {
    message: 'type must be INCREASE, DECREASE, or SET',
  })
  type: InventoryAdjustmentType;

  @IsInt()
  @Min(0, { message: 'quantity must be 0 or greater' })
  quantity: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
