// ============================================
// SUFBOT V5 - Slash Commands Registry
// ============================================

import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export interface SlashCommand {
  data: ReturnType<SlashCommandBuilder['toJSON']>;
  module: string;
  cooldown?: number;
}

// ============================================
// General Commands
// ============================================

const ping = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Check bot latency and response time');

const help = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Show all available commands and information')
  .addStringOption(option =>
    option
      .setName('command')
      .setDescription('Get detailed help for a specific command')
      .setRequired(false)
  );

const serverinfo = new SlashCommandBuilder()
  .setName('serverinfo')
  .setDescription('Display detailed information about the server');

const userinfo = new SlashCommandBuilder()
  .setName('userinfo')
  .setDescription('Display information about a user')
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('The user to get information about')
      .setRequired(false)
  );

const avatar = new SlashCommandBuilder()
  .setName('avatar')
  .setDescription('Display a user\'s avatar')
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('The user to get avatar from')
      .setRequired(false)
  );

const botinfo = new SlashCommandBuilder()
  .setName('botinfo')
  .setDescription('Display information about the bot');

// ============================================
// Moderation Commands
// ============================================

const ban = new SlashCommandBuilder()
  .setName('ban')
  .setDescription('Ban a user from the server')
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('The user to ban')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('reason')
      .setDescription('Reason for the ban')
      .setRequired(false)
  )
  .addIntegerOption(option =>
    option
      .setName('delete_days')
      .setDescription('Number of days of messages to delete (0-7)')
      .setMinValue(0)
      .setMaxValue(7)
      .setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

const kick = new SlashCommandBuilder()
  .setName('kick')
  .setDescription('Kick a user from the server')
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('The user to kick')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('reason')
      .setDescription('Reason for the kick')
      .setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers);

const timeout = new SlashCommandBuilder()
  .setName('timeout')
  .setDescription('Timeout a user (mute)')
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('The user to timeout')
      .setRequired(true)
  )
  .addIntegerOption(option =>
    option
      .setName('duration')
      .setDescription('Duration in minutes')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(40320) // 28 days max
  )
  .addStringOption(option =>
    option
      .setName('reason')
      .setDescription('Reason for the timeout')
      .setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

const untimeout = new SlashCommandBuilder()
  .setName('untimeout')
  .setDescription('Remove timeout from a user')
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('The user to remove timeout from')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('reason')
      .setDescription('Reason for removing timeout')
      .setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

const warn = new SlashCommandBuilder()
  .setName('warn')
  .setDescription('Warn a user')
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('The user to warn')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('reason')
      .setDescription('Reason for the warning')
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

const warnings = new SlashCommandBuilder()
  .setName('warnings')
  .setDescription('View warnings for a user')
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('The user to check warnings for')
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

const clearwarnings = new SlashCommandBuilder()
  .setName('clearwarnings')
  .setDescription('Clear all warnings for a user')
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('The user to clear warnings for')
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const purge = new SlashCommandBuilder()
  .setName('purge')
  .setDescription('Delete multiple messages at once')
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
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

const slowmode = new SlashCommandBuilder()
  .setName('slowmode')
  .setDescription('Set slowmode for a channel')
  .addIntegerOption(option =>
    option
      .setName('seconds')
      .setDescription('Slowmode duration in seconds (0 to disable)')
      .setRequired(true)
      .setMinValue(0)
      .setMaxValue(21600) // 6 hours max
  )
  .addChannelOption(option =>
    option
      .setName('channel')
      .setDescription('The channel to set slowmode in')
      .setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

const lock = new SlashCommandBuilder()
  .setName('lock')
  .setDescription('Lock a channel (prevent sending messages)')
  .addChannelOption(option =>
    option
      .setName('channel')
      .setDescription('The channel to lock')
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('reason')
      .setDescription('Reason for locking')
      .setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

const unlock = new SlashCommandBuilder()
  .setName('unlock')
  .setDescription('Unlock a channel')
  .addChannelOption(option =>
    option
      .setName('channel')
      .setDescription('The channel to unlock')
      .setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

const modlogs = new SlashCommandBuilder()
  .setName('modlogs')
  .setDescription('View moderation logs for a user')
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('The user to check logs for')
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

// ============================================
// Utility Commands
// ============================================

const poll = new SlashCommandBuilder()
  .setName('poll')
  .setDescription('Create a poll')
  .addStringOption(option =>
    option
      .setName('question')
      .setDescription('The poll question')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('options')
      .setDescription('Poll options separated by | (e.g., "Yes | No | Maybe")')
      .setRequired(false)
  );

const remind = new SlashCommandBuilder()
  .setName('remind')
  .setDescription('Set a reminder')
  .addStringOption(option =>
    option
      .setName('time')
      .setDescription('When to remind (e.g., "10m", "1h", "1d")')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('message')
      .setDescription('What to remind you about')
      .setRequired(true)
  );

// ============================================
// Export all commands
// ============================================

export const slashCommands: SlashCommand[] = [
  // General
  { data: ping.toJSON(), module: 'general', cooldown: 3 },
  { data: help.toJSON(), module: 'general', cooldown: 5 },
  { data: serverinfo.toJSON(), module: 'general', cooldown: 5 },
  { data: userinfo.toJSON(), module: 'general', cooldown: 5 },
  { data: avatar.toJSON(), module: 'general', cooldown: 3 },
  { data: botinfo.toJSON(), module: 'general', cooldown: 10 },
  
  // Moderation
  { data: ban.toJSON(), module: 'moderation', cooldown: 3 },
  { data: kick.toJSON(), module: 'moderation', cooldown: 3 },
  { data: timeout.toJSON(), module: 'moderation', cooldown: 3 },
  { data: untimeout.toJSON(), module: 'moderation', cooldown: 3 },
  { data: warn.toJSON(), module: 'moderation', cooldown: 3 },
  { data: warnings.toJSON(), module: 'moderation', cooldown: 5 },
  { data: clearwarnings.toJSON(), module: 'moderation', cooldown: 5 },
  { data: purge.toJSON(), module: 'moderation', cooldown: 5 },
  { data: slowmode.toJSON(), module: 'moderation', cooldown: 5 },
  { data: lock.toJSON(), module: 'moderation', cooldown: 3 },
  { data: unlock.toJSON(), module: 'moderation', cooldown: 3 },
  { data: modlogs.toJSON(), module: 'moderation', cooldown: 5 },
  
  // Utility
  { data: poll.toJSON(), module: 'utility', cooldown: 10 },
  { data: remind.toJSON(), module: 'utility', cooldown: 5 },
];

// Command name to module mapping
export const commandModuleMap: Record<string, string> = {};
slashCommands.forEach(cmd => {
  commandModuleMap[cmd.data.name] = cmd.module;
});

// Command cooldowns
export const commandCooldowns: Record<string, number> = {};
slashCommands.forEach(cmd => {
  commandCooldowns[cmd.data.name] = cmd.cooldown || 3;
});
