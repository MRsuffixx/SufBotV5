// ============================================
// SUFBOT V5 - Daily Command
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
    name: 'daily',
    description: 'Claim your daily reward',
    category: 'economy',
    permissions: [],
    botPermissions: [],
    cooldown: 5000,
    guildOnly: true,
    ownerOnly: false,
    nsfw: false,
    panelEditable: true,
    enabled: true,
  },
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily reward'),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    // Get economy config
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

    // Get or create economy user
    let economyUser = await prisma.economyUser.findUnique({
      where: {
        guildId_userId: {
          guildId: interaction.guild.id,
          userId: interaction.user.id,
        },
      },
    });

    if (!economyUser) {
      economyUser = await prisma.economyUser.create({
        data: {
          guildId: interaction.guild.id,
          userId: interaction.user.id,
          balance: economyConfig.startingBalance,
        },
      });
    }

    // Check cooldown
    const now = new Date();
    if (economyUser.lastDaily) {
      const cooldownEnd = new Date(economyUser.lastDaily.getTime() + economyConfig.dailyCooldown * 1000);
      if (now < cooldownEnd) {
        const remaining = Math.ceil((cooldownEnd.getTime() - now.getTime()) / 1000);
        const hours = Math.floor(remaining / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        const seconds = remaining % 60;

        await interaction.reply({
          content: `⏳ You can claim your daily reward in **${hours}h ${minutes}m ${seconds}s**`,
          ephemeral: true,
        });
        return;
      }
    }

    // Give daily reward
    const amount = economyConfig.dailyAmount;
    
    await prisma.economyUser.update({
      where: {
        guildId_userId: {
          guildId: interaction.guild.id,
          userId: interaction.user.id,
        },
      },
      data: {
        balance: { increment: amount },
        totalEarned: { increment: amount },
        lastDaily: now,
      },
    });

    const embed = new EmbedBuilder()
      .setColor(COLORS.SUCCESS)
      .setTitle('💰 Daily Reward Claimed!')
      .setDescription(`You received **${economyConfig.currencySymbol} ${amount.toLocaleString()} ${economyConfig.currencyName}**!`)
      .addFields(
        { name: 'New Balance', value: `${economyConfig.currencySymbol} ${(economyUser.balance + amount).toLocaleString()}`, inline: true }
      )
      .setFooter({ text: `Come back in ${economyConfig.dailyCooldown / 3600} hours for more!` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
