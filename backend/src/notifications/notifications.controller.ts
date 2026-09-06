import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { WebPushService } from './web-push.service';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { SavePushSubscriptionDto } from './dto/push-subscription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly webPushService: WebPushService,
  ) {}

  @Get()
  async getUserNotifications(
    @GetUser('id') userId: string,
    @Query() query: QueryNotificationsDto,
  ) {
    return this.notificationsService.findUserNotifications(userId, query);
  }

  @Get('unread-count')
  async getUnreadCount(@GetUser('id') userId: string) {
    return this.notificationsService.getUnreadCount(userId);
  }

  @Get('vapid-public-key')
  async getVapidPublicKey() {
    return { vapidPublicKey: this.webPushService.getVapidPublicKey() };
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @GetUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(id, userId);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@GetUser('id') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteNotification(
    @GetUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.notificationsService.deleteNotification(id, userId);
  }

  @Post('push-subscriptions')
  @HttpCode(HttpStatus.CREATED)
  async savePushSubscription(
    @GetUser('id') userId: string,
    @Body() dto: SavePushSubscriptionDto,
  ) {
    return this.webPushService.saveSubscription(
      userId,
      dto.endpoint,
      dto.keys.p256dh,
      dto.keys.auth,
    );
  }

  @Delete('push-subscriptions/:id')
  @HttpCode(HttpStatus.OK)
  async removePushSubscription(
    @GetUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.webPushService.removeSubscription(userId, id);
  }
}
