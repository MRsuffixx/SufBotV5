// ============================================
// SUFBOT V5 - Bot Client
// ============================================

import { Client, GatewayIntentBits, Partials, Collection, REST, Routes, ActivityType } from 'discord.js';
import { config } from './config';
import { logger } from './utils/logger';
import { prisma } from '@sufbot/database';
import type { Command, Module } from './types';

// Extend Client
declare module 'discord.js' {
  interface Client {
    commands: Collection<string, Command>;
    modules: Collection<string, Module>;
    cooldowns: Collection<string, Collection<string, number>>;
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

// Ready event
client.once('ready', async () => {
  logger.info(`Bot logged in as ${client.user?.tag}`);
  logger.info(`Serving ${client.guilds.cache.size} guilds`);

  // Set bot status
  client.user?.setPresence({
    activities: [{ name: '/help | sufbot.com', type: ActivityType.Watching }],
    status: 'online',
  });

  // Sync all guilds to database
  logger.info('Syncing guilds to database...');
  for (const guild of client.guilds.cache.values()) {
    await syncGuildToDatabase(guild);
  }
  logger.info('Guild sync complete');

  // Register slash commands
  await registerCommands();
});

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

// Message handler for prefix commands
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  const prefix = '!'; // Default prefix
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift()?.toLowerCase();

  if (!commandName) return;

  // Handle basic commands
  if (commandName === 'ping') {
    const sent = await message.reply('Pinging...');
    await sent.edit(`🏓 Pong! Latency: ${sent.createdTimestamp - message.createdTimestamp}ms | API: ${Math.round(client.ws.ping)}ms`);
  }

  if (commandName === 'help') {
    await message.reply({
      embeds: [{
        title: '📚 SufBot Help',
        description: 'Available commands:',
        fields: [
          { name: '!ping', value: 'Check bot latency', inline: true },
          { name: '!help', value: 'Show this help', inline: true },
          { name: '!serverinfo', value: 'Server information', inline: true },
          { name: '!userinfo', value: 'User information', inline: true },
          { name: '!ban', value: 'Ban a user (Admin)', inline: true },
          { name: '!kick', value: 'Kick a user (Admin)', inline: true },
        ],
        color: 0x5865F2,
        footer: { text: 'Use /help for slash commands' },
      }],
    });
  }

  if (commandName === 'serverinfo') {
    const guild = message.guild;
    await message.reply({
      embeds: [{
        title: `📊 ${guild.name}`,
        thumbnail: { url: guild.iconURL() || '' },
        fields: [
          { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
          { name: 'Members', value: guild.memberCount.toString(), inline: true },
          { name: 'Channels', value: guild.channels.cache.size.toString(), inline: true },
          { name: 'Roles', value: guild.roles.cache.size.toString(), inline: true },
          { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
          { name: 'Boost Level', value: guild.premiumTier.toString(), inline: true },
        ],
        color: 0x5865F2,
      }],
    });
  }

  if (commandName === 'userinfo') {
    const target = message.mentions.members?.first() || message.member;
    if (!target) return;
    
    await message.reply({
      embeds: [{
        title: `👤 ${target.user.tag}`,
        thumbnail: { url: target.user.displayAvatarURL() },
        fields: [
          { name: 'ID', value: target.id, inline: true },
          { name: 'Nickname', value: target.nickname || 'None', inline: true },
          { name: 'Joined Server', value: `<t:${Math.floor((target.joinedTimestamp || 0) / 1000)}:R>`, inline: true },
          { name: 'Account Created', value: `<t:${Math.floor(target.user.createdTimestamp / 1000)}:R>`, inline: true },
          { name: 'Roles', value: target.roles.cache.map(r => r.name).slice(0, 10).join(', ') || 'None', inline: false },
        ],
        color: 0x5865F2,
      }],
    });
  }

  // Moderation commands
  if (commandName === 'ban') {
    if (!message.member?.permissions.has('BanMembers')) {
      return message.reply('❌ You need Ban Members permission!');
    }
    const target = message.mentions.members?.first();
    if (!target) return message.reply('❌ Please mention a user to ban!');
    const reason = args.slice(1).join(' ') || 'No reason provided';
    
    try {
      await target.ban({ reason });
      await message.reply(`✅ Banned ${target.user.tag} | Reason: ${reason}`);
      
      // Log to database
      const caseNumber = await getNextCaseNumber(message.guild.id);
      await prisma.modLog.create({
        data: {
          guildId: message.guild.id,
          caseNumber,
          moderatorId: message.author.id,
          userId: target.id,
          action: 'BAN',
          reason,
        },
      });
    } catch (error) {
      await message.reply('❌ Failed to ban user!');
    }
  }

  if (commandName === 'kick') {
    if (!message.member?.permissions.has('KickMembers')) {
      return message.reply('❌ You need Kick Members permission!');
    }
    const target = message.mentions.members?.first();
    if (!target) return message.reply('❌ Please mention a user to kick!');
    const reason = args.slice(1).join(' ') || 'No reason provided';
    
    try {
      await target.kick(reason);
      await message.reply(`✅ Kicked ${target.user.tag} | Reason: ${reason}`);
      
      // Log to database
      const caseNumber = await getNextCaseNumber(message.guild.id);
      await prisma.modLog.create({
        data: {
          guildId: message.guild.id,
          caseNumber,
          moderatorId: message.author.id,
          userId: target.id,
          action: 'KICK',
          reason,
        },
      });
    } catch (error) {
      await message.reply('❌ Failed to kick user!');
    }
  }
});

// Slash command handler
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'ping') {
    await interaction.reply(`🏓 Pong! Latency: ${Date.now() - interaction.createdTimestamp}ms | API: ${Math.round(client.ws.ping)}ms`);
  }

  if (commandName === 'help') {
    await interaction.reply({
      embeds: [{
        title: '📚 SufBot Help',
        description: 'A powerful Discord bot for server management',
        fields: [
          { name: '/ping', value: 'Check bot latency', inline: true },
          { name: '/help', value: 'Show this help', inline: true },
          { name: '/serverinfo', value: 'Server information', inline: true },
        ],
        color: 0x5865F2,
      }],
    });
  }

  if (commandName === 'serverinfo') {
    const guild = interaction.guild;
    if (!guild) return;
    
    await interaction.reply({
      embeds: [{
        title: `📊 ${guild.name}`,
        thumbnail: { url: guild.iconURL() || '' },
        fields: [
          { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
          { name: 'Members', value: guild.memberCount.toString(), inline: true },
          { name: 'Channels', value: guild.channels.cache.size.toString(), inline: true },
        ],
        color: 0x5865F2,
      }],
    });
  }
});

// Register slash commands
async function registerCommands() {
  const commands = [
    {
      name: 'ping',
      description: 'Check bot latency',
    },
    {
      name: 'help',
      description: 'Show help information',
    },
    {
      name: 'serverinfo',
      description: 'Show server information',
    },
  ];

  const rest = new REST({ version: '10' }).setToken(config.discord.token);

  try {
    logger.info('Registering slash commands...');
    
    // Register globally
    await rest.put(
      Routes.applicationCommands(config.discord.clientId),
      { body: commands },
    );
    
    logger.info('Slash commands registered!');
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
