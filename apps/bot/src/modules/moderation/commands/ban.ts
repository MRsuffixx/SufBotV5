// ============================================
// SUFBOT V5 - Ban Command
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
    name: 'ban',
    description: 'Ban a member from the server',
    category: 'moderation',
    permissions: [PermissionFlagsBits.BanMembers],
    botPermissions: [PermissionFlagsBits.BanMembers],
    cooldown: 3000,
    guildOnly: true,
    ownerOnly: false,
    nsfw: false,
    panelEditable: true,
    enabled: true,
  },
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to ban')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for the ban')
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option
        .setName('delete_days')
        .setDescription('Number of days of messages to delete (0-7)')
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const deleteDays = interaction.options.getInteger('delete_days') || 0;

    // Check if user is in the guild
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    // Check hierarchy
    if (member) {
      const botMember = interaction.guild.members.me;
      const executorMember = interaction.member;

      if (botMember && member.roles.highest.position >= botMember.roles.highest.position) {
        await interaction.reply({
          content: '❌ I cannot ban this user as their role is higher than or equal to mine.',
          ephemeral: true,
        });
        return;
      }

      const executor = executorMember as GuildMember | null;
      if (executor && executor.roles && member.roles.highest.position >= executor.roles.highest.position) {
        await interaction.reply({
          content: '❌ You cannot ban this user as their role is higher than or equal to yours.',
          ephemeral: true,
        });
        return;
      }

      if (!member.bannable) {
        await interaction.reply({
          content: '❌ I cannot ban this user.',
          ephemeral: true,
        });
        return;
      }
    }

    // Get next case number
    const lastCase = await prisma.modLog.findFirst({
      where: { guildId: interaction.guild.id },
      orderBy: { caseNumber: 'desc' },
    });
    const caseNumber = (lastCase?.caseNumber || 0) + 1;

    // Perform the ban
    try {
      await interaction.guild.members.ban(user.id, {
        reason: `${reason} | Moderator: ${interaction.user.tag}`,
        deleteMessageSeconds: deleteDays * 24 * 60 * 60,
      });

      // Create mod log entry
      await prisma.modLog.create({
        data: {
          guildId: interaction.guild.id,
          caseNumber,
          action: 'BAN',
          userId: user.id,
          moderatorId: interaction.user.id,
          reason,
        },
      });

      // Create embed
      const embed = new EmbedBuilder()
        .setColor(COLORS.ERROR)
        .setTitle('🔨 Member Banned')
        .addFields(
          { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
          { name: 'Moderator', value: interaction.user.tag, inline: true },
          { name: 'Reason', value: reason },
          { name: 'Case', value: `#${caseNumber}`, inline: true }
        )
        .setThumbnail(user.displayAvatarURL())
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      // Emit mod action to API
      interaction.client.wsClient?.emitModAction({
        guildId: interaction.guild.id,
        action: 'BAN',
        userId: user.id,
        moderatorId: interaction.user.id,
        reason,
      });

    } catch (error) {
      await interaction.reply({
        content: '❌ Failed to ban the user. Please try again.',
        ephemeral: true,
      });
    }
  },
};

export default command;
