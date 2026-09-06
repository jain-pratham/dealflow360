import { IsNotEmpty, IsString, IsObject } from 'class-validator';

export class SavePushSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  endpoint: string;

  @IsObject()
  @IsNotEmpty()
  keys: {
    p256dh: string;
    auth: string;
  };
}
