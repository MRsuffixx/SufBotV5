// ============================================
// SUFBOT V5 - Banner Command
// ============================================

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { COLORS } from '@sufbot/shared';
import type { Command } from '../../../types';

const command: Command = {
  meta: {
    name: 'banner',
    description: 'Display a user\'s profile banner',
    category: 'utility',
    permissions: [],
    botPermissions: [],
    cooldown: 5000,
    guildOnly: false,
    ownerOnly: false,
    nsfw: false,
    panelEditable: false,
    enabled: true,
  },
  data: new SlashCommandBuilder()
    .setName('banner')
    .setDescription('Display a user\'s profile banner')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user whose banner to display (defaults to yourself)')
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    
    // Fetch full user data to get banner
    const user = await targetUser.fetch();

    if (!user.banner) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.WARNING)
            .setDescription(`⚠️ ${targetUser.id === interaction.user.id ? 'You don\'t' : `${targetUser.username} doesn't`} have a profile banner.`)
        ],
        ephemeral: true,
      });
      return;
    }

    // Get banner URLs in different formats
    const bannerPNG = user.bannerURL({ extension: 'png', size: 4096 })!;
    const bannerJPG = user.bannerURL({ extension: 'jpg', size: 4096 })!;
    const bannerWEBP = user.bannerURL({ extension: 'webp', size: 4096 })!;
    const bannerGIF = user.banner.startsWith('a_') 
      ? user.bannerURL({ extension: 'gif', size: 4096 })
      : null;

    const embed = new EmbedBuilder()
      .setColor(user.accentColor || COLORS.PRIMARY)
      .setAuthor({
        name: `${targetUser.username}'s Banner`,
        iconURL: targetUser.displayAvatarURL({ size: 64 }),
      })
      .setImage(bannerPNG)
      .setFooter({
        text: `Requested by ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();

    // Create download buttons
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('PNG')
        .setStyle(ButtonStyle.Link)
        .setURL(bannerPNG),
      new ButtonBuilder()
        .setLabel('JPG')
        .setStyle(ButtonStyle.Link)
        .setURL(bannerJPG),
      new ButtonBuilder()
        .setLabel('WEBP')
        .setStyle(ButtonStyle.Link)
        .setURL(bannerWEBP),
    );

    // Add GIF button if animated
    if (bannerGIF) {
      row.addComponents(
        new ButtonBuilder()
          .setLabel('GIF')
          .setStyle(ButtonStyle.Link)
          .setURL(bannerGIF)
      );
    }

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};

export default command;
