// ============================================
// SUFBOT V5 - Bot Client
// ============================================

import { Client, GatewayIntentBits, Partials, Collection, REST, Routes, ActivityType, EmbedBuilder } from 'discord.js';
import { config } from './config';
import { logger } from './utils/logger';
import { prisma } from '@sufbot/database';
import type { Command, Module } from './types';
import { slashCommands, commandModuleMap, commandCooldowns } from './commands';
import * as handlers from './commands/handlers';

// Cache interface for guild settings
interface CacheManager {
  getGuildSettings: (guildId: string) => Promise<any | null>;
  setGuildSettings: (guildId: string, settings: any) => Promise<void>;
  deleteGuildSettings: (guildId: string) => Promise<void>;
  getCooldown: (userId: string, commandName: string) => Promise<number | null>;
  setCooldown: (userId: string, commandName: string, expiresAt: number) => Promise<void>;
}

// WebSocket client interface
interface WsClient {
  emitCommandExecute: (data: any) => void;
  emitCommandError: (data: any) => void;
  emitModAction: (data: any) => void;
  emit: (event: string, data: any) => void;
}

// Command handler interface
interface CommandHandler {
  deployCommands: (guildId?: string) => Promise<void>;
  reloadModule: (moduleName: string) => Promise<boolean>;
  reloadCommand: (commandName: string) => Promise<boolean>;
}

