import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { CustomerTier } from '@prisma/client';

export class CreateCustomerDto {
  @IsNotEmpty({ message: 'Company name is required' })
  @IsString()
  @MinLength(1, { message: 'Company name cannot be empty' })
  companyName: string;

  @IsNotEmpty({ message: 'Contact person is required' })
  @IsString()
  @MinLength(1, { message: 'Contact person cannot be empty' })
  contactName: string;

  @IsNotEmpty({ message: 'Email address is required' })
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsEnum(CustomerTier, { message: 'Invalid customer tier' })
  tier?: CustomerTier;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
