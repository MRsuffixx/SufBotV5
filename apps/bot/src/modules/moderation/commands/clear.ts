// ============================================
// SUFBOT V5 - Clear/Purge Command
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
    name: 'clear',
    description: 'Delete multiple messages from a channel',
    category: 'moderation',
    permissions: [PermissionFlagsBits.ManageMessages],
    botPermissions: [PermissionFlagsBits.ManageMessages],
    cooldown: 5000,
    guildOnly: true,
    ownerOnly: false,
    nsfw: false,
    panelEditable: true,
    enabled: true,
  },
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Delete multiple messages from a channel')
    .addIntegerOption(option =>
      option
        .setName('amount')
        .setDescription('Number of messages to delete (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('Only delete messages from this user')
        .setRequired(false)
    )
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('Channel to clear messages from (defaults to current)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    const amount = interaction.options.getInteger('amount', true);
    const targetUser = interaction.options.getUser('user');
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

    await interaction.deferReply({ ephemeral: true });

    try {
      // Fetch messages
      const messages = await targetChannel.messages.fetch({ limit: 100 });
      
      // Filter messages
      let messagesToDelete = messages.filter(msg => {
        // Can't delete messages older than 14 days
        const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
        if (msg.createdTimestamp < twoWeeksAgo) return false;
        
        // Filter by user if specified
        if (targetUser && msg.author.id !== targetUser.id) return false;
        
        return true;
      });

      // Limit to requested amount
      const limitedMessages = [...messagesToDelete.values()].slice(0, amount);

      if (limitedMessages.length === 0) {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.WARNING)
              .setDescription('⚠️ No messages found to delete. Messages older than 14 days cannot be bulk deleted.')
          ],
        });
        return;
      }

      // Delete messages
      const deleted = await targetChannel.bulkDelete(limitedMessages, true);

      const embed = new EmbedBuilder()
        .setColor(COLORS.SUCCESS)
        .setTitle('🗑️ Messages Cleared')
        .addFields(
          { name: '📊 Deleted', value: `${deleted.size} message${deleted.size !== 1 ? 's' : ''}`, inline: true },
          { name: '📁 Channel', value: targetChannel.toString(), inline: true },
          { name: '👮 Moderator', value: interaction.user.tag, inline: true },
        )
        .setFooter({
          text: `Requested by ${interaction.user.username}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp();

      if (targetUser) {
        embed.addFields({ name: '👤 Filtered by User', value: targetUser.tag, inline: true });
      }

      await interaction.editReply({ embeds: [embed] });

      // Send a temporary message in the channel
      if (targetChannel.id !== interaction.channelId) {
        const tempMsg = await targetChannel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.SUCCESS)
              .setDescription(`🗑️ **${deleted.size}** message${deleted.size !== 1 ? 's' : ''} deleted by ${interaction.user.tag}`)
          ],
        });
        
        setTimeout(() => tempMsg.delete().catch(() => {}), 5000);
      }

    } catch (error) {
      console.error('Clear error:', error);
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setDescription('❌ Failed to delete messages. Make sure the messages are not older than 14 days.')
        ],
      });
    }
  },
};

export default command;