// Extend Client
declare module 'discord.js' {
  interface Client {
    commands: Collection<string, Command>;
    modules: Collection<string, Module>;
    cooldowns: Collection<string, Collection<string, number>>;
    cache: CacheManager;
    wsClient?: WsClient;
    commandHandler: CommandHandler;
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
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

// In-memory cache for guild settings and cooldowns
const guildSettingsCache = new Map<string, any>();
const cooldownCache = new Map<string, number>();

// Initialize cache manager
client.cache = {
  async getGuildSettings(guildId: string) {
    return guildSettingsCache.get(guildId) || null;
  },
  async setGuildSettings(guildId: string, settings: any) {
    guildSettingsCache.set(guildId, settings);
  },
  async deleteGuildSettings(guildId: string) {
    guildSettingsCache.delete(guildId);
  },
  async getCooldown(userId: string, commandName: string) {
    return cooldownCache.get(`${userId}:${commandName}`) || null;
  },
  async setCooldown(userId: string, commandName: string, expiresAt: number) {
    cooldownCache.set(`${userId}:${commandName}`, expiresAt);
    // Auto-cleanup after expiry
    setTimeout(() => {
      cooldownCache.delete(`${userId}:${commandName}`);
    }, expiresAt - Date.now());
  },
};

// Initialize command handler
client.commandHandler = {
  async deployCommands(guildId?: string) {
    // Command deployment logic
    logger.info(`Deploying commands${guildId ? ` to guild ${guildId}` : ' globally'}`);
  },
  async reloadModule(moduleName: string) {
    logger.info(`Reloading module: ${moduleName}`);
    return true;
  },
  async reloadCommand(commandName: string) {
    logger.info(`Reloading command: ${commandName}`);
    return true;
  },
};

// Sync guild to database
async function syncGuildToDatabase(guild: any) {
  try {
    await prisma.guild.upsert({
      where: { id: guild.id },
      update: {
        name: guild.name,
        icon: guild.icon,
        ownerId: guild.ownerId,
      },
      create: {
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        ownerId: guild.ownerId,
      },
    });
    logger.info(`Synced guild: ${guild.name} (${guild.id})`);
  } catch (error) {
    logger.error(`Failed to sync guild ${guild.id}:`, error);
  }
}

// Get next case number for modlog
async function getNextCaseNumber(guildId: string): Promise<number> {
  const lastCase = await prisma.modLog.findFirst({
    where: { guildId },
    orderBy: { caseNumber: 'desc' },
  });
  return (lastCase?.caseNumber || 0) + 1;
}

// Status rotation state
let statusRotationInterval: NodeJS.Timeout | null = null;
let currentActivityIndex = 0;

// Activity type mapping
const ACTIVITY_TYPE_MAP: Record<string, ActivityType> = {
  'PLAYING': ActivityType.Playing,
  'WATCHING': ActivityType.Watching,
  'LISTENING': ActivityType.Listening,
  'STREAMING': ActivityType.Streaming,
  'COMPETING': ActivityType.Competing,
};

// Load and apply bot status from database
async function loadBotStatus() {
  try {
    const config = await prisma.botConfig.findFirst();
    
    if (!config) {
      // Use default status
      client.user?.setPresence({
        activities: [{ name: '/help | sufbot.com', type: ActivityType.Watching }],
        status: 'online',
      });
      return;
    }

    const activities = JSON.parse(config.activities as string);
    
    // Clear existing rotation
    if (statusRotationInterval) {
      clearInterval(statusRotationInterval);
      statusRotationInterval = null;
    }

    // Apply initial status
    if (activities.length > 0) {
      applyActivity(activities[0], config.status as any);
    }

    // Set up rotation if enabled
    if (config.rotateStatus && activities.length > 1) {
      statusRotationInterval = setInterval(() => {
        currentActivityIndex = (currentActivityIndex + 1) % activities.length;
        applyActivity(activities[currentActivityIndex], config.status as any);
      }, config.rotateInterval * 1000);
    }

    logger.info(`Bot status loaded: ${config.status}, ${activities.length} activities, rotation: ${config.rotateStatus}`);
  } catch (error) {
    logger.error('Failed to load bot status:', error);
    // Fallback to default
    client.user?.setPresence({
      activities: [{ name: '/help | sufbot.com', type: ActivityType.Watching }],
      status: 'online',
    });
  }
}

function applyActivity(activity: any, status: 'online' | 'idle' | 'dnd' | 'invisible') {
  const activityType = ACTIVITY_TYPE_MAP[activity.type] || ActivityType.Playing;
  
  client.user?.setPresence({
    activities: [{
      name: activity.name,
      type: activityType,
      url: activity.type === 'STREAMING' ? activity.url : undefined,
    }],
    status,
  });
}

// Ready event
client.once('ready', async () => {
  logger.info(`Bot logged in as ${client.user?.tag}`);
  logger.info(`Serving ${client.guilds.cache.size} guilds`);

  // Load bot status from database
  await loadBotStatus();

  // Sync all guilds to database
  logger.info('Syncing guilds to database...');
  for (const guild of client.guilds.cache.values()) {
    await syncGuildToDatabase(guild);
  }
  logger.info('Guild sync complete');

  // Register slash commands
  await registerCommands();

  // Start stats recording interval (every 30 seconds)
  setInterval(recordBotStats, 30000);
  // Record initial stats
  await recordBotStats();
});

// Record bot stats to database
async function recordBotStats() {
  try {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // Calculate CPU percentage (rough estimate)
    const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000 / process.uptime() * 100;
    
    await prisma.botStats.create({
      data: {
        guildCount: client.guilds.cache.size,
        userCount: client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0),
        channelCount: client.channels.cache.size,
        memoryUsage: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        cpuUsage: Math.min(cpuPercent, 100),
        uptime: Math.floor(process.uptime()),
      },
    });
    
    logger.debug(`Stats recorded: ${client.guilds.cache.size} guilds, ${client.users.cache.size} users`);
  } catch (error) {
    logger.error('Failed to record stats:', error);
  }
}

// Guild join event - sync new guild
client.on('guildCreate', async (guild) => {
  logger.info(`Joined guild: ${guild.name} (${guild.id})`);
  await syncGuildToDatabase(guild);
});

// Guild leave event - optionally remove from database
client.on('guildDelete', async (guild) => {
  logger.info(`Left guild: ${guild.name} (${guild.id})`);
  // Keep guild data for potential rejoin, just mark as inactive if needed
});

// Member join event - Welcome system
client.on('guildMemberAdd', async (member) => {
  try {
    const welcomeConfig = await prisma.welcomeConfig.findUnique({
      where: { guildId: member.guild.id },
    });

    if (!welcomeConfig) return;

    // Process placeholders
    const processPlaceholders = (text: string) => {
      return text
        .replace(/{user}/g, `<@${member.id}>`)
        .replace(/{user\.tag}/g, member.user.tag)
        .replace(/{user\.name}/g, member.user.username)
        .replace(/{user\.id}/g, member.id)
        .replace(/{user\.avatar}/g, member.user.displayAvatarURL({ size: 256 }))
        .replace(/{server}/g, member.guild.name)
        .replace(/{server\.id}/g, member.guild.id)
        .replace(/{server\.icon}/g, member.guild.iconURL() || '')
        .replace(/{memberCount}/g, member.guild.memberCount.toLocaleString());
    };

    // Build embed from config
    const buildEmbed = (embedConfig: any) => {
      const embed: any = {
        color: parseInt(embedConfig.color?.replace('#', '') || '5865F2', 16),
      };
      
      if (embedConfig.title) embed.title = processPlaceholders(embedConfig.title);
      if (embedConfig.description) embed.description = processPlaceholders(embedConfig.description);
      if (embedConfig.thumbnail) embed.thumbnail = { url: processPlaceholders(embedConfig.thumbnail) };
      if (embedConfig.image) embed.image = { url: processPlaceholders(embedConfig.image) };
      if (embedConfig.footer) {
        embed.footer = { 
          text: processPlaceholders(embedConfig.footer),
          icon_url: embedConfig.footerIcon ? processPlaceholders(embedConfig.footerIcon) : undefined,
        };
      }
      if (embedConfig.author) {
        embed.author = {
          name: processPlaceholders(embedConfig.author),
          icon_url: embedConfig.authorIcon ? processPlaceholders(embedConfig.authorIcon) : undefined,
          url: embedConfig.authorUrl || undefined,
        };
      }
      if (embedConfig.timestamp) embed.timestamp = new Date().toISOString();
      if (embedConfig.fields?.length > 0) {
        embed.fields = embedConfig.fields.map((f: any) => ({
          name: processPlaceholders(f.name),
          value: processPlaceholders(f.value),
          inline: f.inline,
        }));
      }
      
      return embed;
    };

    // Send welcome channel message
    if (welcomeConfig.welcomeEnabled && welcomeConfig.welcomeChannelId) {
      const channel = member.guild.channels.cache.get(welcomeConfig.welcomeChannelId);
      if (channel?.isTextBased()) {
        if (welcomeConfig.welcomeMessageType === 'embed' && welcomeConfig.welcomeEmbed) {
          await (channel as any).send({ embeds: [buildEmbed(welcomeConfig.welcomeEmbed)] });
        } else if (welcomeConfig.welcomeMessage) {
          await (channel as any).send(processPlaceholders(welcomeConfig.welcomeMessage));
        }
      }
    }

    // Send DM message
    if (welcomeConfig.dmEnabled) {
      try {
        if (welcomeConfig.dmMessageType === 'embed' && welcomeConfig.dmEmbed) {
          await member.send({ embeds: [buildEmbed(welcomeConfig.dmEmbed)] });
        } else if (welcomeConfig.dmMessage) {
          await member.send(processPlaceholders(welcomeConfig.dmMessage));
        }
      } catch (err) {
        logger.debug(`Could not send DM to ${member.user.tag} - DMs may be disabled`);
      }
    }

    // Assign auto roles
    if (welcomeConfig.autoRolesEnabled && welcomeConfig.autoRoles.length > 0) {
      for (const roleId of welcomeConfig.autoRoles) {
        const role = member.guild.roles.cache.get(roleId);
        if (role) {
          try {
            await member.roles.add(role);
            logger.debug(`Added role ${role.name} to ${member.user.tag}`);
          } catch (err) {
            logger.error(`Failed to add role ${role.name} to ${member.user.tag}:`, err);
          }
        }
      }
    }

    logger.info(`Processed welcome for ${member.user.tag} in ${member.guild.name}`);
  } catch (error) {
    logger.error(`Error processing member join:`, error);
  }
});

// Member leave event - Leave message
client.on('guildMemberRemove', async (member) => {
  try {
    const welcomeConfig = await prisma.welcomeConfig.findUnique({
      where: { guildId: member.guild.id },
    });

    if (!welcomeConfig || !welcomeConfig.leaveEnabled || !welcomeConfig.leaveChannelId) return;

    // Process placeholders
    const processPlaceholders = (text: string) => {
      return text
        .replace(/{user}/g, `<@${member.id}>`)
        .replace(/{user\.tag}/g, member.user?.tag || 'Unknown User')
        .replace(/{user\.name}/g, member.user?.username || 'Unknown')
        .replace(/{user\.id}/g, member.id)
        .replace(/{user\.avatar}/g, member.user?.displayAvatarURL({ size: 256 }) || '')
        .replace(/{server}/g, member.guild.name)
        .replace(/{server\.id}/g, member.guild.id)
        .replace(/{server\.icon}/g, member.guild.iconURL() || '')
        .replace(/{memberCount}/g, member.guild.memberCount.toLocaleString());
    };

    // Build embed from config
    const buildEmbed = (embedConfig: any) => {
      const embed: any = {
        color: parseInt(embedConfig.color?.replace('#', '') || 'ED4245', 16),
      };
      
      if (embedConfig.title) embed.title = processPlaceholders(embedConfig.title);
      if (embedConfig.description) embed.description = processPlaceholders(embedConfig.description);
      if (embedConfig.thumbnail) embed.thumbnail = { url: processPlaceholders(embedConfig.thumbnail) };
      if (embedConfig.image) embed.image = { url: processPlaceholders(embedConfig.image) };
      if (embedConfig.footer) {
        embed.footer = { 
          text: processPlaceholders(embedConfig.footer),
          icon_url: embedConfig.footerIcon ? processPlaceholders(embedConfig.footerIcon) : undefined,
        };
      }
      if (embedConfig.author) {
        embed.author = {
          name: processPlaceholders(embedConfig.author),
          icon_url: embedConfig.authorIcon ? processPlaceholders(embedConfig.authorIcon) : undefined,
          url: embedConfig.authorUrl || undefined,
        };
      }
      if (embedConfig.timestamp) embed.timestamp = new Date().toISOString();
      if (embedConfig.fields?.length > 0) {
        embed.fields = embedConfig.fields.map((f: any) => ({
          name: processPlaceholders(f.name),
          value: processPlaceholders(f.value),
          inline: f.inline,
        }));
      }
      
      return embed;
    };

    const channel = member.guild.channels.cache.get(welcomeConfig.leaveChannelId);
    if (channel?.isTextBased()) {
      if (welcomeConfig.leaveMessageType === 'embed' && welcomeConfig.leaveEmbed) {
        await (channel as any).send({ embeds: [buildEmbed(welcomeConfig.leaveEmbed)] });
      } else if (welcomeConfig.leaveMessage) {
        await (channel as any).send(processPlaceholders(welcomeConfig.leaveMessage));
      }
    }

    logger.info(`Processed leave for ${member.user?.tag || 'Unknown'} in ${member.guild.name}`);
  } catch (error) {
    logger.error(`Error processing member leave:`, error);
  }
});

// Auto Responder handler
client.on('messageCreate', async (message) => {
  // Ignore bots and DMs
  if (message.author.bot || !message.guild) return;

  try {
    // Get auto responders for this guild
    const responders = await prisma.autoResponder.findMany({
      where: { 
        guildId: message.guild.id,
        enabled: true,
      },
    });

    if (responders.length === 0) return;

    const content = message.content.toLowerCase();
    const memberRoles = message.member?.roles.cache.map(r => r.id) || [];

    for (const responder of responders) {
      // Check trigger
      const trigger = responder.trigger.toLowerCase();
      let matches = false;

      if (responder.wildcard) {
        // Wildcard: check if message contains trigger
        matches = content.includes(trigger);
      } else {
        // Exact match: message equals trigger
        matches = content === trigger;
      }

      if (!matches) continue;

      // Check role restrictions
      if (responder.allowedRoles.length > 0) {
        const hasAllowedRole = responder.allowedRoles.some(r => memberRoles.includes(r));
        if (!hasAllowedRole) continue;
      }

      if (responder.disabledRoles.length > 0) {
        const hasDisabledRole = responder.disabledRoles.some(r => memberRoles.includes(r));
        if (hasDisabledRole) continue;
      }

      // Check channel restrictions
      if (responder.allowedChannels.length > 0) {
        if (!responder.allowedChannels.includes(message.channel.id)) continue;
      }

      if (responder.disabledChannels.length > 0) {
        if (responder.disabledChannels.includes(message.channel.id)) continue;
      }

      // Get replies and select one randomly
      const replies = JSON.parse(responder.replies);
      if (replies.length === 0) continue;

      const selectedReply = replies[Math.floor(Math.random() * replies.length)];

      // Process variables
      const processVariables = (text: string): string => {
        return text
          .replace(/{user}/g, `<@${message.author.id}>`)
          .replace(/{user\.name}/g, message.author.username)
          .replace(/{user\.id}/g, message.author.id)
          .replace(/{server}/g, message.guild?.name || '')
          .replace(/{channel}/g, message.channel.toString())
          .replace(/{membercount}/g, message.guild?.memberCount.toString() || '0');
      };

      const reply = processVariables(selectedReply);

      // Send response
      if (responder.sendAsReply) {
        await message.reply(reply);
      } else {
        await message.channel.send(reply);
      }

      logger.debug(`Auto responder triggered: "${responder.trigger}" in ${message.guild.name}`);
      break; // Only respond once per message
    }
  } catch (error) {
    logger.error('Error in auto responder:', error);
  }
});

// Check if command is disabled for a guild
async function isCommandDisabled(guildId: string, commandName: string): Promise<boolean> {
  const settings = await prisma.guildSettings.findUnique({
    where: { guildId },
  });
  
  if (!settings) return false;
  
  // Check if command is directly disabled
  if (settings.disabledCommands.includes(commandName)) {
    return true;
  }
  
  // Check if the command's module is disabled
  const module = commandModuleMap[commandName];
  if (module && settings.disabledModules.includes(module)) {
    return true;
  }
  
  // Check module-specific settings
  if (module === 'moderation' && !settings.moderationEnabled) {
    return true;
  }
  if (module === 'economy' && !settings.economyEnabled) {
    return true;
  }
  
  return false;
}

// Check cooldown
function checkCooldown(userId: string, commandName: string): number | null {
  if (!client.cooldowns.has(commandName)) {
    client.cooldowns.set(commandName, new Collection());
  }
  
  const now = Date.now();
  const timestamps = client.cooldowns.get(commandName)!;
  const cooldownAmount = (commandCooldowns[commandName] || 3) * 1000;
  
  if (timestamps.has(userId)) {
    const expirationTime = timestamps.get(userId)! + cooldownAmount;
    
    if (now < expirationTime) {
      const timeLeft = (expirationTime - now) / 1000;
      return timeLeft;
    }
  }
  
  timestamps.set(userId, now);
  setTimeout(() => timestamps.delete(userId), cooldownAmount);
  
  return null;
}

// Slash command handler
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (!interaction.guild) {
    return interaction.reply({ content: '❌ Commands can only be used in servers!', ephemeral: true });
  }

