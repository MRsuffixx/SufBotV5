// ============================================
// SUFBOT V5 - Bot Client
// ============================================

import { Client, GatewayIntentBits, Partials, Collection } from 'discord.js';
import { config } from './config';
import { logger } from './utils/logger';
import { prisma } from '@sufbot/database';
import { CommandHandler } from './handlers/CommandHandler';
import { EventHandler } from './handlers/EventHandler';
import { WebSocketClient } from './services/WebSocketClient';
import { CacheManager } from './services/CacheManager';
import type { Command, Module } from './types';

// Extend Client
declare module 'discord.js' {
  interface Client {
    commands: Collection<string, Command>;
    modules: Collection<string, Module>;
    cooldowns: Collection<string, Collection<string, number>>;
    commandHandler: CommandHandler;
    eventHandler: EventHandler;
    wsClient: WebSocketClient;
    cache: CacheManager;
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildIntegrations,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions,
    GatewayIntentBits.DirectMessageTyping,
    GatewayIntentBits.MessageContent,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.User,
    Partials.GuildMember,
  ],
  allowedMentions: {
    parse: ['users', 'roles'],
    repliedUser: true,
  },
});

// Initialize collections
client.commands = new Collection();
client.modules = new Collection();
client.cooldowns = new Collection();

async function start() {
  try {
    logger.info('Initializing bot...');

    // Initialize cache manager
    client.cache = new CacheManager();
    await client.cache.connect();
    logger.info('Cache manager connected');

    // Initialize handlers
    client.commandHandler = new CommandHandler(client);
    client.eventHandler = new EventHandler(client);

    // Load commands and events
    await client.commandHandler.loadCommands();
    await client.eventHandler.loadEvents();

    // Initialize WebSocket client for API communication
    client.wsClient = new WebSocketClient(client);
    await client.wsClient.connect();
    logger.info('WebSocket client connected');

    // Login to Discord
    await client.login(config.discord.token);

  } catch (error) {
    logger.error('Failed to start bot:', error);
    process.exit(1);
  }
}

start();

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down...');
  
  try {
    client.wsClient?.disconnect();
    await client.cache?.disconnect();
    await prisma.$disconnect();
    client.destroy();
  } catch (error) {
    logger.error('Error during shutdown:', error);
  }
  
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export { client };
