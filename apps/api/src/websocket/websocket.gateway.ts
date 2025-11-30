import {
  WebSocketGateway as WsGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

interface AuthenticatedSocket extends Socket {
  data: {
    type: 'bot' | 'panel';
    authenticated: boolean;
  };
}

@WsGateway({
  cors: {
    origin: '*',
  },
})
export class WebSocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('WebSocketGateway');
  private botSocket: AuthenticatedSocket | null = null;

  constructor(private configService: ConfigService) {}

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: AuthenticatedSocket) {
    this.logger.log(`Client connected: ${client.id}`);
    client.data = { type: 'panel', authenticated: false };
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    if (client === this.botSocket) {
      this.botSocket = null;
      this.logger.warn('Bot disconnected');
    }
  }

  @SubscribeMessage('authenticate')
  handleAuthenticate(client: AuthenticatedSocket, payload: { token: string; type: 'bot' | 'panel' }) {
    const { token, type } = payload;

    if (type === 'bot') {
      // Verify bot token
      const [prefix, timestamp, signature] = token.split(':');
      const expectedPayload = `${prefix}:${timestamp}`;
      const expectedSignature = crypto
        .createHmac('sha256', this.configService.get('WS_SECRET') || '')
        .update(expectedPayload)
        .digest('hex');

      if (signature === expectedSignature) {
        client.data = { type: 'bot', authenticated: true };
        this.botSocket = client;
        client.emit('authenticated', { success: true });
        this.logger.log('Bot authenticated');
        return { success: true };
      }
    } else {
      // Panel authentication would use JWT
      client.data = { type: 'panel', authenticated: true };
      client.emit('authenticated', { success: true });
      return { success: true };
    }

    client.emit('authenticated', { success: false, error: 'Invalid token' });
    return { success: false };
  }

  // Forward events from bot to panels
  @SubscribeMessage('bot:stats')
  handleBotStats(client: AuthenticatedSocket, payload: any) {
    if (client.data.type !== 'bot' || !client.data.authenticated) return;
    this.server.emit('bot:stats:update', payload);
  }

  @SubscribeMessage('bot:ready')
  handleBotReady(client: AuthenticatedSocket, payload: any) {
    if (client.data.type !== 'bot' || !client.data.authenticated) return;
    this.server.emit('bot:ready', payload);
  }

  @SubscribeMessage('guild:join')
  handleGuildJoin(client: AuthenticatedSocket, payload: any) {
    if (client.data.type !== 'bot' || !client.data.authenticated) return;
    this.server.emit('guild:join', payload);
  }

  @SubscribeMessage('guild:leave')
  handleGuildLeave(client: AuthenticatedSocket, payload: any) {
    if (client.data.type !== 'bot' || !client.data.authenticated) return;
    this.server.emit('guild:leave', payload);
  }

  @SubscribeMessage('mod:action')
  handleModAction(client: AuthenticatedSocket, payload: any) {
    if (client.data.type !== 'bot' || !client.data.authenticated) return;
    this.server.emit('mod:action', payload);
  }

  @SubscribeMessage('command:execute')
  handleCommandExecute(client: AuthenticatedSocket, payload: any) {
    if (client.data.type !== 'bot' || !client.data.authenticated) return;
    this.server.emit('command:execute', payload);
  }

  @SubscribeMessage('log:stream')
  handleLogStream(client: AuthenticatedSocket, payload: any) {
    if (client.data.type !== 'bot' || !client.data.authenticated) return;
    this.server.emit('log:stream', payload);
  }

  // Send commands to bot from panel
  sendToBot(event: string, data: any) {
    if (this.botSocket && this.botSocket.data.authenticated) {
      this.botSocket.emit(event, data);
      return true;
    }
    return false;
  }

  reloadModule(moduleName: string) {
    return this.sendToBot('bot:reload-module', { moduleName });
  }

  reloadCommand(commandName: string) {
    return this.sendToBot('bot:reload-command', { commandName });
  }

  sendMessage(channelId: string, content: string, embed?: object) {
    return this.sendToBot('bot:send-message', { channelId, content, embed });
  }

  requestStats() {
    return this.sendToBot('bot:get-stats', {});
  }
}
