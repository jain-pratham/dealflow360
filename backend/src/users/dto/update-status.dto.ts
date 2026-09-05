import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateStatusDto {
  @IsNotEmpty({ message: 'isActive status is required' })
  @IsBoolean({ message: 'isActive must be a boolean value' })
  isActive: boolean;
}
