// ============================================
// SUFBOT V5 - Slash Command Handlers
// ============================================

import { 
  ChatInputCommandInteraction, 
  EmbedBuilder, 
  ChannelType,
  TextChannel,
  PermissionFlagsBits,
  Client
} from 'discord.js';
import { prisma } from '@sufbot/database';
import { logger } from '../utils/logger';

// Get next case number for modlog
async function getNextCaseNumber(guildId: string): Promise<number> {
  const lastCase = await prisma.modLog.findFirst({
    where: { guildId },
    orderBy: { caseNumber: 'desc' },
  });
  return (lastCase?.caseNumber || 0) + 1;
}

// ============================================
// General Commands
// ============================================

export async function handlePing(interaction: ChatInputCommandInteraction) {
  const sent = await interaction.reply({ content: '🏓 Pinging...', fetchReply: true });
  const latency = sent.createdTimestamp - interaction.createdTimestamp;
  const apiLatency = Math.round(interaction.client.ws.ping);
  
  const embed = new EmbedBuilder()
    .setTitle('🏓 Pong!')
    .setColor(latency < 100 ? 0x00FF00 : latency < 200 ? 0xFFFF00 : 0xFF0000)
    .addFields(
      { name: 'Bot Latency', value: `\`${latency}ms\``, inline: true },
      { name: 'API Latency', value: `\`${apiLatency}ms\``, inline: true },
    )
    .setTimestamp();
  
  await interaction.editReply({ content: '', embeds: [embed] });
}

export async function handleHelp(interaction: ChatInputCommandInteraction) {
  const commandName = interaction.options.getString('command');
  
  if (commandName) {
    // Show specific command help
    const commandHelp: Record<string, { description: string; usage: string; examples: string[] }> = {
      'ping': {
        description: 'Check the bot\'s response time and API latency.',
        usage: '/ping',
        examples: ['/ping'],
      },
      'ban': {
        description: 'Ban a user from the server. Optionally delete their recent messages.',
        usage: '/ban <user> [reason] [delete_days]',
        examples: ['/ban @user Spamming', '/ban @user Breaking rules 7'],
      },
      'kick': {
        description: 'Kick a user from the server.',
        usage: '/kick <user> [reason]',
        examples: ['/kick @user Warning', '/kick @user'],
      },
      'timeout': {
        description: 'Timeout (mute) a user for a specified duration.',
        usage: '/timeout <user> <duration> [reason]',
        examples: ['/timeout @user 10 Spamming', '/timeout @user 60'],
      },
      'warn': {
        description: 'Issue a warning to a user.',
        usage: '/warn <user> <reason>',
        examples: ['/warn @user Breaking rule #3'],
      },
      'purge': {
        description: 'Delete multiple messages at once.',
        usage: '/purge <amount> [user]',
        examples: ['/purge 50', '/purge 20 @user'],
      },
    };
    
    const help = commandHelp[commandName];
    if (help) {
      const embed = new EmbedBuilder()
        .setTitle(`📖 Command: /${commandName}`)
        .setColor(0x5865F2)
        .setDescription(help.description)
        .addFields(
          { name: 'Usage', value: `\`${help.usage}\`` },
          { name: 'Examples', value: help.examples.map(e => `\`${e}\``).join('\n') },
        );
      
      return interaction.reply({ embeds: [embed] });
    }
  }
  
  // Show all commands
  const embed = new EmbedBuilder()
    .setTitle('📚 SufBot Commands')
    .setDescription('Use `/help <command>` for detailed information about a specific command.')
    .setColor(0x5865F2)
    .addFields(
      {
        name: '🔧 General',
        value: '`/ping` `/help` `/serverinfo` `/userinfo` `/avatar` `/botinfo`',
        inline: false,
      },
      {
        name: '🛡️ Moderation',
        value: '`/ban` `/kick` `/timeout` `/untimeout` `/warn` `/warnings` `/clearwarnings` `/purge` `/slowmode` `/lock` `/unlock` `/modlogs`',
        inline: false,
      },
      {
        name: '🔨 Utility',
        value: '`/poll` `/remind`',
        inline: false,
      },
    )
    .setFooter({ text: 'Commands can be disabled by server admins via the dashboard' })
    .setTimestamp();
  
  await interaction.reply({ embeds: [embed] });
}

