// ============================================
// SUFBOT V5 - Balance Command
// ============================================

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { prisma } from '@sufbot/database';
import { COLORS } from '@sufbot/shared';
import type { Command } from '../../../types';

const command: Command = {
  meta: {
    name: 'balance',
    description: 'Check your or another user\'s balance',
    category: 'economy',
    permissions: [],
    botPermissions: [],
    cooldown: 3000,
    guildOnly: true,
    ownerOnly: false,
    nsfw: false,
    panelEditable: true,
    enabled: true,
  },
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your or another user\'s balance')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to check balance for')
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    const targetUser = interaction.options.getUser('user') || interaction.user;

    const economyConfig = await prisma.economyConfig.findUnique({
      where: { guildId: interaction.guild.id },
    });

    if (!economyConfig) {
      await interaction.reply({
        content: '❌ Economy is not set up in this server.',
        ephemeral: true,
      });
      return;
    }

    let economyUser = await prisma.economyUser.findUnique({
      where: {
        guildId_userId: {
          guildId: interaction.guild.id,
          userId: targetUser.id,
        },
      },
    });

    if (!economyUser) {
      economyUser = await prisma.economyUser.create({
        data: {
          guildId: interaction.guild.id,
          userId: targetUser.id,
          balance: economyConfig.startingBalance,
        },
      });
    }

    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle(`${economyConfig.currencySymbol} ${targetUser.username}'s Balance`)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: '💵 Wallet', value: `${economyConfig.currencySymbol} ${economyUser.balance.toLocaleString()}`, inline: true },
        { name: '🏦 Bank', value: `${economyConfig.currencySymbol} ${economyUser.bank.toLocaleString()}`, inline: true },
        { name: '💰 Total', value: `${economyConfig.currencySymbol} ${(economyUser.balance + economyUser.bank).toLocaleString()}`, inline: true }
      )
      .setFooter({ text: `Total Earned: ${economyConfig.currencySymbol} ${economyUser.totalEarned.toLocaleString()}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
