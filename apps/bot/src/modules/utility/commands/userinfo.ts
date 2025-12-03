// ============================================
// SUFBOT V5 - User Info Command
// ============================================

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  UserFlagsBitField,
  ActivityType,
} from 'discord.js';
import { COLORS } from '@sufbot/shared';
import type { Command } from '../../../types';

// Badge emojis mapping
const BADGES: Record<string, string> = {
  Staff: '<:discord_staff:1234567890>',
  Partner: '<:partner:1234567890>',
  Hypesquad: '<:hypesquad:1234567890>',
  BugHunterLevel1: '🐛',
  BugHunterLevel2: '🐛',
  HypeSquadOnlineHouse1: '🏠', // Bravery
  HypeSquadOnlineHouse2: '🏠', // Brilliance
  HypeSquadOnlineHouse3: '🏠', // Balance
  PremiumEarlySupporter: '👑',
  VerifiedDeveloper: '👨‍💻',
  CertifiedModerator: '🛡️',
  ActiveDeveloper: '🔨',
  Nitro: '<:nitro:1234567890>',
};

const getBadges = (flags: Readonly<UserFlagsBitField> | null): string => {
  if (!flags) return 'None';
  
  const badges: string[] = [];
  const flagArray = flags.toArray();
  
  const badgeMap: Record<string, string> = {
    'Staff': '👨‍💼 Discord Staff',
    'Partner': '🤝 Partner',
    'Hypesquad': '🎉 HypeSquad Events',
    'BugHunterLevel1': '🐛 Bug Hunter',
    'BugHunterLevel2': '🐛 Bug Hunter Gold',
    'HypeSquadOnlineHouse1': '🏠 HypeSquad Bravery',
    'HypeSquadOnlineHouse2': '✨ HypeSquad Brilliance',
    'HypeSquadOnlineHouse3': '⚖️ HypeSquad Balance',
    'PremiumEarlySupporter': '👑 Early Supporter',
    'VerifiedDeveloper': '👨‍💻 Verified Bot Developer',
    'CertifiedModerator': '🛡️ Certified Moderator',
    'ActiveDeveloper': '🔨 Active Developer',
    'VerifiedBot': '✅ Verified Bot',
    'BotHTTPInteractions': '🤖 HTTP Bot',
  };

  for (const flag of flagArray) {
    if (badgeMap[flag]) {
      badges.push(badgeMap[flag]);
    }
  }

  return badges.length > 0 ? badges.join('\n') : 'None';
};

const getStatusEmoji = (status: string | undefined): string => {
  switch (status) {
    case 'online': return '🟢';
    case 'idle': return '🟡';
    case 'dnd': return '🔴';
    case 'offline': return '⚫';
    default: return '⚫';
  }
};

const getActivityString = (member: GuildMember): string => {
  const activities = member.presence?.activities || [];
  if (activities.length === 0) return 'No activity';

  const activity = activities[0];
  const typeNames: Record<number, string> = {
    [ActivityType.Playing]: 'Playing',
    [ActivityType.Streaming]: 'Streaming',
    [ActivityType.Listening]: 'Listening to',
    [ActivityType.Watching]: 'Watching',
    [ActivityType.Custom]: '',
    [ActivityType.Competing]: 'Competing in',
  };

  const typeName = typeNames[activity.type] || '';
  
  if (activity.type === ActivityType.Custom) {
    return activity.state || 'Custom Status';
  }
  
  return `${typeName} ${activity.name}`;
};

