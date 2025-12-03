// ============================================
// SUFBOT V5 - Set Nickname Command
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
    name: 'setnick',
    description: 'Change a member\'s nickname',
    category: 'moderation',
    permissions: [PermissionFlagsBits.ManageNicknames],
    botPermissions: [PermissionFlagsBits.ManageNicknames],
    cooldown: 3000,
    guildOnly: true,
    ownerOnly: false,
    nsfw: false,
    panelEditable: true,
    enabled: true,
  },
  data: new SlashCommandBuilder()
    .setName('setnick')
    .setDescription('Change a member\'s nickname')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to change nickname for')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('nickname')
        .setDescription('The new nickname (leave empty to reset)')
        .setRequired(false)
        .setMaxLength(32)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    const user = interaction.options.getUser('user', true);
    const newNickname = interaction.options.getString('nickname');

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

    // Check hierarchy
    const botMember = interaction.guild.members.me;
    const executor = interaction.member as GuildMember;

    if (botMember && member.roles.highest.position >= botMember.roles.highest.position) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setDescription('❌ I cannot change this user\'s nickname as their role is higher than or equal to mine.')
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
            .setDescription('❌ You cannot change this user\'s nickname as their role is higher than or equal to yours.')
        ],
        ephemeral: true,
      });
      return;
    }

    const oldNickname = member.nickname || member.user.username;

    try {
      await member.setNickname(newNickname, `Changed by ${interaction.user.tag}`);

      const embed = new EmbedBuilder()
        .setColor(COLORS.SUCCESS)
        .setTitle('✏️ Nickname Changed')
        .setThumbnail(member.displayAvatarURL())
        .addFields(
          { name: '👤 User', value: `${user.tag}\n\`${user.id}\``, inline: true },
          { name: '👮 Moderator', value: interaction.user.tag, inline: true },
          { name: '\u200b', value: '\u200b', inline: true },
          { name: '📝 Old Nickname', value: oldNickname, inline: true },
          { name: '📝 New Nickname', value: newNickname || '*Reset to username*', inline: true },
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
            .setDescription('❌ Failed to change the nickname. Please try again.')
        ],
        ephemeral: true,
      });
    }
  },
};

export default command;
