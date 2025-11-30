// ============================================
// SUFBOT V5 - Bot Entry Point
// ============================================

import { ShardingManager } from 'discord.js';
import { config } from './config';
import { logger } from './utils/logger';
import path from 'path';

// In development with ts-node-dev, use .ts extension; in production use .js
const botFile = process.env.NODE_ENV === 'production' 
  ? path.join(__dirname, 'bot.js')
  : path.join(__dirname, 'bot.ts');

const manager = new ShardingManager(botFile, {
  execArgv: process.env.NODE_ENV !== 'production' ? ['-r', 'ts-node/register'] : [],
  token: config.discord.token,
  totalShards: config.sharding.shardCount === 'auto' ? 'auto' : parseInt(config.sharding.shardCount),
  respawn: true,
});

manager.on('shardCreate', (shard) => {
  logger.info(`Shard ${shard.id} launched`);

  shard.on('ready', () => {
    logger.info(`Shard ${shard.id} is ready`);
  });

  shard.on('disconnect', () => {
    logger.warn(`Shard ${shard.id} disconnected`);
  });

  shard.on('reconnecting', () => {
    logger.info(`Shard ${shard.id} reconnecting`);
  });

  shard.on('death', (process) => {
    logger.error(`Shard ${shard.id} died with exit code ${process.exitCode}`);
  });

  shard.on('error', (error) => {
    logger.error(`Shard ${shard.id} error:`, error);
  });
});

async function start() {
  try {
    logger.info('Starting SufBot V5...');
    logger.info(`Environment: ${config.env}`);
    
    await manager.spawn();
    
    logger.info(`All shards spawned successfully`);
  } catch (error) {
    logger.error('Failed to start bot:', error);
    process.exit(1);
  }
}

start();

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down...');
  process.exit(0);
});
