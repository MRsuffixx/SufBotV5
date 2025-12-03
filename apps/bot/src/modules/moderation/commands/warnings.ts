// ============================================
// SUFBOT V5 - Warnings Command
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
    name: 'warnings',
    description: 'View warnings for a user',
    category: 'moderation',
    permissions: [PermissionFlagsBits.ModerateMembers],
    botPermissions: [],
    cooldown: 5000,
    guildOnly: true,
    ownerOnly: false,
    nsfw: false,
    panelEditable: true,
    enabled: true,
  },
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View warnings for a user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to view warnings for')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    const user = interaction.options.getUser('user', true);

    await interaction.deferReply();

    try {
      const warnings = await prisma.warning.findMany({
        where: {
          guildId: interaction.guild.id,
          userId: user.id,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      if (warnings.length === 0) {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.SUCCESS)
              .setDescription(`✅ ${user.tag} has no warnings.`)
          ],
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(COLORS.WARNING)
        .setTitle(`⚠️ Warnings for ${user.tag}`)
        .setThumbnail(user.displayAvatarURL())
        .setDescription(`Showing ${warnings.length} most recent warning${warnings.length !== 1 ? 's' : ''}`)
        .setFooter({
          text: `Total: ${warnings.length} warning${warnings.length !== 1 ? 's' : ''} • Requested by ${interaction.user.username}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp();

      for (const warning of warnings) {
        const createdAt = Math.floor(warning.createdAt.getTime() / 1000);
        embed.addFields({
          name: `Warning #${warning.id.slice(-6)}`,
          value: [
            `**Reason:** ${warning.reason}`,
            `**Moderator:** <@${warning.moderatorId}>`,
            `**Date:** <t:${createdAt}:R>`,
          ].join('\n'),
          inline: false,
        });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Warnings error:', error);
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setDescription('❌ Failed to fetch warnings. Please try again.')
        ],
      });
    }
  },
};

export default command;
