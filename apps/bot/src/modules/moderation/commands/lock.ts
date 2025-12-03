// ============================================
// SUFBOT V5 - Lock Channel Command
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
    name: 'lock',
    description: 'Lock a channel to prevent messages from @everyone',
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
    .setName('lock')
    .setDescription('Lock a channel to prevent messages from @everyone')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('The channel to lock (defaults to current)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for locking the channel')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    const targetChannel = (interaction.options.getChannel('channel') || interaction.channel) as TextChannel;
    const reason = interaction.options.getString('reason') || 'No reason provided';

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

    if (isSendMessagesDenied) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.WARNING)
            .setDescription(`⚠️ ${targetChannel} is already locked.`)
        ],
        ephemeral: true,
      });
      return;
    }

    try {
      await targetChannel.permissionOverwrites.edit(everyoneRole, {
        SendMessages: false,
      }, { reason: `Locked by ${interaction.user.tag}: ${reason}` });

      const embed = new EmbedBuilder()
        .setColor(COLORS.ERROR)
        .setTitle('🔒 Channel Locked')
        .setDescription(`${targetChannel} has been locked. Members can no longer send messages.`)
        .addFields(
          { name: '📁 Channel', value: targetChannel.toString(), inline: true },
          { name: '👮 Moderator', value: interaction.user.tag, inline: true },
          { name: '📝 Reason', value: reason, inline: false },
        )
        .setFooter({
          text: `Requested by ${interaction.user.username}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      // Send a message in the locked channel if it's different from the current channel
      if (targetChannel.id !== interaction.channelId) {
        await targetChannel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.ERROR)
              .setTitle('🔒 Channel Locked')
              .setDescription(`This channel has been locked by ${interaction.user.tag}.`)
              .addFields({ name: '📝 Reason', value: reason })
              .setTimestamp()
          ],
        });
      }

    } catch (error) {
      console.error('Lock error:', error);
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setDescription('❌ Failed to lock the channel. Please try again.')
        ],
        ephemeral: true,
      });
    }
  },
};

export default command;
