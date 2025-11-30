// ============================================
// SUFBOT V5 - Interaction Create Event
// ============================================

import { Interaction, ChatInputCommandInteraction, PermissionsBitField } from 'discord.js';
import { logger, commandLogger } from '../utils/logger';
import { prisma } from '@sufbot/database';
import type { Event, Command } from '../types';

const event: Event = {
  name: 'interactionCreate',
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;

    const client = interaction.client;
    const command = client.commands.get(interaction.commandName) as Command | undefined;

    if (!command) {
      commandLogger.warn(`Unknown command: ${interaction.commandName}`);
      return;
    }

    // Check if command is enabled
    if (!command.meta.enabled) {
      await interaction.reply({
        content: '❌ This command is currently disabled.',
        ephemeral: true,
      });
      return;
    }

    // Check guild only
    if (command.meta.guildOnly && !interaction.guild) {
      await interaction.reply({
        content: '❌ This command can only be used in a server.',
        ephemeral: true,
      });
      return;
    }

    // Check owner only
    if (command.meta.ownerOnly) {
      // You can add owner IDs to config
      const ownerIds = process.env.OWNER_IDS?.split(',') || [];
      if (!ownerIds.includes(interaction.user.id)) {
        await interaction.reply({
          content: '❌ This command is restricted to bot owners.',
          ephemeral: true,
        });
        return;
      }
    }

    // Check user permissions
    if (command.meta.permissions.length > 0 && interaction.guild) {
      const member = interaction.member;
      if (member && 'permissions' in member) {
        const missingPerms = command.meta.permissions.filter(
          perm => !member.permissions.has(perm)
        );
        if (missingPerms.length > 0) {
          await interaction.reply({
            content: `❌ You need the following permissions: ${missingPerms.join(', ')}`,
            ephemeral: true,
          });
          return;
        }
      }
    }

    // Check bot permissions
    if (command.meta.botPermissions && command.meta.botPermissions.length > 0 && interaction.guild) {
      const botMember = interaction.guild.members.me;
      if (botMember) {
        const missingPerms = command.meta.botPermissions.filter(
          perm => !botMember.permissions.has(perm)
        );
        if (missingPerms.length > 0) {
          await interaction.reply({
            content: `❌ I need the following permissions: ${missingPerms.join(', ')}`,
            ephemeral: true,
          });
          return;
        }
      }
    }

    // Check guild settings (disabled commands/modules)
    if (interaction.guild) {
      let guildSettings = await client.cache.getGuildSettings(interaction.guild.id);
      
      if (!guildSettings) {
        // Fetch from database
        const dbSettings = await prisma.guildSettings.findUnique({
          where: { guildId: interaction.guild.id },
        });
        
        if (dbSettings) {
          guildSettings = {
            prefix: dbSettings.prefix,
            language: dbSettings.language,
            timezone: dbSettings.timezone,
            moderationEnabled: dbSettings.moderationEnabled,
            economyEnabled: dbSettings.economyEnabled,
            welcomeEnabled: dbSettings.welcomeEnabled,
            loggingEnabled: dbSettings.loggingEnabled,
            autoModEnabled: dbSettings.autoModEnabled,
            disabledCommands: dbSettings.disabledCommands,
            disabledModules: dbSettings.disabledModules,
          };
          await client.cache.setGuildSettings(interaction.guild.id, guildSettings);
        }
      }

      if (guildSettings) {
        if (guildSettings.disabledCommands.includes(command.meta.name)) {
          await interaction.reply({
            content: '❌ This command is disabled in this server.',
            ephemeral: true,
          });
          return;
        }

        if (guildSettings.disabledModules.includes(command.meta.category)) {
          await interaction.reply({
            content: '❌ This module is disabled in this server.',
            ephemeral: true,
          });
          return;
        }
      }
    }

    // Check cooldown
    const cooldownKey = `${interaction.user.id}:${command.meta.name}`;
    const cooldownExpiry = await client.cache.getCooldown(interaction.user.id, command.meta.name);
    
    if (cooldownExpiry && cooldownExpiry > Date.now()) {
      const remaining = Math.ceil((cooldownExpiry - Date.now()) / 1000);
      await interaction.reply({
        content: `⏳ Please wait ${remaining} seconds before using this command again.`,
        ephemeral: true,
      });
      return;
    }

    // Execute command
    const startTime = Date.now();
    
    try {
      await command.execute(interaction);
      
      const executionTime = Date.now() - startTime;
      
      // Set cooldown
      if (command.meta.cooldown > 0) {
        await client.cache.setCooldown(
          interaction.user.id,
          command.meta.name,
          Date.now() + command.meta.cooldown
        );
      }

      // Log command execution
      commandLogger.info({
        command: command.meta.name,
        user: interaction.user.tag,
        userId: interaction.user.id,
        guild: interaction.guild?.name,
        guildId: interaction.guild?.id,
        executionTime,
      });

      // Record stats
      await prisma.commandStats.create({
        data: {
          commandName: command.meta.name,
          guildId: interaction.guild?.id,
          userId: interaction.user.id,
          executionTime,
          success: true,
        },
      });

      // Emit to API
      client.wsClient?.emitCommandExecute({
        guildId: interaction.guild?.id || 'DM',
        userId: interaction.user.id,
        commandName: command.meta.name,
        executionTime,
      });

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      logger.error(`Command error: ${command.meta.name}`, error);

      // Record error stats
      await prisma.commandStats.create({
        data: {
          commandName: command.meta.name,
          guildId: interaction.guild?.id,
          userId: interaction.user.id,
          executionTime,
          success: false,
          errorMessage,
        },
      });

      // Emit error to API
      client.wsClient?.emitCommandError({
        guildId: interaction.guild?.id || 'DM',
        userId: interaction.user.id,
        commandName: command.meta.name,
        error: errorMessage,
      });

      // Reply to user
      const errorReply = {
        content: '❌ An error occurred while executing this command.',
        ephemeral: true,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorReply);
      } else {
        await interaction.reply(errorReply);
      }
    }
  },
};

export default event;
