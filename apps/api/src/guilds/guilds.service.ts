import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';

const DISCORD_API = 'https://discord.com/api/v10';
const ADMIN_PERMISSION = 0x8; // Administrator permission bit

interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

@Injectable()
export class GuildsService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
  ) {}

  async getGuilds(userId: string, userRole: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get guilds from database that bot is in
    const botGuilds = await this.prisma.guild.findMany({
      select: { id: true, name: true, icon: true, ownerId: true },
    });
    const botGuildIds = new Set(botGuilds.map(g => g.id));

    // Try to fetch user's guilds from Discord API
    try {
      const discordToken = await this.authService.getDiscordToken(userId);
      
      if (discordToken) {
        const discordGuilds = await this.fetchUserGuildsFromDiscord(discordToken);
        
        // Filter to only guilds where user has admin permission AND is actually in the guild
        const adminGuilds = discordGuilds.filter(guild => {
          const permissions = BigInt(guild.permissions);
          return guild.owner || (permissions & BigInt(ADMIN_PERMISSION)) === BigInt(ADMIN_PERMISSION);
        });

        // Add hasBot flag - only return guilds user is actually in
        return adminGuilds.map(guild => ({
          ...guild,
          hasBot: botGuildIds.has(guild.id),
        }));
      }
    } catch (error) {
      console.error('Failed to fetch Discord guilds:', error);
    }

    // Fallback: return ONLY guilds where user is the owner (from database)
    // This prevents showing other users' servers
    const userOwnedGuilds = botGuilds.filter(g => g.ownerId === user.discordId);
    
    return userOwnedGuilds.map(guild => ({
      id: guild.id,
      name: guild.name,
      icon: guild.icon,
      owner: true,
      permissions: '8',
      hasBot: true,
    }));
  }

  // Admin only: Get ALL guilds the bot is in
  async getAllGuilds(userId: string, userRole: string) {
    // Only OWNER and ADMIN can see all guilds
    if (userRole !== 'OWNER' && userRole !== 'ADMIN') {
      throw new ForbiddenException('Access denied');
    }

    const guilds = await this.prisma.guild.findMany({
      include: { settings: true },
      orderBy: { name: 'asc' },
    });

    // Fetch member counts from Discord API
    const botToken = process.env.DISCORD_TOKEN;
    const guildsWithDetails = await Promise.all(
      guilds.map(async (guild) => {
        let memberCount = 0;
        try {
          if (botToken) {
            const response = await fetch(`${DISCORD_API}/guilds/${guild.id}?with_counts=true`, {
              headers: { Authorization: `Bot ${botToken}` },
            });
            if (response.ok) {
              const data = await response.json();
              memberCount = data.approximate_member_count || 0;
            }
          }
        } catch (e) {
          // Ignore errors
        }
        return {
          id: guild.id,
          name: guild.name,
          icon: guild.icon,
          ownerId: guild.ownerId,
          memberCount,
          hasBot: true,
        };
      })
    );

    return guildsWithDetails;
  }

  // Admin only: Make bot leave a guild
  async leaveGuild(guildId: string, userId: string, userRole: string) {
    // Only OWNER and ADMIN can make bot leave guilds
    if (userRole !== 'OWNER' && userRole !== 'ADMIN') {
      throw new ForbiddenException('Access denied');
    }

    const botToken = process.env.DISCORD_TOKEN;
    if (!botToken) {
      throw new Error('DISCORD_TOKEN not found');
    }

    try {
      // Make bot leave the guild via Discord API
      const response = await fetch(`${DISCORD_API}/users/@me/guilds/${guildId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bot ${botToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Failed to leave guild:', error);
        throw new Error('Failed to leave guild');
      }

      // Remove guild from database
      await this.prisma.guild.delete({
        where: { id: guildId },
      }).catch(() => {
        // Guild might not exist in DB, ignore
      });

      return { success: true, message: 'Bot left the guild successfully' };
    } catch (error) {
      console.error('Error leaving guild:', error);
      throw error;
    }
  }

  private async fetchUserGuildsFromDiscord(accessToken: string): Promise<DiscordGuild[]> {
    const response = await fetch(`${DISCORD_API}/users/@me/guilds`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status}`);
    }

    return response.json();
  }

  async getGuild(guildId: string, userId: string, userRole: string) {
    const guild = await this.prisma.guild.findUnique({
      where: { id: guildId },
      include: {
        settings: true,
        welcomeConfig: true,
        moderationConfig: true,
        economyConfig: true,
        autoRoles: true,
        logChannels: true,
        filters: true,
      },
    });

    if (!guild) {
      throw new NotFoundException('Guild not found');
    }

    // Check access
    if (userRole !== 'OWNER' && userRole !== 'ADMIN') {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (guild.ownerId !== user?.discordId) {
        throw new ForbiddenException('Access denied');
      }
    }

    // Convert boolean fields to enabledModules array for the panel
    const enabledModules: string[] = [];
    if (guild.settings?.moderationEnabled) enabledModules.push('moderation');
    if (guild.settings?.economyEnabled) enabledModules.push('economy');
    if (guild.settings?.welcomeEnabled) enabledModules.push('welcome');
    if (guild.settings?.loggingEnabled) enabledModules.push('logging');
    if (guild.settings?.autoModEnabled) enabledModules.push('automod');

    return {
      ...guild,
      settings: guild.settings ? {
        ...guild.settings,
        enabledModules,
      } : { enabledModules: ['moderation'] },
    };
  }

  async updateGuildSettings(guildId: string, data: any) {
    const guild = await this.prisma.guild.findUnique({
      where: { id: guildId },
    });

    if (!guild) {
      throw new NotFoundException('Guild not found');
    }

    // Convert enabledModules array to individual boolean fields
    const { enabledModules, ...rest } = data;
    const settingsData: any = { ...rest };
    
    if (enabledModules && Array.isArray(enabledModules)) {
      settingsData.moderationEnabled = enabledModules.includes('moderation');
      settingsData.economyEnabled = enabledModules.includes('economy');
      settingsData.welcomeEnabled = enabledModules.includes('welcome');
      settingsData.loggingEnabled = enabledModules.includes('logging');
      settingsData.autoModEnabled = enabledModules.includes('automod');
    }

    return this.prisma.guildSettings.upsert({
      where: { guildId },
      update: settingsData,
      create: {
        guildId,
        ...settingsData,
      },
    });
  }

  async updateWelcomeConfig(guildId: string, data: any) {
    return this.prisma.welcomeConfig.upsert({
      where: { guildId },
      update: data,
      create: {
        guildId,
        ...data,
      },
    });
  }

  async updateModerationConfig(guildId: string, data: any) {
    return this.prisma.moderationConfig.upsert({
      where: { guildId },
      update: data,
      create: {
        guildId,
        ...data,
      },
    });
  }

  async updateEconomyConfig(guildId: string, data: any) {
    return this.prisma.economyConfig.upsert({
      where: { guildId },
      update: data,
      create: {
        guildId,
        ...data,
      },
    });
  }

  async getModLogs(guildId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    
    const [logs, total] = await Promise.all([
      this.prisma.modLog.findMany({
        where: { guildId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.modLog.count({ where: { guildId } }),
    ]);

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getWarnings(guildId: string, userId?: string) {
    return this.prisma.warning.findMany({
      where: {
        guildId,
        ...(userId && { userId }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addAutoRole(guildId: string, roleId: string, delay = 0) {
    return this.prisma.autoRole.create({
      data: {
        guildId,
        roleId,
        delay,
      },
    });
  }

  async removeAutoRole(guildId: string, roleId: string) {
    return this.prisma.autoRole.delete({
      where: {
        guildId_roleId: {
          guildId,
          roleId,
        },
      },
    });
  }

  async updateFilter(guildId: string, filterType: string, data: any) {
    return this.prisma.filter.upsert({
      where: {
        guildId_type: {
          guildId,
          type: filterType as any,
        },
      },
      update: data,
      create: {
        guildId,
        type: filterType as any,
        ...data,
      },
    });
  }

  async getGuildChannels(guildId: string) {
    // Fetch channels from Discord API using bot token
    const botToken = process.env.DISCORD_TOKEN;
    console.log('Fetching channels for guild:', guildId);
    console.log('Bot token exists:', !!botToken);
    
    if (!botToken) {
      console.error('DISCORD_TOKEN not found in environment');
      return [];
    }

    try {
      const url = `${DISCORD_API}/guilds/${guildId}/channels`;
      console.log('Fetching from:', url);
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch channels:', response.status, errorText);
        return [];
      }

      const channels = await response.json();
      console.log('Fetched', channels.length, 'channels');
      
      return channels.map((channel: any) => ({
        id: channel.id,
        name: channel.name,
        type: channel.type,
        position: channel.position,
      })).sort((a: any, b: any) => a.position - b.position);
    } catch (error) {
      console.error('Error fetching channels:', error);
      return [];
    }
  }

  async getGuildRoles(guildId: string) {
    // Fetch roles from Discord API using bot token
    const botToken = process.env.DISCORD_TOKEN;
    console.log('Fetching roles for guild:', guildId);
    console.log('Bot token exists:', !!botToken);
    
    if (!botToken) {
      console.error('DISCORD_TOKEN not found in environment');
      return [];
    }

    try {
      const url = `${DISCORD_API}/guilds/${guildId}/roles`;
      console.log('Fetching from:', url);
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch roles:', response.status, errorText);
        return [];
      }

      const roles = await response.json();
      console.log('Fetched', roles.length, 'roles');
      
      return roles.map((role: any) => ({
        id: role.id,
        name: role.name,
        color: role.color,
        position: role.position,
        permissions: role.permissions,
      })).sort((a: any, b: any) => b.position - a.position);
    } catch (error) {
      console.error('Error fetching roles:', error);
      return [];
    }
  }

  async changeBotNickname(guildId: string, nickname: string) {
    const botToken = process.env.DISCORD_TOKEN;
    
    if (!botToken) {
      throw new Error('DISCORD_TOKEN not found');
    }

    try {
      // Get bot's client ID from token
      const clientId = process.env.DISCORD_CLIENT_ID;
      
      const response = await fetch(`${DISCORD_API}/guilds/${guildId}/members/@me`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nick: nickname || null }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Failed to change nickname:', error);
        throw new Error('Failed to change bot nickname');
      }

      return { success: true, nickname };
    } catch (error) {
      console.error('Error changing bot nickname:', error);
      throw error;
    }
  }

  // Auto Responder methods
  async getAutoResponders(guildId: string) {
    const responders = await this.prisma.autoResponder.findMany({
      where: { guildId },
      orderBy: { createdAt: 'desc' },
    });

    return responders.map(r => ({
      ...r,
      replies: JSON.parse(r.replies),
    }));
  }

  async createAutoResponder(guildId: string, data: {
    trigger: string;
    wildcard: boolean;
    sendAsReply: boolean;
    replies: string[];
    allowedRoles: string[];
    disabledRoles: string[];
    allowedChannels: string[];
    disabledChannels: string[];
  }) {
    // Validate replies (max 10, min 1)
    if (!data.replies || data.replies.length === 0) {
      throw new Error('At least one reply is required');
    }
    if (data.replies.length > 10) {
      throw new Error('Maximum 10 replies allowed');
    }

    return this.prisma.autoResponder.create({
      data: {
        guildId,
        trigger: data.trigger,
        wildcard: data.wildcard,
        sendAsReply: data.sendAsReply,
        replies: JSON.stringify(data.replies),
        allowedRoles: data.allowedRoles || [],
        disabledRoles: data.disabledRoles || [],
        allowedChannels: data.allowedChannels || [],
        disabledChannels: data.disabledChannels || [],
      },
    });
  }

  async updateAutoResponder(guildId: string, responderId: string, data: {
    trigger?: string;
    wildcard?: boolean;
    sendAsReply?: boolean;
    replies?: string[];
    allowedRoles?: string[];
    disabledRoles?: string[];
    allowedChannels?: string[];
    disabledChannels?: string[];
    enabled?: boolean;
  }) {
    // Validate replies if provided
    if (data.replies) {
      if (data.replies.length === 0) {
        throw new Error('At least one reply is required');
      }
      if (data.replies.length > 10) {
        throw new Error('Maximum 10 replies allowed');
      }
    }

    const updateData: any = { ...data };
    if (data.replies) {
      updateData.replies = JSON.stringify(data.replies);
    }

    return this.prisma.autoResponder.update({
      where: { id: responderId, guildId },
      data: updateData,
    });
  }

  async deleteAutoResponder(guildId: string, responderId: string) {
    return this.prisma.autoResponder.delete({
      where: { id: responderId, guildId },
    });
  }
}
