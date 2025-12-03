// ============================================
// SUFBOT V5 - Voice Kick Command
// ============================================

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  GuildMember,
} from 'discord.js';
import { COLORS } from '@sufbot/shared';
import type { Command } from '../../../types';

const command: Command = {
  meta: {
    name: 'voicekick',
    description: 'Disconnect a member from voice channel',
    category: 'moderation',
    permissions: [PermissionFlagsBits.MoveMembers],
    botPermissions: [PermissionFlagsBits.MoveMembers],
    cooldown: 3000,
    guildOnly: true,
    ownerOnly: false,
    nsfw: false,
    panelEditable: true,
    enabled: true,
  },
  data: new SlashCommandBuilder()
    .setName('voicekick')
    .setDescription('Disconnect a member from voice channel')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to disconnect from voice')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for the voice kick')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setDescription('❌ User is not in this server.')
        ],
        ephemeral: true,
      });
      return;
    }

    if (!member.voice.channel) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setDescription('❌ This user is not in a voice channel.')
        ],
        ephemeral: true,
      });
      return;
    }

    const voiceChannel = member.voice.channel;

    // Check hierarchy
    const botMember = interaction.guild.members.me;
    const executor = interaction.member as GuildMember;

    if (botMember && member.roles.highest.position >= botMember.roles.highest.position) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setDescription('❌ I cannot disconnect this user as their role is higher than or equal to mine.')
        ],
        ephemeral: true,
      });
      return;
    }

    if (executor && member.roles.highest.position >= executor.roles.highest.position && executor.id !== interaction.guild.ownerId) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setDescription('❌ You cannot disconnect this user as their role is higher than or equal to yours.')
        ],
        ephemeral: true,
      });
      return;
    }

    try {
      await member.voice.disconnect(reason);

      const embed = new EmbedBuilder()
        .setColor(COLORS.WARNING)
        .setTitle('🔇 Member Disconnected from Voice')
        .setThumbnail(member.displayAvatarURL())
        .addFields(
          { name: '👤 User', value: `${user.tag}\n\`${user.id}\``, inline: true },
          { name: '👮 Moderator', value: interaction.user.tag, inline: true },
          { name: '🔊 Channel', value: voiceChannel.name, inline: true },
          { name: '📝 Reason', value: reason, inline: false },
        )
        .setFooter({
          text: `Requested by ${interaction.user.username}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } catch (error) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setDescription('❌ Failed to disconnect the user from voice. Please try again.')
        ],
        ephemeral: true,
      });
    }
  },
};

export default command;
