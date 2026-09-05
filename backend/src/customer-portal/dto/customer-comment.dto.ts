import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CustomerCommentDto {
  @IsOptional()
  @IsUUID()
  lineId?: string;

  @IsString()
  @IsNotEmpty()
  comment: string;
}