const command: Command = {
  meta: {
    name: 'userinfo',
    description: 'Display detailed information about a user',
    category: 'utility',
    permissions: [],
    botPermissions: [],
    cooldown: 5000,
    guildOnly: true,
    ownerOnly: false,
    nsfw: false,
    panelEditable: false,
    enabled: true,
  },
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Display detailed information about a user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to get information about (defaults to yourself)')
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    await interaction.deferReply();

    const targetUser = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    const user = await targetUser.fetch(); // Fetch full user data including banner

    // Get user creation date
    const createdAt = Math.floor(targetUser.createdTimestamp / 1000);
    
    // Build the embed
    const embed = new EmbedBuilder()
      .setColor(member?.displayHexColor || COLORS.PRIMARY)
      .setAuthor({
        name: `${targetUser.username}${targetUser.discriminator !== '0' ? `#${targetUser.discriminator}` : ''}`,
        iconURL: targetUser.displayAvatarURL({ size: 256 }),
      })
      .setThumbnail(targetUser.displayAvatarURL({ size: 512 }))
      .addFields(
        {
          name: '👤 User Information',
          value: [
            `**ID:** \`${targetUser.id}\``,
            `**Username:** ${targetUser.username}`,
            `**Display Name:** ${targetUser.displayName || targetUser.username}`,
            `**Bot:** ${targetUser.bot ? 'Yes 🤖' : 'No'}`,
            `**Created:** <t:${createdAt}:F> (<t:${createdAt}:R>)`,
          ].join('\n'),
          inline: false,
        }
      );

    // Add member-specific info if in guild
    if (member) {
      const joinedAt = Math.floor(member.joinedTimestamp! / 1000);
      const roles = member.roles.cache
        .filter(role => role.id !== interaction.guild!.id)
        .sort((a, b) => b.position - a.position)
        .map(role => role.toString());
      
      const rolesDisplay = roles.length > 10 
        ? `${roles.slice(0, 10).join(', ')} and ${roles.length - 10} more...`
        : roles.join(', ') || 'None';

      const boostingSince = member.premiumSince 
        ? `<t:${Math.floor(member.premiumSinceTimestamp! / 1000)}:R>`
        : 'Not boosting';

      embed.addFields(
        {
          name: '📋 Server Information',
          value: [
            `**Nickname:** ${member.nickname || 'None'}`,
            `**Joined:** <t:${joinedAt}:F> (<t:${joinedAt}:R>)`,
            `**Boosting:** ${boostingSince}`,
            `**Status:** ${getStatusEmoji(member.presence?.status)} ${member.presence?.status || 'Offline'}`,
            `**Activity:** ${getActivityString(member)}`,
          ].join('\n'),
          inline: false,
        },
        {
          name: `🎭 Roles [${roles.length}]`,
          value: rolesDisplay || 'None',
          inline: false,
        }
      );

      // Key permissions
      const keyPerms: string[] = [];
      if (member.permissions.has('Administrator')) keyPerms.push('👑 Administrator');
      if (member.permissions.has('ManageGuild')) keyPerms.push('⚙️ Manage Server');
      if (member.permissions.has('ManageRoles')) keyPerms.push('🎭 Manage Roles');
      if (member.permissions.has('ManageChannels')) keyPerms.push('📁 Manage Channels');
      if (member.permissions.has('BanMembers')) keyPerms.push('🔨 Ban Members');
      if (member.permissions.has('KickMembers')) keyPerms.push('👢 Kick Members');
      if (member.permissions.has('ModerateMembers')) keyPerms.push('⏰ Timeout Members');
      if (member.permissions.has('ManageMessages')) keyPerms.push('💬 Manage Messages');

      if (keyPerms.length > 0) {
        embed.addFields({
          name: '🔑 Key Permissions',
          value: keyPerms.join('\n'),
          inline: false,
        });
      }
    }

    // Add badges
    embed.addFields({
      name: '🏅 Badges',
      value: getBadges(targetUser.flags),
      inline: false,
    });

    // Set banner if available
    if (user.banner) {
      embed.setImage(user.bannerURL({ size: 512 }) || null);
    }

    embed.setFooter({
      text: `Requested by ${interaction.user.username}`,
      iconURL: interaction.user.displayAvatarURL(),
    });
    embed.setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};

export default command;
