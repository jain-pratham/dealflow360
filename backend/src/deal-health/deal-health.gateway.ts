import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*', // Should ideally be configured from environment, but using generic for now to match default
  },
  namespace: '/events', // Matches typical namespace if one exists, or root
})
export class DealHealthGateway {
  @WebSocketServer()
  server: Server;

  emitHealthUpdate(quotationId: string, score: number, status: string, alerts: any[]) {
    this.server.emit('dealHealth.updated', {
      quotationId,
      score,
      status,
      alerts,
    });
  }
}
