// ============================================
// SUFBOT V5 - Unlock Channel Command
// ============================================

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  TextChannel,
  ChannelType,
} from 'discord.js';
import { COLORS } from '@sufbot/shared';
import type { Command } from '../../../types';

const command: Command = {
  meta: {
    name: 'unlock',
    description: 'Unlock a channel to allow messages from @everyone',
    category: 'moderation',
    permissions: [PermissionFlagsBits.ManageChannels],
    botPermissions: [PermissionFlagsBits.ManageChannels],
    cooldown: 5000,
    guildOnly: true,
    ownerOnly: false,
    nsfw: false,
    panelEditable: true,
    enabled: true,
  },
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock a channel to allow messages from @everyone')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('The channel to unlock (defaults to current)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    const targetChannel = (interaction.options.getChannel('channel') || interaction.channel) as TextChannel;

    if (!targetChannel || !targetChannel.isTextBased()) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setDescription('❌ Invalid channel.')
        ],
        ephemeral: true,
      });
      return;
    }

    // Get the @everyone role
    const everyoneRole = interaction.guild.roles.everyone;

    // Check current permissions
    const currentPerms = targetChannel.permissionOverwrites.cache.get(everyoneRole.id);
    const isSendMessagesDenied = currentPerms?.deny.has(PermissionFlagsBits.SendMessages);

    if (!isSendMessagesDenied) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.WARNING)
            .setDescription(`⚠️ ${targetChannel} is not locked.`)
        ],
        ephemeral: true,
      });
      return;
    }

    try {
      await targetChannel.permissionOverwrites.edit(everyoneRole, {
        SendMessages: null, // Reset to default (inherit from category/server)
      }, { reason: `Unlocked by ${interaction.user.tag}` });

      const embed = new EmbedBuilder()
        .setColor(COLORS.SUCCESS)
        .setTitle('🔓 Channel Unlocked')
        .setDescription(`${targetChannel} has been unlocked. Members can now send messages.`)
        .addFields(
          { name: '📁 Channel', value: targetChannel.toString(), inline: true },
          { name: '👮 Moderator', value: interaction.user.tag, inline: true },
        )
        .setFooter({
          text: `Requested by ${interaction.user.username}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      // Send a message in the unlocked channel if it's different from the current channel
      if (targetChannel.id !== interaction.channelId) {
        await targetChannel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.SUCCESS)
              .setTitle('🔓 Channel Unlocked')
              .setDescription(`This channel has been unlocked by ${interaction.user.tag}.`)
              .setTimestamp()
          ],
        });
      }

    } catch (error) {
      console.error('Unlock error:', error);
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setDescription('❌ Failed to unlock the channel. Please try again.')
        ],
        ephemeral: true,
      });
    }
  },
};

export default command;