  const { commandName } = interaction;
  
  // Check if command is disabled
  const disabled = await isCommandDisabled(interaction.guild.id, commandName);
  if (disabled) {
    const embed = new EmbedBuilder()
      .setTitle('🚫 Command Disabled')
      .setDescription(`The \`/${commandName}\` command is disabled on this server.`)
      .setColor(0xFF0000)
      .setFooter({ text: 'Contact a server administrator to enable this command.' });
    
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
  
  // Check cooldown
  const cooldownTime = checkCooldown(interaction.user.id, commandName);
  if (cooldownTime !== null) {
    return interaction.reply({ 
      content: `⏳ Please wait **${cooldownTime.toFixed(1)}s** before using \`/${commandName}\` again.`, 
      ephemeral: true 
    });
  }
  
  try {
    // Route to appropriate handler
    switch (commandName) {
      // General commands
      case 'ping':
        await handlers.handlePing(interaction);
        break;
      case 'help':
        await handlers.handleHelp(interaction);
        break;
      case 'serverinfo':
        await handlers.handleServerinfo(interaction);
        break;
      case 'userinfo':
        await handlers.handleUserinfo(interaction);
        break;
      case 'avatar':
        await handlers.handleAvatar(interaction);
        break;
      case 'botinfo':
        await handlers.handleBotinfo(interaction, client);
        break;
        
      // Moderation commands
      case 'ban':
        await handlers.handleBan(interaction);
        break;
      case 'kick':
        await handlers.handleKick(interaction);
        break;
      case 'timeout':
        await handlers.handleTimeout(interaction);
        break;
      case 'untimeout':
        await handlers.handleUntimeout(interaction);
        break;
      case 'warn':
        await handlers.handleWarn(interaction);
        break;
      case 'warnings':
        await handlers.handleWarnings(interaction);
        break;
      case 'clearwarnings':
        await handlers.handleClearwarnings(interaction);
        break;
      case 'purge':
        await handlers.handlePurge(interaction);
        break;
      case 'slowmode':
        await handlers.handleSlowmode(interaction);
        break;
      case 'lock':
        await handlers.handleLock(interaction);
        break;
      case 'unlock':
        await handlers.handleUnlock(interaction);
        break;
      case 'modlogs':
        await handlers.handleModlogs(interaction);
        break;
        
      // Utility commands
      case 'poll':
        await handlers.handlePoll(interaction);
        break;
      case 'remind':
        await handlers.handleRemind(interaction);
        break;
        
      default:
        await interaction.reply({ content: '❌ Unknown command!', ephemeral: true });
    }
  } catch (error) {
    logger.error(`Error executing command ${commandName}:`, error);
    
    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Error')
      .setDescription('An error occurred while executing this command.')
      .setColor(0xFF0000);
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
    } else {
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
});

// Register slash commands
async function registerCommands() {
  const commands = slashCommands.map(cmd => cmd.data);

  const rest = new REST({ version: '10' }).setToken(config.discord.token);

  try {
    logger.info(`Registering ${commands.length} slash commands...`);
    
    // Register globally
    await rest.put(
      Routes.applicationCommands(config.discord.clientId),
      { body: commands },
    );
    
    logger.info(`Successfully registered ${commands.length} slash commands!`);
  } catch (error) {
    logger.error('Failed to register commands:', error);
  }
}

async function start() {
  try {
    logger.info('Starting SufBot V5...');
    logger.info(`Environment: ${config.env}`);

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
