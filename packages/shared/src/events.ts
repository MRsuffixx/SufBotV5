// ============================================
// SUFBOT V5 - WebSocket Event Payloads
// ============================================

import { BotStatsDto, ModLogEntry, ShardInfo } from './types';

// Base Event
export interface BaseEvent {
  timestamp: number;
  signature?: string;
}

// Bot Events
export interface BotReadyEvent extends BaseEvent {
  shardCount: number;
  guildCount: number;
}

export interface BotStatsUpdateEvent extends BaseEvent {
  stats: BotStatsDto;
}

export interface ShardReadyEvent extends BaseEvent {
  shardId: number;
  guildCount: number;
}

export interface ShardDisconnectEvent extends BaseEvent {
  shardId: number;
  code: number;
  reason: string;
}

// Guild Events
export interface GuildJoinEvent extends BaseEvent {
  guildId: string;
  guildName: string;
  memberCount: number;
  ownerId: string;
}

export interface GuildLeaveEvent extends BaseEvent {
  guildId: string;
  guildName: string;
}

export interface GuildUpdateEvent extends BaseEvent {
  guildId: string;
  changes: Record<string, unknown>;
}

export interface GuildSettingsUpdateEvent extends BaseEvent {
  guildId: string;
  settings: Record<string, unknown>;
  updatedBy: string;
}

// Member Events
export interface MemberJoinEvent extends BaseEvent {
  guildId: string;
  userId: string;
  username: string;
  accountCreatedAt: number;
}

export interface MemberLeaveEvent extends BaseEvent {
  guildId: string;
  userId: string;
  username: string;
}

export interface MemberBanEvent extends BaseEvent {
  guildId: string;
  userId: string;
  moderatorId: string;
  reason: string | null;
}

// Message Events
export interface MessageCreateEvent extends BaseEvent {
  guildId: string;
  channelId: string;
  messageId: string;
  authorId: string;
  content: string;
}

export interface MessageDeleteEvent extends BaseEvent {
  guildId: string;
  channelId: string;
  messageId: string;
  authorId: string | null;
  content: string | null;
}

export interface MessageUpdateEvent extends BaseEvent {
  guildId: string;
  channelId: string;
  messageId: string;
  oldContent: string | null;
  newContent: string;
}

// Moderation Events
export interface ModActionEvent extends BaseEvent {
  guildId: string;
  action: string;
  userId: string;
  moderatorId: string;
  reason: string | null;
  duration: number | null;
}

export interface ModLogCreateEvent extends BaseEvent {
  guildId: string;
  modLog: ModLogEntry;
}

// Command Events
export interface CommandExecuteEvent extends BaseEvent {
  guildId: string;
  channelId: string;
  userId: string;
  commandName: string;
  args: string[];
  executionTime: number;
}

export interface CommandErrorEvent extends BaseEvent {
  guildId: string;
  channelId: string;
  userId: string;
  commandName: string;
  error: string;
}

// Log Stream Event
export interface LogStreamEvent extends BaseEvent {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  meta?: Record<string, unknown>;
}

// Event Map for type safety
export interface EventMap {
  'bot:ready': BotReadyEvent;
  'bot:stats:update': BotStatsUpdateEvent;
  'bot:shard:ready': ShardReadyEvent;
  'bot:shard:disconnect': ShardDisconnectEvent;
  'guild:join': GuildJoinEvent;
  'guild:leave': GuildLeaveEvent;
  'guild:update': GuildUpdateEvent;
  'guild:settings:update': GuildSettingsUpdateEvent;
  'member:join': MemberJoinEvent;
  'member:leave': MemberLeaveEvent;
  'member:ban': MemberBanEvent;
  'message:create': MessageCreateEvent;
  'message:delete': MessageDeleteEvent;
  'message:update': MessageUpdateEvent;
  'mod:action': ModActionEvent;
  'mod:log:create': ModLogCreateEvent;
  'command:execute': CommandExecuteEvent;
  'command:error': CommandErrorEvent;
  'log:stream': LogStreamEvent;
}

export type EventName = keyof EventMap;
