// ============================================
// SUFBOT V5 - Event Handler
// ============================================

import { Client } from 'discord.js';
import { readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { logger, eventLogger } from '../utils/logger';
import type { Event } from '../types';

export class EventHandler {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  async loadEvents(): Promise<void> {
    const eventsPath = join(__dirname, '..', 'events');
    
    if (!existsSync(eventsPath)) {
      logger.warn('Events directory not found');
      return;
    }

    const eventFiles = readdirSync(eventsPath)
      .filter(file => file.endsWith('.ts') || file.endsWith('.js'));

    let loadedCount = 0;

    for (const file of eventFiles) {
      const filePath = join(eventsPath, file);
      
      try {
        const eventModule = await import(filePath);
        const event: Event = eventModule.default || eventModule;

        if (!event.name || !event.execute) {
          logger.warn(`Event at ${filePath} is missing required properties`);
          continue;
        }

        if (event.once) {
          this.client.once(event.name, (...args) => event.execute(...args));
        } else {
          this.client.on(event.name, (...args) => event.execute(...args));
        }

        loadedCount++;
        eventLogger.debug(`Loaded event: ${event.name}`);
      } catch (error) {
        logger.error(`Failed to load event at ${filePath}:`, error);
      }
    }

    // Also load events from modules
    const modulesPath = join(__dirname, '..', 'modules');
    
    if (existsSync(modulesPath)) {
      const modulesFolders = readdirSync(modulesPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const moduleFolder of modulesFolders) {
        const moduleEventsPath = join(modulesPath, moduleFolder, 'events');
        
        if (!existsSync(moduleEventsPath)) continue;

        const moduleEventFiles = readdirSync(moduleEventsPath)
          .filter(file => file.endsWith('.ts') || file.endsWith('.js'));

        for (const file of moduleEventFiles) {
          const filePath = join(moduleEventsPath, file);
          
          try {
            const eventModule = await import(filePath);
            const event: Event = eventModule.default || eventModule;

            if (!event.name || !event.execute) continue;

            if (event.once) {
              this.client.once(event.name, (...args) => event.execute(...args));
            } else {
              this.client.on(event.name, (...args) => event.execute(...args));
            }

            loadedCount++;
            eventLogger.debug(`Loaded module event: ${moduleFolder}/${event.name}`);
          } catch (error) {
            logger.error(`Failed to load module event at ${filePath}:`, error);
          }
        }
      }
    }

    logger.info(`Loaded ${loadedCount} events`);
  }
}
