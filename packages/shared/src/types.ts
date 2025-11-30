// ============================================
// SUFBOT V5 - Shared Types
// ============================================

// Command Metadata
export interface CommandMeta {
  name: string;
  description: string;
  category: string;
  permissions: string[];
  botPermissions?: string[];
  cooldown: number; // in milliseconds
  guildOnly: boolean;
  ownerOnly: boolean;
  nsfw: boolean;
  panelEditable: boolean;
  enabled: boolean;
}

// Module Metadata
export interface ModuleMeta {
  name: string;
  description: string;
  enabled: boolean;
  commands: string[];
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Guild Settings
export interface GuildSettingsDto {
  id: string;
  name: string;
  icon: string | null;
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

// User Types
export interface UserDto {
  id: string;
  discordId: string;
  username: string;
  discriminator: string | null;
  avatar: string | null;
  role: 'USER' | 'MODERATOR' | 'ADMIN' | 'OWNER';
}

// Auth Types
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JwtPayload {
  sub: string;
  discordId: string;
  role: string;
  iat?: number;
  exp?: number;
}

// Bot Stats
export interface BotStatsDto {
  guildCount: number;
  userCount: number;
  channelCount: number;
  commandsUsed: number;
  memoryUsage: number;
  cpuUsage: number;
  uptime: number;
  shards: ShardInfo[];
}

export interface ShardInfo {
  id: number;
  status: 'ready' | 'connecting' | 'disconnected' | 'reconnecting';
  guildCount: number;
  ping: number;
  uptime: number;
}

// WebSocket Event Types
export interface WsMessage<T = unknown> {
  event: string;
  data: T;
  timestamp: number;
  signature?: string;
}

// Moderation Types
export interface ModLogEntry {
  id: string;
  caseNumber: number;
  action: ModActionType;
  userId: string;
  moderatorId: string;
  reason: string | null;
  duration: number | null;
  createdAt: Date;
}

export type ModActionType = 
  | 'WARN'
  | 'MUTE'
  | 'UNMUTE'
  | 'KICK'
  | 'BAN'
  | 'UNBAN'
  | 'TIMEOUT'
  | 'UNTIMEOUT';

// Economy Types
export interface EconomyUserDto {
  userId: string;
  balance: number;
  bank: number;
  totalEarned: number;
  totalSpent: number;
}

// Filter Types
export type FilterTypeEnum = 
  | 'WORDS'
  | 'LINKS'
  | 'CAPS'
  | 'SPAM'
  | 'INVITES'
  | 'MENTIONS';

export interface FilterDto {
  id: string;
  type: FilterTypeEnum;
  enabled: boolean;
  words?: string[];
  allowedDomains?: string[];
  capsThreshold?: number;
  minLength?: number;
  action: 'delete' | 'warn' | 'mute';
  exemptRoles: string[];
  exemptChannels: string[];
}

// Log Types
export type LogTypeEnum =
  | 'MESSAGE_DELETE'
  | 'MESSAGE_EDIT'
  | 'MEMBER_JOIN'
  | 'MEMBER_LEAVE'
  | 'MEMBER_BAN'
  | 'MEMBER_UNBAN'
  | 'ROLE_CREATE'
  | 'ROLE_DELETE'
  | 'CHANNEL_CREATE'
  | 'CHANNEL_DELETE'
  | 'VOICE_STATE'
  | 'MODERATION';

// Welcome Config
export interface WelcomeConfigDto {
  enabled: boolean;
  channelId: string | null;
  message: string | null;
  embedEnabled: boolean;
  embedColor: string | null;
  embedTitle: string | null;
  embedDescription: string | null;
  embedImage: string | null;
  embedThumbnail: boolean;
  leaveEnabled: boolean;
  leaveChannelId: string | null;
  leaveMessage: string | null;
  dmEnabled: boolean;
  dmMessage: string | null;
}

// Auto Role
export interface AutoRoleDto {
  id: string;
  roleId: string;
  delay: number;
  enabled: boolean;
}

// Custom Command
export interface CustomCommandDto {
  id: string;
  name: string;
  response: string;
  enabled: boolean;
  uses: number;
}

// Audit Log
export interface AuditLogDto {
  id: string;
  userId: string | null;
  action: string;
  target: string | null;
  targetId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: Date;
}
