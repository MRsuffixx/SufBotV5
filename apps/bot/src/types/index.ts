// ============================================
// SUFBOT V5 - Bot Types
// ============================================

import {
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  PermissionResolvable,
  Client,
  Message,
  Interaction,
} from 'discord.js';

// Command Types
export interface CommandMeta {
  name: string;
  description: string;
  category: string;
  permissions: PermissionResolvable[];
  botPermissions: PermissionResolvable[];
  cooldown: number;
  guildOnly: boolean;
  ownerOnly: boolean;
  nsfw: boolean;
  panelEditable: boolean;
  enabled: boolean;
}

export type SlashCommandData = 
  | SlashCommandBuilder 
  | SlashCommandOptionsOnlyBuilder 
  | SlashCommandSubcommandsOnlyBuilder
  | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;

export interface Command {
  meta: CommandMeta;
  data: SlashCommandData;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}

// Module Types
export interface Module {
  name: string;
  description: string;
  enabled: boolean;
  commands: string[];
  events?: string[];
  onLoad?: (client: Client) => Promise<void>;
  onUnload?: (client: Client) => Promise<void>;
}

// Event Types
export interface Event<T extends unknown[] = unknown[]> {
  name: string;
  once?: boolean;
  execute: (...args: T) => Promise<void> | void;
}

// Guild Settings Cache
export interface GuildSettingsCache {
  prefix: string;
  language: string;
  timezone: string;
  moderationEnabled: boolean;
  economyEnabled: boolean;
  welcomeEnabled: boolean;
  loggingEnabled: boolean;
  autoModEnabled: boolean;
  disabledCommands: string[];
  disabledModules: string[];
}

// Cooldown Entry
export interface CooldownEntry {
  command: string;
  userId: string;
  expiresAt: number;
}

// Command Execution Context
export interface CommandContext {
  interaction: ChatInputCommandInteraction;
  client: Client;
  guildSettings?: GuildSettingsCache;
}

// Moderation Action
export interface ModerationAction {
  type: 'warn' | 'mute' | 'unmute' | 'kick' | 'ban' | 'unban' | 'timeout' | 'untimeout';
  guildId: string;
  userId: string;
  moderatorId: string;
  reason?: string;
  duration?: number;
}

// Economy Transaction
export interface EconomyTransaction {
  guildId: string;
  userId: string;
  amount: number;
  type: 'add' | 'remove' | 'set' | 'transfer';
  reason?: string;
  targetUserId?: string;
}

// Filter Match Result
export interface FilterMatchResult {
  matched: boolean;
  filterType?: string;
  matchedContent?: string;
  action?: 'delete' | 'warn' | 'mute';
}

// Welcome Message Variables
export interface WelcomeVariables {
  user: string;
  username: string;
  userId: string;
  server: string;
  serverName: string;
  memberCount: number;
  mention: string;
}

// Log Entry
export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: Date;
  meta?: Record<string, unknown>;
}

// API Message Types
export interface ApiMessage {
  type: string;
  data: unknown;
  timestamp: number;
  signature?: string;
}

// Shard Stats
export interface ShardStats {
  shardId: number;
  guildCount: number;
  memberCount: number;
  ping: number;
  uptime: number;
  status: 'ready' | 'connecting' | 'disconnected' | 'reconnecting';
}
