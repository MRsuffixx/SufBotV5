// ============================================
// SUFBOT V5 - Bot Configuration
// ============================================

import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from root
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const configSchema = z.object({
  env: z.enum(['development', 'production', 'test']).default('development'),
  
  discord: z.object({
    token: z.string().min(1, 'Discord token is required'),
    clientId: z.string().min(1, 'Discord client ID is required'),
    guildId: z.string().optional(), // Dev guild for testing
  }),
  
  database: z.object({
    url: z.string().min(1, 'Database URL is required'),
  }),
  
  redis: z.object({
    url: z.string().default('redis://localhost:6379'),
    host: z.string().default('localhost'),
    port: z.coerce.number().default(6379),
    password: z.string().optional(),
  }),
  
  api: z.object({
    url: z.string().default('http://localhost:4000'),
    secret: z.string().min(1, 'API secret is required'),
  }),
  
  websocket: z.object({
    port: z.coerce.number().default(4001),
    secret: z.string().min(1, 'WebSocket secret is required'),
  }),
  
  sharding: z.object({
    shardCount: z.string().optional().default('1'),
    shardsPerCluster: z.coerce.number().optional().default(1),
  }),
  
  logging: z.object({
    level: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
    dir: z.string().default('./logs'),
  }),
  
  sentry: z.object({
    dsn: z.string().optional(),
    environment: z.string().default('development'),
  }),
});

const rawConfig = {
  env: process.env.NODE_ENV,
  
  discord: {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
    guildId: process.env.DISCORD_GUILD_ID,
  },
  
  database: {
    url: process.env.DATABASE_URL,
  },
  
  redis: {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
  },
  
  api: {
    url: process.env.API_URL,
    secret: process.env.API_SECRET,
  },
  
  websocket: {
    port: process.env.WS_PORT,
    secret: process.env.WS_SECRET,
  },
  
  sharding: {
    shardCount: process.env.SHARD_COUNT,
    shardsPerCluster: process.env.SHARDS_PER_CLUSTER,
  },
  
  logging: {
    level: process.env.LOG_LEVEL,
    dir: process.env.LOG_DIR,
  },
  
  sentry: {
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT,
  },
};

export const config = configSchema.parse(rawConfig);
export type Config = z.infer<typeof configSchema>;
