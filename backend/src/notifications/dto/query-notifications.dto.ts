import { IsOptional, IsBooleanString, IsEnum, IsString } from 'class-validator';
import { NotificationType, NotificationPriority } from '@prisma/client';

export class QueryNotificationsDto {
  @IsBooleanString()
  @IsOptional()
  unreadOnly?: string;

  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @IsEnum(NotificationPriority)
  @IsOptional()
  priority?: NotificationPriority;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  limit?: string;

  @IsString()
  @IsOptional()
  offset?: string;
}
