// ============================================
// SUFBOT V5 - Ready Event
// ============================================

import { Client, ActivityType } from 'discord.js';
import { logger } from '../utils/logger';
import { config } from '../config';
import type { Event } from '../types';

const event: Event<[Client<true>]> = {
  name: 'ready',
  once: true,
  async execute(client) {
    logger.info(`Logged in as ${client.user.tag}`);
    logger.info(`Serving ${client.guilds.cache.size} guilds`);
    logger.info(`Shard: ${client.shard?.ids[0] ?? 'N/A'}`);

    // Set bot presence
    client.user.setPresence({
      activities: [
        {
          name: `/help | ${client.guilds.cache.size} servers`,
          type: ActivityType.Watching,
        },
      ],
      status: 'online',
    });

    // Deploy commands in development
    if (config.env === 'development' && config.discord.guildId) {
      try {
        await client.commandHandler.deployCommands(config.discord.guildId);
        logger.info('Commands deployed to development guild');
      } catch (error) {
        logger.error('Failed to deploy commands:', error);
      }
    }

    // Emit ready event to API
    client.wsClient?.emit('bot:ready', {
      shardId: client.shard?.ids[0] ?? 0,
      guildCount: client.guilds.cache.size,
      userCount: client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0),
    });
  },
};

export default event;
