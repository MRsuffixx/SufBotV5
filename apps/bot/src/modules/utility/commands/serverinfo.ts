// ============================================
// SUFBOT V5 - Server Info Command
// ============================================

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ChannelType,
  GuildVerificationLevel,
  GuildExplicitContentFilter,
  GuildNSFWLevel,
  GuildPremiumTier,
} from 'discord.js';
import { COLORS } from '@sufbot/shared';
import type { Command } from '../../../types';

const VERIFICATION_LEVELS: Record<GuildVerificationLevel, string> = {
  [GuildVerificationLevel.None]: '🔓 None',
  [GuildVerificationLevel.Low]: '📧 Low (Email verified)',
  [GuildVerificationLevel.Medium]: '⏰ Medium (5 min account age)',
  [GuildVerificationLevel.High]: '📱 High (10 min member)',
  [GuildVerificationLevel.VeryHigh]: '☎️ Very High (Phone verified)',
};

const CONTENT_FILTER: Record<GuildExplicitContentFilter, string> = {
  [GuildExplicitContentFilter.Disabled]: '🔴 Disabled',
  [GuildExplicitContentFilter.MembersWithoutRoles]: '🟡 Members without roles',
  [GuildExplicitContentFilter.AllMembers]: '🟢 All members',
};

const NSFW_LEVELS: Record<GuildNSFWLevel, string> = {
  [GuildNSFWLevel.Default]: 'Default',
  [GuildNSFWLevel.Explicit]: 'Explicit',
  [GuildNSFWLevel.Safe]: 'Safe',
  [GuildNSFWLevel.AgeRestricted]: 'Age Restricted',
};

const BOOST_TIERS: Record<GuildPremiumTier, string> = {
  [GuildPremiumTier.None]: 'No Level',
  [GuildPremiumTier.Tier1]: 'Level 1',
  [GuildPremiumTier.Tier2]: 'Level 2',
  [GuildPremiumTier.Tier3]: 'Level 3',
};

const command: Command = {
  meta: {
    name: 'serverinfo',
    description: 'Display detailed information about the server',
    category: 'utility',
    permissions: [],
    botPermissions: [],
    cooldown: 10000,
    guildOnly: true,
    ownerOnly: false,
    nsfw: false,
    panelEditable: false,
    enabled: true,
  },
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Display detailed information about the server'),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    await interaction.deferReply();

    const guild = interaction.guild;
    
    // Fetch additional data
    await guild.members.fetch();
    const owner = await guild.fetchOwner();
    
    // Channel counts
    const channels = guild.channels.cache;
    const textChannels = channels.filter(c => c.type === ChannelType.GuildText).size;
    const voiceChannels = channels.filter(c => c.type === ChannelType.GuildVoice).size;
    const categories = channels.filter(c => c.type === ChannelType.GuildCategory).size;
    const forumChannels = channels.filter(c => c.type === ChannelType.GuildForum).size;
    const stageChannels = channels.filter(c => c.type === ChannelType.GuildStageVoice).size;
    const announcementChannels = channels.filter(c => c.type === ChannelType.GuildAnnouncement).size;

    // Member counts
    const members = guild.members.cache;
    const humans = members.filter(m => !m.user.bot).size;
    const bots = members.filter(m => m.user.bot).size;
    const online = members.filter(m => m.presence?.status === 'online').size;
    const idle = members.filter(m => m.presence?.status === 'idle').size;
    const dnd = members.filter(m => m.presence?.status === 'dnd').size;
    const offline = members.filter(m => !m.presence || m.presence.status === 'offline').size;

    // Role count
    const roles = guild.roles.cache.size - 1; // Exclude @everyone

    // Emoji and sticker counts
    const emojis = guild.emojis.cache;
    const staticEmojis = emojis.filter(e => !e.animated).size;
    const animatedEmojis = emojis.filter(e => e.animated).size;
    const stickers = guild.stickers.cache.size;

    // Server creation date
    const createdAt = Math.floor(guild.createdTimestamp / 1000);

    // Features
    const features = guild.features.length > 0
      ? guild.features.map(f => `\`${f.replace(/_/g, ' ').toLowerCase()}\``).join(', ')
      : 'None';

    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setAuthor({
        name: guild.name,
        iconURL: guild.iconURL({ size: 256 }) || undefined,
      })
      .setThumbnail(guild.iconURL({ size: 512 }))
      .addFields(
        {
          name: '📋 General Information',
          value: [
            `**ID:** \`${guild.id}\``,
            `**Owner:** ${owner.user.tag}`,
            `**Created:** <t:${createdAt}:F> (<t:${createdAt}:R>)`,
            `**Verification:** ${VERIFICATION_LEVELS[guild.verificationLevel]}`,
            `**Content Filter:** ${CONTENT_FILTER[guild.explicitContentFilter]}`,
          ].join('\n'),
          inline: false,
        },
        {
          name: `👥 Members [${guild.memberCount.toLocaleString()}]`,
          value: [
            `👤 **Humans:** ${humans.toLocaleString()}`,
            `🤖 **Bots:** ${bots.toLocaleString()}`,
            ``,
            `🟢 Online: ${online} | 🟡 Idle: ${idle}`,
            `🔴 DND: ${dnd} | ⚫ Offline: ${offline}`,
          ].join('\n'),
          inline: true,
        },
        {
          name: `📁 Channels [${channels.size}]`,
          value: [
            `💬 Text: ${textChannels}`,
            `🔊 Voice: ${voiceChannels}`,
            `📢 Announcement: ${announcementChannels}`,
            `🎭 Stage: ${stageChannels}`,
            `📂 Categories: ${categories}`,
            `💬 Forums: ${forumChannels}`,
          ].join('\n'),
          inline: true,
        },
        {
          name: `🎭 Roles [${roles}]`,
          value: roles > 0 
            ? guild.roles.cache
                .filter(r => r.id !== guild.id)
                .sort((a, b) => b.position - a.position)
                .first(5)
                ?.map(r => r.toString())
                .join(', ') + (roles > 5 ? ` and ${roles - 5} more...` : '')
            : 'No roles',
          inline: false,
        },
        {
          name: '😀 Emojis & Stickers',
          value: [
            `Static: ${staticEmojis} | Animated: ${animatedEmojis}`,
            `Stickers: ${stickers}`,
          ].join('\n'),
          inline: true,
        },
        {
          name: '🚀 Boost Status',
          value: [
            `**Level:** ${BOOST_TIERS[guild.premiumTier]}`,
            `**Boosts:** ${guild.premiumSubscriptionCount || 0}`,
          ].join('\n'),
          inline: true,
        }
      );

    // Add banner if exists
    if (guild.banner) {
      embed.setImage(guild.bannerURL({ size: 1024 }));
    }

    // Add features if any notable ones
    if (guild.features.length > 0) {
      embed.addFields({
        name: '✨ Server Features',
        value: features.length > 1024 ? features.slice(0, 1021) + '...' : features,
        inline: false,
      });
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
