// ============================================
// SUFBOT V5 - Mute Command (Text & Voice)
// ============================================

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  GuildMember,
} from 'discord.js';
import { prisma } from '@sufbot/database';
import { COLORS } from '@sufbot/shared';
import type { Command } from '../../../types';

// Parse duration string to milliseconds
function parseDuration(duration: string): number | null {
  const regex = /^(\d+)(s|m|h|d|w)$/i;
  const match = duration.match(regex);
  
  if (!match) return null;
  
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  
  const multipliers: Record<string, number> = {
    's': 1000,
    'm': 60 * 1000,
    'h': 60 * 60 * 1000,
    'd': 24 * 60 * 60 * 1000,
    'w': 7 * 24 * 60 * 60 * 1000,
  };
  
  const ms = value * multipliers[unit];
  
  // Discord timeout max is 28 days
  if (ms > 28 * 24 * 60 * 60 * 1000) return null;
  
  return ms;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  return `${seconds} second${seconds > 1 ? 's' : ''}`;
}

const command: Command = {
  meta: {
    name: 'mute',
    description: 'Mute a member (text or voice)',
    category: 'moderation',
    permissions: [PermissionFlagsBits.ModerateMembers],
    botPermissions: [PermissionFlagsBits.ModerateMembers, PermissionFlagsBits.MuteMembers],
    cooldown: 3000,
    guildOnly: true,
    ownerOnly: false,
    nsfw: false,
    panelEditable: true,
    enabled: true,
  },
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute a member (text or voice)')
    .addSubcommand(subcommand =>
      subcommand
        .setName('text')
        .setDescription('Timeout a member (prevents sending messages)')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to timeout')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('duration')
            .setDescription('Duration (e.g., 10m, 1h, 1d, 1w)')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('Reason for the timeout')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('voice')
        .setDescription('Server mute a member in voice channels')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to voice mute')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('duration')
            .setDescription('Duration (e.g., 10m, 1h, 1d)')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('Reason for the voice mute')
            .setRequired(false)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    const subcommand = interaction.options.getSubcommand();
    const user = interaction.options.getUser('user', true);
    const durationStr = interaction.options.getString('duration', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const duration = parseDuration(durationStr);
    if (!duration) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setDescription('❌ Invalid duration format. Use formats like: `10s`, `5m`, `1h`, `1d`, `1w`\nMaximum duration is 28 days.')
        ],
        ephemeral: true,
      });
      return;
    }

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setDescription('❌ User is not in this server.')
        ],
        ephemeral: true,
      });
      return;
    }

    // Check hierarchy
    const botMember = interaction.guild.members.me;
    const executor = interaction.member as GuildMember;

    if (botMember && member.roles.highest.position >= botMember.roles.highest.position) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setDescription('❌ I cannot mute this user as their role is higher than or equal to mine.')
        ],
        ephemeral: true,
      });
      return;
    }

    if (executor && member.roles.highest.position >= executor.roles.highest.position && executor.id !== interaction.guild.ownerId) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setDescription('❌ You cannot mute this user as their role is higher than or equal to yours.')
        ],
        ephemeral: true,
      });
      return;
    }

    // Get next case number
    const lastCase = await prisma.modLog.findFirst({
      where: { guildId: interaction.guild.id },
      orderBy: { caseNumber: 'desc' },
    });
    const caseNumber = (lastCase?.caseNumber || 0) + 1;

    try {
      if (subcommand === 'text') {
        // Text mute (timeout)
        await member.timeout(duration, `${reason} | Moderator: ${interaction.user.tag}`);

        await prisma.modLog.create({
          data: {
            guildId: interaction.guild.id,
            caseNumber,
            action: 'MUTE',
            userId: user.id,
            moderatorId: interaction.user.id,
            reason,
            duration: duration,
          },
        });

        const expiresAt = Math.floor((Date.now() + duration) / 1000);

        const embed = new EmbedBuilder()
          .setColor(COLORS.MODERATION)
          .setTitle('🔇 Member Timed Out')
          .setThumbnail(member.displayAvatarURL())
          .addFields(
            { name: '👤 User', value: `${user.tag}\n\`${user.id}\``, inline: true },
            { name: '👮 Moderator', value: interaction.user.tag, inline: true },
            { name: '⏱️ Duration', value: formatDuration(duration), inline: true },
            { name: '📝 Reason', value: reason, inline: false },
            { name: '⏰ Expires', value: `<t:${expiresAt}:F> (<t:${expiresAt}:R>)`, inline: false },
            { name: '📋 Case', value: `#${caseNumber}`, inline: true },
          )
          .setFooter({
            text: `Requested by ${interaction.user.username}`,
            iconURL: interaction.user.displayAvatarURL(),
          })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });

      } else {
        // Voice mute
        if (!member.voice.channel) {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(COLORS.WARNING)
                .setDescription('⚠️ User is not in a voice channel. They will be muted when they join one.')
            ],
          });
        }

        await member.voice.setMute(true, `${reason} | Moderator: ${interaction.user.tag}`);

        await prisma.modLog.create({
          data: {
            guildId: interaction.guild.id,
            caseNumber,
            action: 'MUTE',
            userId: user.id,
            moderatorId: interaction.user.id,
            reason,
            duration: duration,
          },
        });

        // Schedule unmute (in production, use a proper job scheduler)
        setTimeout(async () => {
          try {
            const currentMember = await interaction.guild!.members.fetch(user.id).catch(() => null);
            if (currentMember?.voice.serverMute) {
              await currentMember.voice.setMute(false, 'Voice mute duration expired');
            }
          } catch {
            // User might have left
          }
        }, duration);

        const expiresAt = Math.floor((Date.now() + duration) / 1000);

        const embed = new EmbedBuilder()
          .setColor(COLORS.MODERATION)
          .setTitle('🔇 Member Voice Muted')
          .setThumbnail(member.displayAvatarURL())
          .addFields(
            { name: '👤 User', value: `${user.tag}\n\`${user.id}\``, inline: true },
            { name: '👮 Moderator', value: interaction.user.tag, inline: true },
            { name: '⏱️ Duration', value: formatDuration(duration), inline: true },
            { name: '📝 Reason', value: reason, inline: false },
            { name: '⏰ Expires', value: `<t:${expiresAt}:F> (<t:${expiresAt}:R>)`, inline: false },
            { name: '📋 Case', value: `#${caseNumber}`, inline: true },
          )
          .setFooter({
            text: `Requested by ${interaction.user.username}`,
            iconURL: interaction.user.displayAvatarURL(),
          })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      }

      // Emit mod action
      interaction.client.wsClient?.emitModAction({
        guildId: interaction.guild.id,
        action: 'MUTE',
        userId: user.id,
        moderatorId: interaction.user.id,
        reason,
      });

    } catch (error) {
      console.error('Mute error:', error);
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setDescription('❌ Failed to mute the user. Please try again.')
        ],
        ephemeral: true,
      });
    }
  },
};

export default command;
