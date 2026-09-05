import { IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class RecordPaymentDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  @IsOptional()
  paymentMethod?: string; // BANK_TRANSFER, CARD, UPI, CASH, RAZORPAY, OTHER

  @IsString()
  @IsOptional()
  gateway?: string; // MANUAL, RAZORPAY

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
