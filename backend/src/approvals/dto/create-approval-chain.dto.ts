import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApprovalRoleRequired } from '@prisma/client';

export class CreateApprovalChainDto {
  @IsNotEmpty({ message: 'Approval chain name cannot be empty' })
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description?: string;

  @IsNotEmpty({ message: 'Required role is mandatory' })
  @IsEnum(ApprovalRoleRequired, {
    message: 'Required role must be a valid ApprovalRoleRequired enum (SALES_MANAGER or FINANCE)',
  })
  requiredRole: ApprovalRoleRequired;

  @IsNotEmpty({ message: 'Sequence is mandatory' })
  @IsInt({ message: 'Sequence must be an integer' })
  @Min(1, { message: 'Sequence must be at least 1' })
  sequence: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
