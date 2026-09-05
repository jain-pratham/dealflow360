import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApprovalRoleRequired } from '@prisma/client';

export class UpdateApprovalChainDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description?: string;

  @IsOptional()
  @IsEnum(ApprovalRoleRequired, {
    message: 'Required role must be a valid ApprovalRoleRequired enum (SALES_MANAGER or FINANCE)',
  })
  requiredRole?: ApprovalRoleRequired;

  @IsOptional()
  @IsInt({ message: 'Sequence must be an integer' })
  @Min(1, { message: 'Sequence must be at least 1' })
  sequence?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
