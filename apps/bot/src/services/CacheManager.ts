// ============================================
// SUFBOT V5 - Cache Manager (Redis)
// ============================================

import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';
import type { GuildSettingsCache } from '../types';

export class CacheManager {
  private redis: Redis;
  private prefix = 'sufbot:';

  constructor() {
    this.redis = new Redis(config.redis.url, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    this.redis.on('error', (error) => {
      logger.error('Redis error:', error);
    });

    this.redis.on('connect', () => {
      logger.debug('Redis connected');
    });
  }

  async connect(): Promise<void> {
    // Connection is automatic with ioredis
    await this.redis.ping();
  }

  async disconnect(): Promise<void> {
    await this.redis.quit();
  }

  // Key helpers
  private key(type: string, id: string): string {
    return `${this.prefix}${type}:${id}`;
  }

  // Guild Settings Cache
  async getGuildSettings(guildId: string): Promise<GuildSettingsCache | null> {
    const data = await this.redis.get(this.key('guild', guildId));
    return data ? JSON.parse(data) : null;
  }

  async setGuildSettings(guildId: string, settings: GuildSettingsCache, ttl = 300): Promise<void> {
    await this.redis.setex(
      this.key('guild', guildId),
      ttl,
      JSON.stringify(settings)
    );
  }

  async deleteGuildSettings(guildId: string): Promise<void> {
    await this.redis.del(this.key('guild', guildId));
  }

  // Cooldown Management
  async getCooldown(userId: string, commandName: string): Promise<number | null> {
    const data = await this.redis.get(this.key('cooldown', `${userId}:${commandName}`));
    return data ? parseInt(data) : null;
  }

  async setCooldown(userId: string, commandName: string, expiresAt: number): Promise<void> {
    const ttl = Math.ceil((expiresAt - Date.now()) / 1000);
    if (ttl > 0) {
      await this.redis.setex(
        this.key('cooldown', `${userId}:${commandName}`),
        ttl,
        expiresAt.toString()
      );
    }
  }

  async deleteCooldown(userId: string, commandName: string): Promise<void> {
    await this.redis.del(this.key('cooldown', `${userId}:${commandName}`));
  }

  // Rate Limiting
  async checkRateLimit(identifier: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const key = this.key('ratelimit', identifier);
    const now = Date.now();
    const windowStart = now - (windowSeconds * 1000);

    // Remove old entries
    await this.redis.zremrangebyscore(key, 0, windowStart);

    // Count current entries
    const count = await this.redis.zcard(key);

    if (count >= limit) {
      const oldestEntry = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
      const resetAt = oldestEntry.length > 1 ? parseInt(oldestEntry[1]) + (windowSeconds * 1000) : now + (windowSeconds * 1000);
      
      return {
        allowed: false,
        remaining: 0,
        resetAt,
      };
    }

    // Add new entry
    await this.redis.zadd(key, now, `${now}`);
    await this.redis.expire(key, windowSeconds);

    return {
      allowed: true,
      remaining: limit - count - 1,
      resetAt: now + (windowSeconds * 1000),
    };
  }

  // Generic cache methods
  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(this.key('cache', key));
    return data ? JSON.parse(data) : null;
  }

  async set<T>(key: string, value: T, ttl = 300): Promise<void> {
    await this.redis.setex(
      this.key('cache', key),
      ttl,
      JSON.stringify(value)
    );
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(this.key('cache', key));
  }

  async exists(key: string): Promise<boolean> {
    return (await this.redis.exists(this.key('cache', key))) === 1;
  }

  // Pub/Sub for cross-shard communication
  async publish(channel: string, message: unknown): Promise<void> {
    await this.redis.publish(
      `${this.prefix}${channel}`,
      JSON.stringify(message)
    );
  }

  subscribe(channel: string, callback: (message: unknown) => void): void {
    const subscriber = this.redis.duplicate();
    subscriber.subscribe(`${this.prefix}${channel}`);
    subscriber.on('message', (ch, message) => {
      if (ch === `${this.prefix}${channel}`) {
        callback(JSON.parse(message));
      }
    });
  }

  // Stats
  async incrementStat(stat: string, amount = 1): Promise<number> {
    return await this.redis.incrby(this.key('stats', stat), amount);
  }

  async getStat(stat: string): Promise<number> {
    const value = await this.redis.get(this.key('stats', stat));
    return value ? parseInt(value) : 0;
  }
}
