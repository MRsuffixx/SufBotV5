// ============================================
// SUFBOT V5 - Kick Command
// ============================================

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import { prisma } from '@sufbot/database';
import { COLORS } from '@sufbot/shared';
import type { Command } from '../../../types';

const command: Command = {
  meta: {
    name: 'kick',
    description: 'Kick a member from the server',
    category: 'moderation',
    permissions: [PermissionFlagsBits.KickMembers],
    botPermissions: [PermissionFlagsBits.KickMembers],
    cooldown: 3000,
    guildOnly: true,
    ownerOnly: false,
    nsfw: false,
    panelEditable: true,
    enabled: true,
  },
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to kick')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for the kick')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      await interaction.reply({
        content: '❌ User is not in this server.',
        ephemeral: true,
      });
      return;
    }

    // Check hierarchy
    const botMember = interaction.guild.members.me;
    const executorMember = interaction.member;

    if (botMember && member.roles.highest.position >= botMember.roles.highest.position) {
      await interaction.reply({
        content: '❌ I cannot kick this user as their role is higher than or equal to mine.',
        ephemeral: true,
      });
      return;
    }

    if (executorMember && 'roles' in executorMember && member.roles.highest.position >= executorMember.roles.highest.position) {
      await interaction.reply({
        content: '❌ You cannot kick this user as their role is higher than or equal to yours.',
        ephemeral: true,
      });
      return;
    }

    if (!member.kickable) {
      await interaction.reply({
        content: '❌ I cannot kick this user.',
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
      await member.kick(`${reason} | Moderator: ${interaction.user.tag}`);

      await prisma.modLog.create({
        data: {
          guildId: interaction.guild.id,
          caseNumber,
          action: 'KICK',
          userId: user.id,
          moderatorId: interaction.user.id,
          reason,
        },
      });

      const embed = new EmbedBuilder()
        .setColor(COLORS.WARNING)
        .setTitle('👢 Member Kicked')
        .addFields(
          { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
          { name: 'Moderator', value: interaction.user.tag, inline: true },
          { name: 'Reason', value: reason },
          { name: 'Case', value: `#${caseNumber}`, inline: true }
        )
        .setThumbnail(user.displayAvatarURL())
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      interaction.client.wsClient?.emitModAction({
        guildId: interaction.guild.id,
        action: 'KICK',
        userId: user.id,
        moderatorId: interaction.user.id,
        reason,
      });

    } catch (error) {
      await interaction.reply({
        content: '❌ Failed to kick the user. Please try again.',
        ephemeral: true,
      });
    }
  },
};

export default command;
