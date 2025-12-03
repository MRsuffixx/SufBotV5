// ============================================
// SUFBOT V5 - Slowmode Command
// ============================================

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  TextChannel,
  ChannelType,
} from 'discord.js';
import { COLORS } from '@sufbot/shared';
import type { Command } from '../../../types';

// Parse duration string to seconds
function parseDuration(duration: string): number | null {
  const regex = /^(\d+)(s|m|h)$/i;
  const match = duration.match(regex);
  
  if (!match) {
    // Try parsing as just a number (seconds)
    const num = parseInt(duration);
    if (!isNaN(num) && num >= 0 && num <= 21600) return num;
    return null;
  }
  
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  
  const multipliers: Record<string, number> = {
    's': 1,
    'm': 60,
    'h': 3600,
  };
  
  const seconds = value * multipliers[unit];
  
  // Discord slowmode max is 6 hours (21600 seconds)
  if (seconds > 21600) return null;
  
  return seconds;
}

function formatDuration(seconds: number): string {
  if (seconds === 0) return 'Off';
  if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  const hours = Math.floor(seconds / 3600);
  return `${hours} hour${hours !== 1 ? 's' : ''}`;
}

const command: Command = {
  meta: {
    name: 'slowmode',
    description: 'Set or view the slowmode for a channel',
    category: 'moderation',
    permissions: [PermissionFlagsBits.ManageChannels],
    botPermissions: [PermissionFlagsBits.ManageChannels],
    cooldown: 5000,
    guildOnly: true,
    ownerOnly: false,
    nsfw: false,
    panelEditable: true,
    enabled: true,
  },
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set or view the slowmode for a channel')
    .addStringOption(option =>
      option
        .setName('duration')
        .setDescription('Duration (e.g., 5s, 1m, 1h, or 0 to disable). Leave empty to view current.')
        .setRequired(false)
    )
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('The channel to set slowmode for (defaults to current)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    const durationStr = interaction.options.getString('duration');
    const targetChannel = (interaction.options.getChannel('channel') || interaction.channel) as TextChannel;

    if (!targetChannel || !targetChannel.isTextBased() || !('rateLimitPerUser' in targetChannel)) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setDescription('❌ Invalid channel.')
        ],
        ephemeral: true,
      });
      return;
    }

    // If no duration provided, show current slowmode
    if (!durationStr) {
      const currentSlowmode = targetChannel.rateLimitPerUser || 0;
      
      const embed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle('⏱️ Current Slowmode')
        .addFields(
          { name: '📁 Channel', value: targetChannel.toString(), inline: true },
          { name: '⏰ Duration', value: formatDuration(currentSlowmode), inline: true },
        )
        .setFooter({
          text: `Requested by ${interaction.user.username}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return;
    }

    // Parse duration
    const duration = parseDuration(durationStr);
    if (duration === null) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setDescription('❌ Invalid duration format. Use formats like: `5s`, `1m`, `1h`, or `0` to disable.\nMaximum duration is 6 hours.')
        ],
        ephemeral: true,
      });
      return;
    }

    try {
      await targetChannel.setRateLimitPerUser(duration, `Set by ${interaction.user.tag}`);

      const embed = new EmbedBuilder()
        .setColor(duration === 0 ? COLORS.SUCCESS : COLORS.WARNING)
        .setTitle(duration === 0 ? '⏱️ Slowmode Disabled' : '⏱️ Slowmode Updated')
        .setDescription(
          duration === 0
            ? `Slowmode has been disabled in ${targetChannel}.`
            : `Slowmode has been set to **${formatDuration(duration)}** in ${targetChannel}.`
        )
        .addFields(
          { name: '📁 Channel', value: targetChannel.toString(), inline: true },
          { name: '⏰ Duration', value: formatDuration(duration), inline: true },
          { name: '👮 Moderator', value: interaction.user.tag, inline: true },
        )
        .setFooter({
          text: `Requested by ${interaction.user.username}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Slowmode error:', error);
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setDescription('❌ Failed to set slowmode. Please try again.')
        ],
        ephemeral: true,
      });
    }
  },
};

export default command;
