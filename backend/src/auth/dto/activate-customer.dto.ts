import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ActivateCustomerDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;
}
