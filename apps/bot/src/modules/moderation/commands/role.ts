// ============================================
// SUFBOT V5 - Role Management Command
// ============================================

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  GuildMember,
  Role,
} from 'discord.js';
import { COLORS } from '@sufbot/shared';
import type { Command } from '../../../types';

const command: Command = {
  meta: {
    name: 'role',
    description: 'Manage roles for users',
    category: 'moderation',
    permissions: [PermissionFlagsBits.ManageRoles],
    botPermissions: [PermissionFlagsBits.ManageRoles],
    cooldown: 3000,
    guildOnly: true,
    ownerOnly: false,
    nsfw: false,
    panelEditable: true,
    enabled: true,
  },
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Manage roles for users')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a role to a user')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to add the role to')
            .setRequired(true)
        )
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('The role to add')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a role from a user')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to remove the role from')
            .setRequired(true)
        )
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('The role to remove')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('addall')
        .setDescription('Add a role to all members')
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('The role to add to everyone')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('removeall')
        .setDescription('Remove a role from all members')
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('The role to remove from everyone')
            .setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    const subcommand = interaction.options.getSubcommand();
    const role = interaction.options.getRole('role', true) as Role;
    const botMember = interaction.guild.members.me;
    const executor = interaction.member as GuildMember;

    // Check if bot can manage this role
    if (botMember && role.position >= botMember.roles.highest.position) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setDescription('❌ I cannot manage this role as it is higher than or equal to my highest role.')
        ],
        ephemeral: true,
      });
      return;
    }

    // Check if executor can manage this role
    if (executor && role.position >= executor.roles.highest.position && executor.id !== interaction.guild.ownerId) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setDescription('❌ You cannot manage this role as it is higher than or equal to your highest role.')
        ],
        ephemeral: true,
      });
      return;
    }

    // Check if role is managed (bot role, integration, etc.)
    if (role.managed) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setDescription('❌ This role is managed by an integration and cannot be manually assigned.')
        ],
        ephemeral: true,
      });
      return;
    }

    if (subcommand === 'add') {
      const user = interaction.options.getUser('user', true);
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

      if (member.roles.cache.has(role.id)) {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.WARNING)
              .setDescription(`⚠️ ${user.tag} already has the ${role} role.`)
          ],
          ephemeral: true,
        });
        return;
      }

      try {
        await member.roles.add(role, `Added by ${interaction.user.tag}`);

        const embed = new EmbedBuilder()
          .setColor(COLORS.SUCCESS)
          .setTitle('✅ Role Added')
          .setThumbnail(member.displayAvatarURL())
          .addFields(
            { name: '👤 User', value: `${user.tag}\n\`${user.id}\``, inline: true },
            { name: '🎭 Role', value: role.toString(), inline: true },
            { name: '👮 Moderator', value: interaction.user.tag, inline: true },
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
              .setDescription('❌ Failed to add the role. Please try again.')
          ],
          ephemeral: true,
        });
      }

    } else if (subcommand === 'remove') {
      const user = interaction.options.getUser('user', true);
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

      if (!member.roles.cache.has(role.id)) {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.WARNING)
              .setDescription(`⚠️ ${user.tag} doesn't have the ${role} role.`)
          ],
          ephemeral: true,
        });
        return;
      }

      try {
        await member.roles.remove(role, `Removed by ${interaction.user.tag}`);

        const embed = new EmbedBuilder()
          .setColor(COLORS.SUCCESS)
          .setTitle('✅ Role Removed')
          .setThumbnail(member.displayAvatarURL())
          .addFields(
            { name: '👤 User', value: `${user.tag}\n\`${user.id}\``, inline: true },
            { name: '🎭 Role', value: role.toString(), inline: true },
            { name: '👮 Moderator', value: interaction.user.tag, inline: true },
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
              .setDescription('❌ Failed to remove the role. Please try again.')
          ],
          ephemeral: true,
        });
      }

    } else if (subcommand === 'addall') {
      await interaction.deferReply();

      try {
        const members = await interaction.guild.members.fetch();
        const membersWithoutRole = members.filter(m => !m.roles.cache.has(role.id) && !m.user.bot);
        
        let success = 0;
        let failed = 0;

        for (const [, member] of membersWithoutRole) {
          try {
            await member.roles.add(role, `Mass role add by ${interaction.user.tag}`);
            success++;
          } catch {
            failed++;
          }
          // Rate limit prevention
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const embed = new EmbedBuilder()
          .setColor(COLORS.SUCCESS)
          .setTitle('✅ Role Added to All Members')
          .addFields(
            { name: '🎭 Role', value: role.toString(), inline: true },
            { name: '✅ Success', value: success.toString(), inline: true },
            { name: '❌ Failed', value: failed.toString(), inline: true },
            { name: '👮 Moderator', value: interaction.user.tag, inline: false },
          )
          .setFooter({
            text: `Requested by ${interaction.user.username}`,
            iconURL: interaction.user.displayAvatarURL(),
          })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.ERROR)
              .setDescription('❌ Failed to add role to members. Please try again.')
          ],
        });
      }

    } else if (subcommand === 'removeall') {
      await interaction.deferReply();

      try {
        const members = await interaction.guild.members.fetch();
        const membersWithRole = members.filter(m => m.roles.cache.has(role.id) && !m.user.bot);
        
        let success = 0;
        let failed = 0;

        for (const [, member] of membersWithRole) {
          try {
            await member.roles.remove(role, `Mass role remove by ${interaction.user.tag}`);
            success++;
          } catch {
            failed++;
          }
          // Rate limit prevention
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const embed = new EmbedBuilder()
          .setColor(COLORS.SUCCESS)
          .setTitle('✅ Role Removed from All Members')
          .addFields(
            { name: '🎭 Role', value: role.toString(), inline: true },
            { name: '✅ Success', value: success.toString(), inline: true },
            { name: '❌ Failed', value: failed.toString(), inline: true },
            { name: '👮 Moderator', value: interaction.user.tag, inline: false },
          )
          .setFooter({
            text: `Requested by ${interaction.user.username}`,
            iconURL: interaction.user.displayAvatarURL(),
          })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.ERROR)
              .setDescription('❌ Failed to remove role from members. Please try again.')
          ],
        });
      }
    }
  },
};

export default command;
