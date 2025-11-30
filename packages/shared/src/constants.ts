// ============================================
// SUFBOT V5 - Shared Constants
// ============================================

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  AUTH_LOGIN: '/auth/login',
  AUTH_CALLBACK: '/auth/callback',
  AUTH_REFRESH: '/auth/refresh',
  AUTH_LOGOUT: '/auth/logout',
  AUTH_ME: '/auth/me',

  // Guilds
  GUILDS: '/guilds',
  GUILD_BY_ID: (id: string) => `/guilds/${id}`,
  GUILD_SETTINGS: (id: string) => `/guilds/${id}/settings`,
  GUILD_MODULES: (id: string) => `/guilds/${id}/modules`,
  GUILD_COMMANDS: (id: string) => `/guilds/${id}/commands`,

  // Moderation
  GUILD_MODLOGS: (id: string) => `/guilds/${id}/modlogs`,
  GUILD_WARNINGS: (id: string) => `/guilds/${id}/warnings`,
  GUILD_FILTERS: (id: string) => `/guilds/${id}/filters`,

  // Economy
  GUILD_ECONOMY: (id: string) => `/guilds/${id}/economy`,
  GUILD_ECONOMY_USERS: (id: string) => `/guilds/${id}/economy/users`,

  // Welcome
  GUILD_WELCOME: (id: string) => `/guilds/${id}/welcome`,
  GUILD_AUTOROLES: (id: string) => `/guilds/${id}/autoroles`,

  // Logging
  GUILD_LOGS: (id: string) => `/guilds/${id}/logs`,
  GUILD_LOG_CHANNELS: (id: string) => `/guilds/${id}/log-channels`,

  // Custom Commands
  GUILD_CUSTOM_COMMANDS: (id: string) => `/guilds/${id}/custom-commands`,

  // Bot
  BOT_STATS: '/bot/stats',
  BOT_SHARDS: '/bot/shards',
  BOT_RELOAD_MODULE: '/bot/reload-module',
  BOT_SEND_MESSAGE: '/bot/send-message',
  BOT_COMMANDS: '/bot/commands',
  BOT_MODULES: '/bot/modules',

  // Admin
  ADMIN_USERS: '/admin/users',
  ADMIN_AUDIT_LOGS: '/admin/audit-logs',
  ADMIN_API_KEYS: '/admin/api-keys',
} as const;

// WebSocket Events
export const WS_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  AUTHENTICATED: 'authenticated',

  // Bot Events
  BOT_READY: 'bot:ready',
  BOT_STATS_UPDATE: 'bot:stats:update',
  BOT_SHARD_READY: 'bot:shard:ready',
  BOT_SHARD_DISCONNECT: 'bot:shard:disconnect',
  BOT_SHARD_RECONNECT: 'bot:shard:reconnect',

  // Guild Events
  GUILD_JOIN: 'guild:join',
  GUILD_LEAVE: 'guild:leave',
  GUILD_UPDATE: 'guild:update',
  GUILD_SETTINGS_UPDATE: 'guild:settings:update',

  // Member Events
  MEMBER_JOIN: 'member:join',
  MEMBER_LEAVE: 'member:leave',
  MEMBER_UPDATE: 'member:update',
  MEMBER_BAN: 'member:ban',
  MEMBER_UNBAN: 'member:unban',

  // Message Events
  MESSAGE_CREATE: 'message:create',
  MESSAGE_DELETE: 'message:delete',
  MESSAGE_UPDATE: 'message:update',

  // Moderation Events
  MOD_ACTION: 'mod:action',
  MOD_LOG_CREATE: 'mod:log:create',

  // Command Events
  COMMAND_EXECUTE: 'command:execute',
  COMMAND_ERROR: 'command:error',

  // Log Stream
  LOG_STREAM: 'log:stream',
} as const;

// Rate Limits
export const RATE_LIMITS = {
  DEFAULT: { ttl: 60, limit: 60 },
  AUTH: { ttl: 60, limit: 10 },
  GUILD_SETTINGS: { ttl: 60, limit: 30 },
  BOT_ACTIONS: { ttl: 60, limit: 15 },
  ADMIN: { ttl: 60, limit: 100 },
} as const;

// Permissions
export const PERMISSIONS = {
  // User Permissions
  VIEW_GUILD: 'view:guild',
  MANAGE_GUILD: 'manage:guild',
  MANAGE_MODULES: 'manage:modules',
  MANAGE_COMMANDS: 'manage:commands',
  MANAGE_MODERATION: 'manage:moderation',
  MANAGE_ECONOMY: 'manage:economy',
  MANAGE_WELCOME: 'manage:welcome',
  MANAGE_FILTERS: 'manage:filters',
  MANAGE_LOGS: 'manage:logs',
  VIEW_MODLOGS: 'view:modlogs',
  VIEW_AUDIT_LOGS: 'view:audit-logs',

  // Admin Permissions
  ADMIN_VIEW_ALL: 'admin:view:all',
  ADMIN_MANAGE_USERS: 'admin:manage:users',
  ADMIN_MANAGE_BOT: 'admin:manage:bot',
  ADMIN_VIEW_LOGS: 'admin:view:logs',
  ADMIN_MANAGE_API_KEYS: 'admin:manage:api-keys',
} as const;

// Role Permissions Mapping
export const ROLE_PERMISSIONS = {
  USER: [
    PERMISSIONS.VIEW_GUILD,
  ],
  MODERATOR: [
    PERMISSIONS.VIEW_GUILD,
    PERMISSIONS.VIEW_MODLOGS,
    PERMISSIONS.MANAGE_MODERATION,
  ],
  ADMIN: [
    PERMISSIONS.VIEW_GUILD,
    PERMISSIONS.MANAGE_GUILD,
    PERMISSIONS.MANAGE_MODULES,
    PERMISSIONS.MANAGE_COMMANDS,
    PERMISSIONS.MANAGE_MODERATION,
    PERMISSIONS.MANAGE_ECONOMY,
    PERMISSIONS.MANAGE_WELCOME,
    PERMISSIONS.MANAGE_FILTERS,
    PERMISSIONS.MANAGE_LOGS,
    PERMISSIONS.VIEW_MODLOGS,
    PERMISSIONS.VIEW_AUDIT_LOGS,
  ],
  OWNER: Object.values(PERMISSIONS),
} as const;

// Command Categories
export const COMMAND_CATEGORIES = {
  MODERATION: 'moderation',
  ECONOMY: 'economy',
  UTILITY: 'utility',
  FUN: 'fun',
  INFO: 'info',
  ADMIN: 'admin',
  CONFIG: 'config',
} as const;

// Colors
export const COLORS = {
  PRIMARY: 0x5865F2,
  SUCCESS: 0x57F287,
  WARNING: 0xFEE75C,
  ERROR: 0xED4245,
  INFO: 0x5865F2,
  MODERATION: 0xEB459E,
} as const;

// Cooldowns (in milliseconds)
export const COOLDOWNS = {
  DEFAULT: 3000,
  ECONOMY: 5000,
  MODERATION: 2000,
  ADMIN: 1000,
} as const;

// Limits
export const LIMITS = {
  MAX_WARNINGS: 10,
  MAX_CUSTOM_COMMANDS: 50,
  MAX_AUTO_ROLES: 10,
  MAX_FILTER_WORDS: 500,
  MAX_EXEMPT_ROLES: 20,
  MAX_EXEMPT_CHANNELS: 20,
  MAX_MESSAGE_LENGTH: 2000,
  MAX_EMBED_DESCRIPTION: 4096,
} as const;
