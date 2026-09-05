import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class LineNegotiationRequestDto {
  @IsUUID()
  lineId: string;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Discount cannot be negative' })
  @Max(100, { message: 'Discount cannot exceed 100%' })
  requestedDiscount?: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class SubmitNegotiationDto {
  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Counter discount cannot be negative' })
  @Max(100, { message: 'Counter discount cannot exceed 100%' })
  counterDiscount?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LineNegotiationRequestDto)
  lineRequests?: LineNegotiationRequestDto[];
}
