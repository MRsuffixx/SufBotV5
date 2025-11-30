// ============================================
// SUFBOT V5 - Command Handler
// ============================================

import { Client, Collection, REST, Routes } from 'discord.js';
import { readdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { config } from '../config';
import { logger, commandLogger } from '../utils/logger';
import type { Command, CommandMeta } from '../types';

export class CommandHandler {
  private client: Client;
  private rest: REST;

  constructor(client: Client) {
    this.client = client;
    this.rest = new REST({ version: '10' }).setToken(config.discord.token);
  }

  async loadCommands(): Promise<void> {
    const modulesPath = join(__dirname, '..', 'modules');
    
    if (!existsSync(modulesPath)) {
      logger.warn('Modules directory not found, creating...');
      return;
    }

    const modulesFolders = readdirSync(modulesPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const moduleFolder of modulesFolders) {
      const modulePath = join(modulesPath, moduleFolder);
      const commandsPath = join(modulePath, 'commands');

      if (!existsSync(commandsPath)) continue;

      // Load module meta if exists
      const moduleMetaPath = join(modulePath, 'module.json');
      if (existsSync(moduleMetaPath)) {
        const moduleMeta = JSON.parse(readFileSync(moduleMetaPath, 'utf-8'));
        this.client.modules.set(moduleMeta.name, {
          ...moduleMeta,
          commands: [],
        });
      }

      const commandFiles = readdirSync(commandsPath)
        .filter(file => file.endsWith('.ts') || file.endsWith('.js'));

      for (const file of commandFiles) {
        const filePath = join(commandsPath, file);
        
        try {
          const commandModule = await import(filePath);
          const command: Command = commandModule.default || commandModule;

          if (!command.meta || !command.data || !command.execute) {
            logger.warn(`Command at ${filePath} is missing required properties`);
            continue;
          }

          this.client.commands.set(command.meta.name, command);
          
          // Add to module's command list
          const module = this.client.modules.get(moduleFolder);
          if (module) {
            module.commands.push(command.meta.name);
          }

          commandLogger.debug(`Loaded command: ${command.meta.name}`);
        } catch (error) {
          logger.error(`Failed to load command at ${filePath}:`, error);
        }
      }
    }

    logger.info(`Loaded ${this.client.commands.size} commands from ${this.client.modules.size} modules`);
  }

  async deployCommands(guildId?: string): Promise<void> {
    const commands = this.client.commands.map(cmd => cmd.data.toJSON());

    try {
      logger.info(`Deploying ${commands.length} commands...`);

      if (guildId) {
        // Deploy to specific guild (faster, for development)
        await this.rest.put(
          Routes.applicationGuildCommands(config.discord.clientId, guildId),
          { body: commands }
        );
        logger.info(`Successfully deployed commands to guild ${guildId}`);
      } else {
        // Deploy globally
        await this.rest.put(
          Routes.applicationCommands(config.discord.clientId),
          { body: commands }
        );
        logger.info('Successfully deployed commands globally');
      }
    } catch (error) {
      logger.error('Failed to deploy commands:', error);
      throw error;
    }
  }

  async reloadCommand(commandName: string): Promise<boolean> {
    const command = this.client.commands.get(commandName);
    if (!command) return false;

    // Find the command file
    const modulesPath = join(__dirname, '..', 'modules');
    const modulesFolders = readdirSync(modulesPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const moduleFolder of modulesFolders) {
      const commandsPath = join(modulesPath, moduleFolder, 'commands');
      if (!existsSync(commandsPath)) continue;

      const commandFiles = readdirSync(commandsPath)
        .filter(file => file.endsWith('.ts') || file.endsWith('.js'));

      for (const file of commandFiles) {
        const filePath = join(commandsPath, file);
        
        // Clear require cache
        delete require.cache[require.resolve(filePath)];
        
        try {
          const commandModule = await import(filePath);
          const newCommand: Command = commandModule.default || commandModule;

          if (newCommand.meta.name === commandName) {
            this.client.commands.set(commandName, newCommand);
            commandLogger.info(`Reloaded command: ${commandName}`);
            return true;
          }
        } catch (error) {
          logger.error(`Failed to reload command ${commandName}:`, error);
          return false;
        }
      }
    }

    return false;
  }

  async reloadModule(moduleName: string): Promise<boolean> {
    const module = this.client.modules.get(moduleName);
    if (!module) return false;

    // Unload module commands
    for (const commandName of module.commands) {
      this.client.commands.delete(commandName);
    }

    // Reload module
    const modulePath = join(__dirname, '..', 'modules', moduleName);
    const commandsPath = join(modulePath, 'commands');

    if (!existsSync(commandsPath)) return false;

    const commandFiles = readdirSync(commandsPath)
      .filter(file => file.endsWith('.ts') || file.endsWith('.js'));

    module.commands = [];

    for (const file of commandFiles) {
      const filePath = join(commandsPath, file);
      
      delete require.cache[require.resolve(filePath)];
      
      try {
        const commandModule = await import(filePath);
        const command: Command = commandModule.default || commandModule;

        this.client.commands.set(command.meta.name, command);
        module.commands.push(command.meta.name);
      } catch (error) {
        logger.error(`Failed to reload command in module ${moduleName}:`, error);
      }
    }

    logger.info(`Reloaded module: ${moduleName} with ${module.commands.length} commands`);
    return true;
  }

  getCommandMeta(): CommandMeta[] {
    return Array.from(this.client.commands.values()).map(cmd => cmd.meta);
  }

  getModuleList(): { name: string; description: string; enabled: boolean; commands: string[] }[] {
    return Array.from(this.client.modules.values());
  }
}
