// ============================================
// SUFBOT V5 - Bot Info Command
// ============================================

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  version as djsVersion,
} from 'discord.js';
import { COLORS } from '@sufbot/shared';
import type { Command } from '../../../types';
import os from 'os';

const command: Command = {
  meta: {
    name: 'botinfo',
    description: 'Display information about the bot',
    category: 'utility',
    permissions: [],
    botPermissions: [],
    cooldown: 10000,
    guildOnly: false,
    ownerOnly: false,
    nsfw: false,
    panelEditable: false,
    enabled: true,
  },
  data: new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('Display information about the bot'),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const client = interaction.client;
    
    // Calculate uptime
    const uptime = client.uptime || 0;
    const days = Math.floor(uptime / 86400000);
    const hours = Math.floor((uptime % 86400000) / 3600000);
    const minutes = Math.floor((uptime % 3600000) / 60000);
    const seconds = Math.floor((uptime % 60000) / 1000);
    const uptimeStr = `${days}d ${hours}h ${minutes}m ${seconds}s`;

    // Get stats
    const guilds = client.guilds.cache.size;
    const users = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
    const channels = client.channels.cache.size;
    const commands = client.commands?.size || 0;

    // Memory usage (only show percentage, not raw values)
    const memUsed = process.memoryUsage().heapUsed;
    const memTotal = os.totalmem();
    const memPercent = ((memUsed / memTotal) * 100).toFixed(1);

    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setAuthor({
        name: client.user?.username || 'SufBot',
        iconURL: client.user?.displayAvatarURL(),
      })
      .setThumbnail(client.user?.displayAvatarURL({ size: 512 }) || null)
      .setDescription('A powerful, feature-rich Discord bot for server management, moderation, and more!')
      .addFields(
        {
          name: '📊 Statistics',
          value: [
            `🏠 **Servers:** ${guilds.toLocaleString()}`,
            `👥 **Users:** ${users.toLocaleString()}`,
            `📁 **Channels:** ${channels.toLocaleString()}`,
            `⚡ **Commands:** ${commands}`,
          ].join('\n'),
          inline: true,
        },
        {
          name: '⚙️ System',
          value: [
            `⏱️ **Uptime:** ${uptimeStr}`,
            `🏓 **Ping:** ${client.ws.ping}ms`,
            `📦 **Discord.js:** v${djsVersion}`,
            `💻 **Node.js:** ${process.version}`,
          ].join('\n'),
          inline: true,
        },
        {
          name: '🔗 Links',
          value: [
            `[Dashboard](https://sufbot.olnk.tr)`,
            `[Support Server](https://discord.gg/sufbot)`,
            `[Invite Bot](https://discord.com/oauth2/authorize?client_id=${client.user?.id}&permissions=8&scope=bot%20applications.commands)`,
          ].join(' • '),
          inline: false,
        }
      )
      .setFooter({
        text: `Requested by ${interaction.user.username} • SufBot v5.0.0`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('Dashboard')
        .setStyle(ButtonStyle.Link)
        .setURL('https://sufbot.olnk.tr')
        .setEmoji('🌐'),
      new ButtonBuilder()
        .setLabel('Invite')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/oauth2/authorize?client_id=${client.user?.id}&permissions=8&scope=bot%20applications.commands`)
        .setEmoji('➕'),
      new ButtonBuilder()
        .setLabel('Support')
        .setStyle(ButtonStyle.Link)
        .setURL('https://discord.gg/sufbot')
        .setEmoji('💬'),
    );

    await interaction.editReply({ embeds: [embed], components: [row] });
  },
};

export default command;
