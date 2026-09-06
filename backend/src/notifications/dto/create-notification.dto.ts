import { IsEnum, IsNotEmpty, IsOptional, IsString, IsObject } from 'class-validator';
import { NotificationPriority, NotificationType } from '@prisma/client';

export class CreateNotificationDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsEnum(NotificationType)
  @IsNotEmpty()
  type: NotificationType;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsOptional()
  entityType?: string;

  @IsString()
  @IsOptional()
  entityId?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsEnum(NotificationPriority)
  @IsOptional()
  priority?: NotificationPriority;

  @IsString()
  @IsOptional()
  deduplicationKey?: string;

  @IsOptional()
  sendEmail?: boolean;

  @IsOptional()
  sendPush?: boolean;
}
