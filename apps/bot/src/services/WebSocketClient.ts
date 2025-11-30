// ============================================
// SUFBOT V5 - WebSocket Client for API Communication
// ============================================

import { io, Socket } from 'socket.io-client';
import { Client } from 'discord.js';
import { config } from '../config';
import { logger } from '../utils/logger';
import crypto from 'crypto';

export class WebSocketClient {
  private socket: Socket | null = null;
  private client: Client;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  constructor(client: Client) {
    this.client = client;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io(config.api.url, {
        auth: {
          token: this.generateAuthToken(),
          type: 'bot',
        },
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      this.socket.on('connect', () => {
        logger.info('WebSocket connected to API');
        this.reconnectAttempts = 0;
        this.registerHandlers();
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        logger.warn(`WebSocket disconnected: ${reason}`);
      });

      this.socket.on('connect_error', (error) => {
        this.reconnectAttempts++;
        logger.error(`WebSocket connection error (attempt ${this.reconnectAttempts}):`, error.message);
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(new Error('Max reconnection attempts reached'));
        }
      });

      this.socket.on('error', (error) => {
        logger.error('WebSocket error:', error);
      });

      // Timeout for initial connection
      setTimeout(() => {
        if (!this.socket?.connected) {
          reject(new Error('WebSocket connection timeout'));
        }
      }, 10000);
    });
  }

  private generateAuthToken(): string {
    const timestamp = Date.now();
    const payload = `bot:${timestamp}`;
    const signature = crypto
      .createHmac('sha256', config.websocket.secret)
      .update(payload)
      .digest('hex');
    
    return `${payload}:${signature}`;
  }

  private registerHandlers(): void {
    if (!this.socket) return;

    // Handle reload module request from API
    this.socket.on('bot:reload-module', async (data: { moduleName: string }) => {
      logger.info(`Received reload request for module: ${data.moduleName}`);
      const success = await this.client.commandHandler.reloadModule(data.moduleName);
      this.emit('bot:module-reloaded', { moduleName: data.moduleName, success });
    });

    // Handle reload command request from API
    this.socket.on('bot:reload-command', async (data: { commandName: string }) => {
      logger.info(`Received reload request for command: ${data.commandName}`);
      const success = await this.client.commandHandler.reloadCommand(data.commandName);
      this.emit('bot:command-reloaded', { commandName: data.commandName, success });
    });

    // Handle send message request from API
    this.socket.on('bot:send-message', async (data: { channelId: string; content: string; embed?: object }) => {
      try {
        const channel = await this.client.channels.fetch(data.channelId);
        if (channel?.isTextBased() && 'send' in channel) {
          await channel.send({
            content: data.content,
            embeds: data.embed ? [data.embed as any] : undefined,
          });
          this.emit('bot:message-sent', { channelId: data.channelId, success: true });
        }
      } catch (error) {
        logger.error('Failed to send message:', error);
        this.emit('bot:message-sent', { channelId: data.channelId, success: false, error: String(error) });
      }
    });

    // Handle stats request from API
    this.socket.on('bot:get-stats', async () => {
      const stats = await this.getStats();
      this.emit('bot:stats', stats);
    });

    // Handle guild settings update from API
    this.socket.on('guild:settings-updated', async (data: { guildId: string }) => {
      // Invalidate cache
      await this.client.cache.deleteGuildSettings(data.guildId);
      logger.debug(`Guild settings cache invalidated for ${data.guildId}`);
    });
  }

  private async getStats() {
    const guilds = this.client.guilds.cache;
    const users = guilds.reduce((acc, guild) => acc + guild.memberCount, 0);
    const channels = this.client.channels.cache.size;

    return {
      guildCount: guilds.size,
      userCount: users,
      channelCount: channels,
      uptime: this.client.uptime || 0,
      ping: this.client.ws.ping,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
      shardId: this.client.shard?.ids[0] ?? 0,
    };
  }

  emit(event: string, data: unknown): void {
    if (!this.socket?.connected) {
      logger.warn(`Cannot emit ${event}: WebSocket not connected`);
      return;
    }

    const timestamp = Date.now();
    const signature = crypto
      .createHmac('sha256', config.websocket.secret)
      .update(`${event}:${timestamp}:${JSON.stringify(data)}`)
      .digest('hex');

    this.socket.emit(event, {
      data,
      timestamp,
      signature,
    });
  }

  // Emit bot events to API
  emitGuildJoin(guild: { id: string; name: string; memberCount: number; ownerId: string }): void {
    this.emit('guild:join', guild);
  }

  emitGuildLeave(guild: { id: string; name: string }): void {
    this.emit('guild:leave', guild);
  }

  emitMemberJoin(data: { guildId: string; userId: string; username: string }): void {
    this.emit('member:join', data);
  }

  emitMemberLeave(data: { guildId: string; userId: string; username: string }): void {
    this.emit('member:leave', data);
  }

  emitModAction(data: { guildId: string; action: string; userId: string; moderatorId: string; reason?: string }): void {
    this.emit('mod:action', data);
  }

  emitCommandExecute(data: { guildId: string; userId: string; commandName: string; executionTime: number }): void {
    this.emit('command:execute', data);
  }

  emitCommandError(data: { guildId: string; userId: string; commandName: string; error: string }): void {
    this.emit('command:error', data);
  }

  emitLog(level: 'info' | 'warn' | 'error' | 'debug', message: string, meta?: Record<string, unknown>): void {
    this.emit('log:stream', { level, message, meta });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}
