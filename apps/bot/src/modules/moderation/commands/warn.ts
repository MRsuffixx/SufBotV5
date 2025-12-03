// ============================================
// SUFBOT V5 - Warn Command
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
    name: 'warn',
    description: 'Warn a member',
    category: 'moderation',
    permissions: [PermissionFlagsBits.ModerateMembers],
    botPermissions: [],
    cooldown: 3000,
    guildOnly: true,
    ownerOnly: false,
    nsfw: false,
    panelEditable: true,
    enabled: true,
  },
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to warn')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for the warning')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason', true);

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
    const executor = interaction.member as GuildMember;

    if (executor && member.roles.highest.position >= executor.roles.highest.position && executor.id !== interaction.guild.ownerId) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setDescription('❌ You cannot warn this user as their role is higher than or equal to yours.')
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
      // Create warning
      await prisma.warning.create({
        data: {
          guildId: interaction.guild.id,
          userId: user.id,
          moderatorId: interaction.user.id,
          reason,
        },
      });

      // Create mod log entry
      await prisma.modLog.create({
        data: {
          guildId: interaction.guild.id,
          caseNumber,
          action: 'WARN',
          userId: user.id,
          moderatorId: interaction.user.id,
          reason,
        },
      });

      // Count total warnings
      const warningCount = await prisma.warning.count({
        where: {
          guildId: interaction.guild.id,
          userId: user.id,
        },
      });

      const embed = new EmbedBuilder()
        .setColor(COLORS.WARNING)
        .setTitle('⚠️ Member Warned')
        .setThumbnail(member.displayAvatarURL())
        .addFields(
          { name: '👤 User', value: `${user.tag}\n\`${user.id}\``, inline: true },
          { name: '👮 Moderator', value: interaction.user.tag, inline: true },
          { name: '📊 Total Warnings', value: warningCount.toString(), inline: true },
          { name: '📝 Reason', value: reason, inline: false },
          { name: '📋 Case', value: `#${caseNumber}`, inline: true },
        )
        .setFooter({
          text: `Requested by ${interaction.user.username}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      // Try to DM the user
      try {
        await user.send({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.WARNING)
              .setTitle(`⚠️ You have been warned in ${interaction.guild.name}`)
              .addFields(
                { name: '📝 Reason', value: reason },
                { name: '📊 Total Warnings', value: warningCount.toString() },
              )
              .setTimestamp()
          ],
        });
      } catch {
        // User has DMs disabled
      }

      // Emit mod action
      interaction.client.wsClient?.emitModAction({
        guildId: interaction.guild.id,
        action: 'WARN',
        userId: user.id,
        moderatorId: interaction.user.id,
        reason,
      });

    } catch (error) {
      console.error('Warn error:', error);
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setDescription('❌ Failed to warn the user. Please try again.')
        ],
        ephemeral: true,
      });
    }
  },
};

export default command;
