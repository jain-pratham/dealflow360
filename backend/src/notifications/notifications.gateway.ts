import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/notifications',
})
export class NotificationsGateway {
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server: Server;

  @SubscribeMessage('joinUserRoom')
  handleJoinUserRoom(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (data?.userId) {
      const room = `user:${data.userId}`;
      client.join(room);
      this.logger.log(`Socket ${client.id} joined notification room: ${room}`);
      return { success: true, room };
    }
    return { success: false, error: 'User ID is required' };
  }

  emitToUser(userId: string, event: string, payload: any) {
    if (!this.server) return;
    const room = `user:${userId}`;
    this.server.to(room).emit(event, payload);
    this.logger.log(`[SOCKET] Emitted '${event}' to room '${room}'`);
  }
}