export async function handleServerinfo(interaction: ChatInputCommandInteraction) {
  const guild = interaction.guild;
  if (!guild) return interaction.reply({ content: '❌ This command can only be used in a server!', ephemeral: true });
  
  await guild.members.fetch();
  
  const owner = await guild.fetchOwner();
  const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
  const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
  const categories = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;
  const onlineMembers = guild.members.cache.filter(m => m.presence?.status !== 'offline').size;
  const botCount = guild.members.cache.filter(m => m.user.bot).size;
  
  const embed = new EmbedBuilder()
    .setTitle(`📊 ${guild.name}`)
    .setThumbnail(guild.iconURL({ size: 256 }) || '')
    .setColor(0x5865F2)
    .addFields(
      { name: '👑 Owner', value: `${owner.user.tag}`, inline: true },
      { name: '🆔 Server ID', value: guild.id, inline: true },
      { name: '📅 Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
      { name: '👥 Members', value: `Total: ${guild.memberCount}\nOnline: ${onlineMembers}\nBots: ${botCount}`, inline: true },
      { name: '📁 Channels', value: `Text: ${textChannels}\nVoice: ${voiceChannels}\nCategories: ${categories}`, inline: true },
      { name: '🎭 Roles', value: `${guild.roles.cache.size}`, inline: true },
      { name: '✨ Boost Level', value: `Level ${guild.premiumTier} (${guild.premiumSubscriptionCount || 0} boosts)`, inline: true },
      { name: '🔒 Verification', value: guild.verificationLevel.toString(), inline: true },
    )
    .setImage(guild.bannerURL({ size: 512 }) || '')
    .setTimestamp();
  
  await interaction.reply({ embeds: [embed] });
}

export async function handleUserinfo(interaction: ChatInputCommandInteraction) {
  const user = interaction.options.getUser('user') || interaction.user;
  const member = interaction.guild?.members.cache.get(user.id);
  
  const embed = new EmbedBuilder()
    .setTitle(`👤 ${user.tag}`)
    .setThumbnail(user.displayAvatarURL({ size: 256 }))
    .setColor(member?.displayColor || 0x5865F2)
    .addFields(
      { name: '🆔 User ID', value: user.id, inline: true },
      { name: '📅 Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
    );
  
  if (member) {
    embed.addFields(
      { name: '📥 Joined Server', value: `<t:${Math.floor((member.joinedTimestamp || 0) / 1000)}:R>`, inline: true },
      { name: '📛 Nickname', value: member.nickname || 'None', inline: true },
      { name: '🎨 Display Color', value: member.displayHexColor, inline: true },
      { name: `🎭 Roles [${member.roles.cache.size - 1}]`, value: member.roles.cache.filter(r => r.id !== interaction.guild?.id).map(r => r.toString()).slice(0, 10).join(', ') || 'None', inline: false },
    );
    
    if (member.premiumSince) {
      embed.addFields({ name: '✨ Boosting Since', value: `<t:${Math.floor(member.premiumSinceTimestamp! / 1000)}:R>`, inline: true });
    }
  }
  
  embed.setTimestamp();
  await interaction.reply({ embeds: [embed] });
}

export async function handleAvatar(interaction: ChatInputCommandInteraction) {
  const user = interaction.options.getUser('user') || interaction.user;
  
  const embed = new EmbedBuilder()
    .setTitle(`🖼️ ${user.tag}'s Avatar`)
    .setColor(0x5865F2)
    .setImage(user.displayAvatarURL({ size: 4096 }))
    .setDescription(`[PNG](${user.displayAvatarURL({ extension: 'png', size: 4096 })}) | [JPG](${user.displayAvatarURL({ extension: 'jpg', size: 4096 })}) | [WEBP](${user.displayAvatarURL({ extension: 'webp', size: 4096 })})`)
    .setTimestamp();
  
  await interaction.reply({ embeds: [embed] });
}

export async function handleBotinfo(interaction: ChatInputCommandInteraction, client: Client) {
  const uptime = process.uptime();
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  
  const memUsage = process.memoryUsage();
  
  const embed = new EmbedBuilder()
    .setTitle('🤖 SufBot Information')
    .setThumbnail(client.user?.displayAvatarURL({ size: 256 }) || '')
    .setColor(0x5865F2)
    .addFields(
      { name: '📊 Statistics', value: `Servers: ${client.guilds.cache.size}\nUsers: ${client.users.cache.size}\nChannels: ${client.channels.cache.size}`, inline: true },
      { name: '⏱️ Uptime', value: `${days}d ${hours}h ${minutes}m ${seconds}s`, inline: true },
      { name: '💾 Memory', value: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true },
      { name: '📡 Ping', value: `${Math.round(client.ws.ping)}ms`, inline: true },
      { name: '🔧 Version', value: 'v5.0.0', inline: true },
      { name: '📚 Library', value: 'Discord.js v14', inline: true },
    )
    .setTimestamp();
  
  await interaction.reply({ embeds: [embed] });
}

// ============================================
// Moderation Commands
// ============================================

export async function handleBan(interaction: ChatInputCommandInteraction) {
  const user = interaction.options.getUser('user', true);
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const deleteDays = interaction.options.getInteger('delete_days') || 0;
  
  const member = interaction.guild?.members.cache.get(user.id);
  
  // Check if user can be banned
  if (member) {
    if (member.id === interaction.user.id) {
      return interaction.reply({ content: '❌ You cannot ban yourself!', ephemeral: true });
    }
    if (member.id === interaction.guild?.ownerId) {
      return interaction.reply({ content: '❌ You cannot ban the server owner!', ephemeral: true });
    }
    if (!member.bannable) {
      return interaction.reply({ content: '❌ I cannot ban this user! They may have higher permissions than me.', ephemeral: true });
    }
  }
  
  try {
    await interaction.guild?.members.ban(user, { 
      reason: `${reason} | Banned by ${interaction.user.tag}`,
      deleteMessageDays: deleteDays,
    });
    
    // Log to database
    const caseNumber = await getNextCaseNumber(interaction.guild!.id);
    await prisma.modLog.create({
      data: {
        guildId: interaction.guild!.id,
        caseNumber,
        moderatorId: interaction.user.id,
        userId: user.id,
        action: 'BAN',
        reason,
      },
    });
    
    const embed = new EmbedBuilder()
      .setTitle('🔨 User Banned')
      .setColor(0xFF0000)
      .addFields(
        { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
        { name: 'Moderator', value: interaction.user.tag, inline: true },
        { name: 'Reason', value: reason, inline: false },
        { name: 'Case', value: `#${caseNumber}`, inline: true },
      )
      .setThumbnail(user.displayAvatarURL())
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
    
    // Try to DM the user
    try {
      await user.send({
        embeds: [new EmbedBuilder()
          .setTitle(`🔨 You have been banned from ${interaction.guild?.name}`)
          .setColor(0xFF0000)
          .addFields({ name: 'Reason', value: reason })
          .setTimestamp()
        ]
      });
    } catch {
      // User has DMs disabled
    }
  } catch (error) {
    logger.error('Ban error:', error);
    await interaction.reply({ content: '❌ Failed to ban user!', ephemeral: true });
  }
}

export async function handleKick(interaction: ChatInputCommandInteraction) {
  const user = interaction.options.getUser('user', true);
  const reason = interaction.options.getString('reason') || 'No reason provided';
  
  const member = interaction.guild?.members.cache.get(user.id);
  
  if (!member) {
    return interaction.reply({ content: '❌ User is not in this server!', ephemeral: true });
  }
  
  if (member.id === interaction.user.id) {
    return interaction.reply({ content: '❌ You cannot kick yourself!', ephemeral: true });
  }
  if (member.id === interaction.guild?.ownerId) {
    return interaction.reply({ content: '❌ You cannot kick the server owner!', ephemeral: true });
  }
  if (!member.kickable) {
    return interaction.reply({ content: '❌ I cannot kick this user! They may have higher permissions than me.', ephemeral: true });
  }
  
  try {
    // Try to DM the user first
    try {
      await user.send({
        embeds: [new EmbedBuilder()
          .setTitle(`👢 You have been kicked from ${interaction.guild?.name}`)
          .setColor(0xFFA500)
          .addFields({ name: 'Reason', value: reason })
          .setTimestamp()
        ]
      });
    } catch {
      // User has DMs disabled
    }
    
    await member.kick(`${reason} | Kicked by ${interaction.user.tag}`);
    
    // Log to database
    const caseNumber = await getNextCaseNumber(interaction.guild!.id);
    await prisma.modLog.create({
      data: {
        guildId: interaction.guild!.id,
        caseNumber,
        moderatorId: interaction.user.id,
        userId: user.id,
        action: 'KICK',
        reason,
      },
    });
    
    const embed = new EmbedBuilder()
      .setTitle('👢 User Kicked')
      .setColor(0xFFA500)
      .addFields(
        { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
        { name: 'Moderator', value: interaction.user.tag, inline: true },
        { name: 'Reason', value: reason, inline: false },
        { name: 'Case', value: `#${caseNumber}`, inline: true },
      )
      .setThumbnail(user.displayAvatarURL())
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    logger.error('Kick error:', error);
    await interaction.reply({ content: '❌ Failed to kick user!', ephemeral: true });
  }
}

export async function handleTimeout(interaction: ChatInputCommandInteraction) {
  const user = interaction.options.getUser('user', true);
  const duration = interaction.options.getInteger('duration', true);
  const reason = interaction.options.getString('reason') || 'No reason provided';
  
  const member = interaction.guild?.members.cache.get(user.id);
  
  if (!member) {
    return interaction.reply({ content: '❌ User is not in this server!', ephemeral: true });
  }
  
  if (member.id === interaction.user.id) {
    return interaction.reply({ content: '❌ You cannot timeout yourself!', ephemeral: true });
  }
  if (!member.moderatable) {
    return interaction.reply({ content: '❌ I cannot timeout this user!', ephemeral: true });
  }
  
  try {
    const durationMs = duration * 60 * 1000;
    await member.timeout(durationMs, `${reason} | By ${interaction.user.tag}`);
    
    // Log to database
    const caseNumber = await getNextCaseNumber(interaction.guild!.id);
    await prisma.modLog.create({
      data: {
        guildId: interaction.guild!.id,
        caseNumber,
        moderatorId: interaction.user.id,
        userId: user.id,
        action: 'TIMEOUT',
        reason,
        duration: durationMs,
      },
    });
    
    const embed = new EmbedBuilder()
      .setTitle('🔇 User Timed Out')
      .setColor(0xFFFF00)
      .addFields(
        { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
        { name: 'Moderator', value: interaction.user.tag, inline: true },
        { name: 'Duration', value: `${duration} minutes`, inline: true },
        { name: 'Reason', value: reason, inline: false },
        { name: 'Case', value: `#${caseNumber}`, inline: true },
      )
      .setThumbnail(user.displayAvatarURL())
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    logger.error('Timeout error:', error);
    await interaction.reply({ content: '❌ Failed to timeout user!', ephemeral: true });
  }
}

export async function handleUntimeout(interaction: ChatInputCommandInteraction) {
  const user = interaction.options.getUser('user', true);
  const reason = interaction.options.getString('reason') || 'No reason provided';
  
  const member = interaction.guild?.members.cache.get(user.id);
  
  if (!member) {
    return interaction.reply({ content: '❌ User is not in this server!', ephemeral: true });
  }
  
  if (!member.isCommunicationDisabled()) {
    return interaction.reply({ content: '❌ This user is not timed out!', ephemeral: true });
  }
  
  try {
    await member.timeout(null, `${reason} | By ${interaction.user.tag}`);
    
    const embed = new EmbedBuilder()
      .setTitle('🔊 Timeout Removed')
      .setColor(0x00FF00)
      .addFields(
        { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
        { name: 'Moderator', value: interaction.user.tag, inline: true },
        { name: 'Reason', value: reason, inline: false },
      )
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    logger.error('Untimeout error:', error);
    await interaction.reply({ content: '❌ Failed to remove timeout!', ephemeral: true });
  }
}

export async function handleWarn(interaction: ChatInputCommandInteraction) {
  const user = interaction.options.getUser('user', true);
  const reason = interaction.options.getString('reason', true);
  
  const member = interaction.guild?.members.cache.get(user.id);
  
  if (!member) {
    return interaction.reply({ content: '❌ User is not in this server!', ephemeral: true });
  }
  
  if (member.user.bot) {
    return interaction.reply({ content: '❌ You cannot warn bots!', ephemeral: true });
  }
  
  try {
    // Create warning
    await prisma.warning.create({
      data: {
        guildId: interaction.guild!.id,
        moderatorId: interaction.user.id,
        userId: user.id,
        reason,
      },
    });
    
    // Log to modlog
    const caseNumber = await getNextCaseNumber(interaction.guild!.id);
    await prisma.modLog.create({
      data: {
        guildId: interaction.guild!.id,
        caseNumber,
        moderatorId: interaction.user.id,
        userId: user.id,
        action: 'WARN',
        reason,
      },
    });
    
    // Get warning count
    const warningCount = await prisma.warning.count({
      where: { guildId: interaction.guild!.id, userId: user.id },
    });
    
    const embed = new EmbedBuilder()
      .setTitle('⚠️ User Warned')
      .setColor(0xFFFF00)
      .addFields(
        { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
        { name: 'Moderator', value: interaction.user.tag, inline: true },
        { name: 'Total Warnings', value: `${warningCount}`, inline: true },
        { name: 'Reason', value: reason, inline: false },
        { name: 'Case', value: `#${caseNumber}`, inline: true },
      )
      .setThumbnail(user.displayAvatarURL())
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
    
    // Try to DM the user
    try {
      await user.send({
        embeds: [new EmbedBuilder()
          .setTitle(`⚠️ You have been warned in ${interaction.guild?.name}`)
          .setColor(0xFFFF00)
          .addFields(
            { name: 'Reason', value: reason },
            { name: 'Total Warnings', value: `${warningCount}` },
          )
          .setTimestamp()
        ]
      });
    } catch {
      // User has DMs disabled
    }
  } catch (error) {
    logger.error('Warn error:', error);
    await interaction.reply({ content: '❌ Failed to warn user!', ephemeral: true });
  }
}

export async function handleWarnings(interaction: ChatInputCommandInteraction) {
  const user = interaction.options.getUser('user', true);
  
  const warnings = await prisma.warning.findMany({
    where: { guildId: interaction.guild!.id, userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  
  if (warnings.length === 0) {
    return interaction.reply({ content: `✅ ${user.tag} has no warnings!`, ephemeral: true });
  }
  
  const embed = new EmbedBuilder()
    .setTitle(`⚠️ Warnings for ${user.tag}`)
    .setColor(0xFFFF00)
    .setThumbnail(user.displayAvatarURL())
    .setDescription(
      warnings.map((w, i) => 
        `**${i + 1}.** ${w.reason}\n└ <t:${Math.floor(w.createdAt.getTime() / 1000)}:R> by <@${w.moderatorId}>`
      ).join('\n\n')
    )
    .setFooter({ text: `Total: ${warnings.length} warning(s)` })
    .setTimestamp();
  
  await interaction.reply({ embeds: [embed] });
}

export async function handleClearwarnings(interaction: ChatInputCommandInteraction) {
  const user = interaction.options.getUser('user', true);
  
  const result = await prisma.warning.deleteMany({
    where: { guildId: interaction.guild!.id, userId: user.id },
  });
  
  const embed = new EmbedBuilder()
    .setTitle('✅ Warnings Cleared')
    .setColor(0x00FF00)
    .setDescription(`Cleared **${result.count}** warning(s) for ${user.tag}`)
    .setTimestamp();
  
  await interaction.reply({ embeds: [embed] });
}

export async function handlePurge(interaction: ChatInputCommandInteraction) {
  const amount = interaction.options.getInteger('amount', true);
  const targetUser = interaction.options.getUser('user');
  
  const channel = interaction.channel as TextChannel;
  
  await interaction.deferReply({ ephemeral: true });
  
  try {
    let messages = await channel.messages.fetch({ limit: 100 });
    
    if (targetUser) {
      messages = messages.filter(m => m.author.id === targetUser.id);
    }
    
    // Filter messages older than 14 days (Discord limitation)
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    messages = messages.filter(m => m.createdTimestamp > twoWeeksAgo);
    
    const toDelete = messages.first(amount);
    const deleted = await channel.bulkDelete(toDelete, true);
    
    await interaction.editReply({
      content: `✅ Deleted **${deleted.size}** message(s)${targetUser ? ` from ${targetUser.tag}` : ''}`,
    });
  } catch (error) {
    logger.error('Purge error:', error);
    await interaction.editReply({ content: '❌ Failed to delete messages!' });
  }
}

export async function handleSlowmode(interaction: ChatInputCommandInteraction) {
  const seconds = interaction.options.getInteger('seconds', true);
  const targetChannel = interaction.options.getChannel('channel') as TextChannel || interaction.channel as TextChannel;
  
  try {
    await targetChannel.setRateLimitPerUser(seconds);
    
    const embed = new EmbedBuilder()
      .setTitle('⏱️ Slowmode Updated')
      .setColor(0x5865F2)
      .setDescription(
        seconds === 0
          ? `Slowmode has been disabled in ${targetChannel}`
          : `Slowmode set to **${seconds} seconds** in ${targetChannel}`
      )
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    logger.error('Slowmode error:', error);
    await interaction.reply({ content: '❌ Failed to set slowmode!', ephemeral: true });
  }
}

export async function handleLock(interaction: ChatInputCommandInteraction) {
  const targetChannel = interaction.options.getChannel('channel') as TextChannel || interaction.channel as TextChannel;
  const reason = interaction.options.getString('reason') || 'No reason provided';
  
  try {
    await targetChannel.permissionOverwrites.edit(interaction.guild!.roles.everyone, {
      SendMessages: false,
    });
    
    const embed = new EmbedBuilder()
      .setTitle('🔒 Channel Locked')
      .setColor(0xFF0000)
      .setDescription(`${targetChannel} has been locked.`)
      .addFields({ name: 'Reason', value: reason })
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    logger.error('Lock error:', error);
    await interaction.reply({ content: '❌ Failed to lock channel!', ephemeral: true });
  }
}

export async function handleUnlock(interaction: ChatInputCommandInteraction) {
  const targetChannel = interaction.options.getChannel('channel') as TextChannel || interaction.channel as TextChannel;
  
  try {
    await targetChannel.permissionOverwrites.edit(interaction.guild!.roles.everyone, {
      SendMessages: null,
    });
    
    const embed = new EmbedBuilder()
      .setTitle('🔓 Channel Unlocked')
      .setColor(0x00FF00)
      .setDescription(`${targetChannel} has been unlocked.`)
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    logger.error('Unlock error:', error);
    await interaction.reply({ content: '❌ Failed to unlock channel!', ephemeral: true });
  }
}

export async function handleModlogs(interaction: ChatInputCommandInteraction) {
  const user = interaction.options.getUser('user', true);
  
  const logs = await prisma.modLog.findMany({
    where: { guildId: interaction.guild!.id, userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  
  if (logs.length === 0) {
    return interaction.reply({ content: `✅ ${user.tag} has no moderation logs!`, ephemeral: true });
  }
  
  const actionEmojis: Record<string, string> = {
    BAN: '🔨',
    KICK: '👢',
    TIMEOUT: '🔇',
    WARN: '⚠️',
    UNBAN: '🔓',
  };
  
  const embed = new EmbedBuilder()
    .setTitle(`📋 Moderation Logs for ${user.tag}`)
    .setColor(0x5865F2)
    .setThumbnail(user.displayAvatarURL())
    .setDescription(
      logs.map(log => 
        `${actionEmojis[log.action] || '📝'} **Case #${log.caseNumber}** - ${log.action}\n└ ${log.reason}\n└ <t:${Math.floor(log.createdAt.getTime() / 1000)}:R> by <@${log.moderatorId}>`
      ).join('\n\n')
    )
    .setFooter({ text: `Total: ${logs.length} log(s)` })
    .setTimestamp();
  
  await interaction.reply({ embeds: [embed] });
}

// ============================================
// Utility Commands
// ============================================

export async function handlePoll(interaction: ChatInputCommandInteraction) {
  const question = interaction.options.getString('question', true);
  const optionsStr = interaction.options.getString('options');
  
  const embed = new EmbedBuilder()
    .setTitle('📊 Poll')
    .setColor(0x5865F2)
    .setDescription(question)
    .setFooter({ text: `Poll by ${interaction.user.tag}` })
    .setTimestamp();
  
  if (optionsStr) {
    const options = optionsStr.split('|').map(o => o.trim()).slice(0, 10);
    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    
    embed.addFields({
      name: 'Options',
      value: options.map((opt, i) => `${emojis[i]} ${opt}`).join('\n'),
    });
    
    const message = await interaction.reply({ embeds: [embed], fetchReply: true });
    
    for (let i = 0; i < options.length; i++) {
      await message.react(emojis[i]);
    }
  } else {
    const message = await interaction.reply({ embeds: [embed], fetchReply: true });
    await message.react('👍');
    await message.react('👎');
  }
}

export async function handleRemind(interaction: ChatInputCommandInteraction) {
  const timeStr = interaction.options.getString('time', true);
  const message = interaction.options.getString('message', true);
  
  // Parse time string (e.g., "10m", "1h", "1d")
  const match = timeStr.match(/^(\d+)(s|m|h|d)$/);
  if (!match) {
    return interaction.reply({ 
      content: '❌ Invalid time format! Use: `10s`, `10m`, `1h`, `1d`', 
      ephemeral: true 
    });
  }
  
  const amount = parseInt(match[1]);
  const unit = match[2];
  
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  
  const ms = amount * multipliers[unit];
  
  if (ms > 7 * 24 * 60 * 60 * 1000) {
    return interaction.reply({ content: '❌ Maximum reminder time is 7 days!', ephemeral: true });
  }
  
  const remindAt = new Date(Date.now() + ms);
  
  await interaction.reply({
    embeds: [new EmbedBuilder()
      .setTitle('⏰ Reminder Set')
      .setColor(0x5865F2)
      .setDescription(`I'll remind you <t:${Math.floor(remindAt.getTime() / 1000)}:R>`)
      .addFields({ name: 'Message', value: message })
      .setTimestamp()
    ],
    ephemeral: true,
  });
  
  // Set timeout for reminder
  setTimeout(async () => {
    try {
      await interaction.user.send({
        embeds: [new EmbedBuilder()
          .setTitle('⏰ Reminder!')
          .setColor(0x5865F2)
          .setDescription(message)
          .setTimestamp()
        ]
      });
    } catch {
      // Try to send in channel
      if (interaction.channel?.isTextBased()) {
        await (interaction.channel as TextChannel).send({
          content: `<@${interaction.user.id}>`,
          embeds: [new EmbedBuilder()
            .setTitle('⏰ Reminder!')
            .setColor(0x5865F2)
            .setDescription(message)
            .setTimestamp()
          ]
        });
      }
    }
  }, ms);
}
