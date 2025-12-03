// ============================================
// SUFBOT V5 - Help Command
// ============================================

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  ComponentType,
} from 'discord.js';
import { COLORS } from '@sufbot/shared';
import type { Command } from '../../../types';

const CATEGORY_INFO: Record<string, { emoji: string; description: string }> = {
  utility: { emoji: '🔧', description: 'General utility commands' },
  moderation: { emoji: '🛡️', description: 'Server moderation commands' },
  economy: { emoji: '💰', description: 'Economy and currency commands' },
  fun: { emoji: '🎮', description: 'Fun and entertainment commands' },
  info: { emoji: 'ℹ️', description: 'Information commands' },
  admin: { emoji: '👑', description: 'Bot owner commands' },
  config: { emoji: '⚙️', description: 'Server configuration commands' },
};

const command: Command = {
  meta: {
    name: 'help',
    description: 'View all available commands',
    category: 'utility',
    permissions: [],
    botPermissions: [],
    cooldown: 5000,
    guildOnly: false,
    ownerOnly: false,
    nsfw: false,
    panelEditable: false,
    enabled: true,
  },
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('View all available commands')
    .addStringOption(option =>
      option
        .setName('command')
        .setDescription('Get detailed info about a specific command')
        .setRequired(false)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    const commands = interaction.client.commands;
    
    const filtered = commands
      .filter(cmd => cmd.meta.name.toLowerCase().includes(focusedValue))
      .first(25);

    await interaction.respond(
      Array.from(filtered.values()).map(cmd => ({
        name: `/${cmd.meta.name} - ${cmd.meta.description}`,
        value: cmd.meta.name,
      }))
    );
  },

  async execute(interaction: ChatInputCommandInteraction) {
    const commandName = interaction.options.getString('command');
    const commands = interaction.client.commands;

    // If a specific command is requested
    if (commandName) {
      const cmd = commands.get(commandName);
      
      if (!cmd) {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.ERROR)
              .setDescription(`❌ Command \`${commandName}\` not found.`)
          ],
          ephemeral: true,
        });
        return;
      }

      const categoryInfo = CATEGORY_INFO[cmd.meta.category] || { emoji: '📁', description: 'Unknown category' };

      const embed = new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle(`${categoryInfo.emoji} /${cmd.meta.name}`)
        .setDescription(cmd.meta.description)
        .addFields(
          { name: '📁 Category', value: cmd.meta.category.charAt(0).toUpperCase() + cmd.meta.category.slice(1), inline: true },
          { name: '⏱️ Cooldown', value: `${(cmd.meta.cooldown / 1000).toFixed(1)}s`, inline: true },
          { name: '🔒 Guild Only', value: cmd.meta.guildOnly ? 'Yes' : 'No', inline: true },
        );

      if (cmd.meta.permissions.length > 0) {
        embed.addFields({
          name: '🔑 Required Permissions',
          value: cmd.meta.permissions.map(p => `\`${p.toString()}\``).join(', '),
          inline: false,
        });
      }

      embed.setFooter({
        text: `Requested by ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL(),
      });
      embed.setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return;
    }

    // Group commands by category
    const categories = new Map<string, Command[]>();
    
    for (const [, cmd] of commands) {
      if (!cmd.meta.enabled) continue;
      
      const category = cmd.meta.category;
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(cmd);
    }

    // Create main embed
    const mainEmbed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setAuthor({
        name: 'SufBot Help',
        iconURL: interaction.client.user?.displayAvatarURL(),
      })
      .setDescription(
        '👋 Welcome to SufBot!\n\n' +
        'Use the dropdown menu below to browse commands by category, ' +
        'or use `/help <command>` to get detailed info about a specific command.'
      )
      .addFields(
        {
          name: '📊 Statistics',
          value: [
            `**Total Commands:** ${commands.size}`,
            `**Categories:** ${categories.size}`,
          ].join('\n'),
          inline: true,
        },
        {
          name: '🔗 Links',
          value: [
            '[Dashboard](https://sufbot.olnk.tr)',
            '[Support Server](https://discord.gg/sufbot)',
          ].join(' • '),
          inline: true,
        }
      )
      .setFooter({
        text: `Requested by ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();

    // Add category overview
    let categoryOverview = '';
    for (const [category, cmds] of categories) {
      const info = CATEGORY_INFO[category] || { emoji: '📁', description: 'Unknown' };
      categoryOverview += `${info.emoji} **${category.charAt(0).toUpperCase() + category.slice(1)}** - ${cmds.length} commands\n`;
    }
    mainEmbed.addFields({ name: '📚 Categories', value: categoryOverview, inline: false });

    // Create select menu
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help_category')
      .setPlaceholder('Select a category to view commands')
      .addOptions(
        Array.from(categories.keys()).map(category => {
          const info = CATEGORY_INFO[category] || { emoji: '📁', description: 'Unknown' };
          return {
            label: category.charAt(0).toUpperCase() + category.slice(1),
            description: info.description,
            value: category,
            emoji: info.emoji,
          };
        })
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    const response = await interaction.reply({
      embeds: [mainEmbed],
      components: [row],
    });

    // Handle select menu interactions
    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 300000, // 5 minutes
    });

    collector.on('collect', async (i: StringSelectMenuInteraction) => {
      if (i.user.id !== interaction.user.id) {
        await i.reply({
          content: '❌ This menu is not for you!',
          ephemeral: true,
        });
        return;
      }

      const selectedCategory = i.values[0];
      const categoryCommands = categories.get(selectedCategory) || [];
      const info = CATEGORY_INFO[selectedCategory] || { emoji: '📁', description: 'Unknown' };

      const categoryEmbed = new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle(`${info.emoji} ${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Commands`)
        .setDescription(info.description)
        .setFooter({
          text: `${categoryCommands.length} commands • Use /help <command> for more info`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp();

      // Add commands in a formatted list
      const commandList = categoryCommands
        .sort((a, b) => a.meta.name.localeCompare(b.meta.name))
        .map(cmd => `\`/${cmd.meta.name}\` - ${cmd.meta.description}`)
        .join('\n');

      // Split if too long
      if (commandList.length > 1024) {
        categoryEmbed.setDescription(commandList.slice(0, 4000) + '...');
      } else {
        categoryEmbed.addFields({ name: 'Commands', value: commandList || 'No commands in this category.' });
      }

      await i.update({ embeds: [categoryEmbed] });
    });

    collector.on('end', async () => {
      try {
        await response.edit({ components: [] });
      } catch {
        // Message might be deleted
      }
    });
  },
};

export default command;
