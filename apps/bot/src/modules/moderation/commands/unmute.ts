// ============================================
// SUFBOT V5 - Unmute Command (Text & Voice)
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

const command: Command = {
  meta: {
    name: 'unmute',
    description: 'Unmute a member (text or voice)',
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
    .setName('unmute')
    .setDescription('Unmute a member (text or voice)')
    .addSubcommand(subcommand =>
      subcommand
        .setName('text')
        .setDescription('Remove timeout from a member')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to remove timeout from')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('Reason for removing the timeout')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('voice')
        .setDescription('Remove server mute from a member')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to voice unmute')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('Reason for the voice unmute')
            .setRequired(false)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    const subcommand = interaction.options.getSubcommand();
    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';

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
            .setDescription('❌ I cannot unmute this user as their role is higher than or equal to mine.')
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
        // Check if user is timed out
        if (!member.isCommunicationDisabled()) {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(COLORS.WARNING)
                .setDescription('⚠️ This user is not currently timed out.')
            ],
            ephemeral: true,
          });
          return;
        }

        await member.timeout(null, `${reason} | Moderator: ${interaction.user.tag}`);

        await prisma.modLog.create({
          data: {
            guildId: interaction.guild.id,
            caseNumber,
            action: 'UNMUTE',
            userId: user.id,
            moderatorId: interaction.user.id,
            reason,
          },
        });

        const embed = new EmbedBuilder()
          .setColor(COLORS.SUCCESS)
          .setTitle('🔊 Member Timeout Removed')
          .setThumbnail(member.displayAvatarURL())
          .addFields(
            { name: '👤 User', value: `${user.tag}\n\`${user.id}\``, inline: true },
            { name: '👮 Moderator', value: interaction.user.tag, inline: true },
            { name: '📝 Reason', value: reason, inline: false },
            { name: '📋 Case', value: `#${caseNumber}`, inline: true },
          )
          .setFooter({
            text: `Requested by ${interaction.user.username}`,
            iconURL: interaction.user.displayAvatarURL(),
          })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });

      } else {
        // Voice unmute
        if (!member.voice.serverMute) {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(COLORS.WARNING)
                .setDescription('⚠️ This user is not currently voice muted.')
            ],
            ephemeral: true,
          });
          return;
        }

        await member.voice.setMute(false, `${reason} | Moderator: ${interaction.user.tag}`);

        await prisma.modLog.create({
          data: {
            guildId: interaction.guild.id,
            caseNumber,
            action: 'UNMUTE',
            userId: user.id,
            moderatorId: interaction.user.id,
            reason,
          },
        });

        const embed = new EmbedBuilder()
          .setColor(COLORS.SUCCESS)
          .setTitle('🔊 Member Voice Unmuted')
          .setThumbnail(member.displayAvatarURL())
          .addFields(
            { name: '👤 User', value: `${user.tag}\n\`${user.id}\``, inline: true },
            { name: '👮 Moderator', value: interaction.user.tag, inline: true },
            { name: '📝 Reason', value: reason, inline: false },
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
        action: 'UNMUTE',
        userId: user.id,
        moderatorId: interaction.user.id,
        reason,
      });

    } catch (error) {
      console.error('Unmute error:', error);
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setDescription('❌ Failed to unmute the user. Please try again.')
        ],
        ephemeral: true,
      });
    }
  },
};

export default command;
