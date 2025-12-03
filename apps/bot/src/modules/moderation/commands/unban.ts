// ============================================
// SUFBOT V5 - Unban Command
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
    name: 'unban',
    description: 'Unban a user from the server',
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
    .setName('unban')
    .setDescription('Unban a user from the server')
    .addStringOption(option =>
      option
        .setName('user')
        .setDescription('User ID or username to unban')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for the unban')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async autocomplete(interaction) {
    if (!interaction.guild) return;

    const focusedValue = interaction.options.getFocused().toLowerCase();
    
    try {
      const bans = await interaction.guild.bans.fetch();
      const filtered = bans
        .filter(ban => 
          ban.user.username.toLowerCase().includes(focusedValue) ||
          ban.user.id.includes(focusedValue)
        )
        .first(25);

      await interaction.respond(
        Array.from(filtered.values()).map(ban => ({
          name: `${ban.user.username} (${ban.user.id})`,
          value: ban.user.id,
        }))
      );
    } catch {
      await interaction.respond([]);
    }
  },

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    const userInput = interaction.options.getString('user', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';

    // Try to find the banned user
    let bannedUser;
    try {
      const bans = await interaction.guild.bans.fetch();
      
      // Try to find by ID first
      bannedUser = bans.get(userInput);
      
      // If not found, try to find by username
      if (!bannedUser) {
        bannedUser = bans.find(ban => 
          ban.user.username.toLowerCase() === userInput.toLowerCase() ||
          ban.user.id === userInput
        );
      }
    } catch (error) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setDescription('❌ Failed to fetch ban list.')
        ],
        ephemeral: true,
      });
      return;
    }

    if (!bannedUser) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setDescription('❌ User not found in the ban list. Make sure you entered the correct user ID or username.')
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
      await interaction.guild.members.unban(bannedUser.user.id, `${reason} | Moderator: ${interaction.user.tag}`);

      // Create mod log entry
      await prisma.modLog.create({
        data: {
          guildId: interaction.guild.id,
          caseNumber,
          action: 'UNBAN',
          userId: bannedUser.user.id,
          moderatorId: interaction.user.id,
          reason,
        },
      });

      const embed = new EmbedBuilder()
        .setColor(COLORS.SUCCESS)
        .setTitle('🔓 Member Unbanned')
        .addFields(
          { name: '👤 User', value: `${bannedUser.user.tag}\n\`${bannedUser.user.id}\``, inline: true },
          { name: '👮 Moderator', value: `${interaction.user.tag}`, inline: true },
          { name: '📝 Reason', value: reason, inline: false },
          { name: '📋 Case', value: `#${caseNumber}`, inline: true }
        )
        .setThumbnail(bannedUser.user.displayAvatarURL())
        .setFooter({ text: `User was originally banned for: ${bannedUser.reason || 'No reason recorded'}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      // Emit mod action to API
      interaction.client.wsClient?.emitModAction({
        guildId: interaction.guild.id,
        action: 'UNBAN',
        userId: bannedUser.user.id,
        moderatorId: interaction.user.id,
        reason,
      });

    } catch (error) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setDescription('❌ Failed to unban the user. Please try again.')
        ],
        ephemeral: true,
      });
    }
  },
};

export default command;
