// ============================================
// SUFBOT V5 - Avatar Command
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
    name: 'avatar',
    description: 'Display a user\'s avatar in full size',
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
    .setName('avatar')
    .setDescription('Display a user\'s avatar in full size')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user whose avatar to display (defaults to yourself)')
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    
    // Get avatar URLs in different formats
    const avatarPNG = targetUser.displayAvatarURL({ extension: 'png', size: 4096 });
    const avatarJPG = targetUser.displayAvatarURL({ extension: 'jpg', size: 4096 });
    const avatarWEBP = targetUser.displayAvatarURL({ extension: 'webp', size: 4096 });
    const avatarGIF = targetUser.avatar?.startsWith('a_') 
      ? targetUser.displayAvatarURL({ extension: 'gif', size: 4096 })
      : null;

    // Check if user has a server-specific avatar
    let serverAvatar: string | null = null;
    if (interaction.guild) {
      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (member?.avatar) {
        serverAvatar = member.displayAvatarURL({ size: 4096 });
      }
    }

    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setAuthor({
        name: `${targetUser.username}'s Avatar`,
        iconURL: targetUser.displayAvatarURL({ size: 64 }),
      })
      .setImage(avatarPNG)
      .setFooter({
        text: `Requested by ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();

    // Add server avatar info if different
    if (serverAvatar && serverAvatar !== avatarPNG) {
      embed.setDescription('📌 This user has a server-specific avatar. Use the button below to view it.');
    }

    // Create download buttons
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('PNG')
        .setStyle(ButtonStyle.Link)
        .setURL(avatarPNG),
      new ButtonBuilder()
        .setLabel('JPG')
        .setStyle(ButtonStyle.Link)
        .setURL(avatarJPG),
      new ButtonBuilder()
        .setLabel('WEBP')
        .setStyle(ButtonStyle.Link)
        .setURL(avatarWEBP),
    );

    // Add GIF button if animated
    if (avatarGIF) {
      row.addComponents(
        new ButtonBuilder()
          .setLabel('GIF')
          .setStyle(ButtonStyle.Link)
          .setURL(avatarGIF)
      );
    }

    // Add server avatar button if exists
    if (serverAvatar && serverAvatar !== avatarPNG) {
      row.addComponents(
        new ButtonBuilder()
          .setLabel('Server Avatar')
          .setStyle(ButtonStyle.Link)
          .setURL(serverAvatar)
      );
    }

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};

export default command;
