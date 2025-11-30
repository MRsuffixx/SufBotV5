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
      select: { id: true },
    });
    const botGuildIds = new Set(botGuilds.map(g => g.id));

    // Try to fetch user's guilds from Discord API
    try {
      const discordToken = await this.authService.getDiscordToken(userId);
      
      if (discordToken) {
        const discordGuilds = await this.fetchUserGuildsFromDiscord(discordToken);
        
        // Filter to only guilds where user has admin permission
        const adminGuilds = discordGuilds.filter(guild => {
          const permissions = BigInt(guild.permissions);
          return guild.owner || (permissions & BigInt(ADMIN_PERMISSION)) === BigInt(ADMIN_PERMISSION);
        });

        // Add hasBot flag
        return adminGuilds.map(guild => ({
          ...guild,
          hasBot: botGuildIds.has(guild.id),
        }));
      }
    } catch (error) {
      console.error('Failed to fetch Discord guilds:', error);
    }

    // Fallback: return guilds from database
    const guilds = await this.prisma.guild.findMany({
      include: { settings: true },
    });
    
    return guilds.map(guild => ({
      id: guild.id,
      name: guild.name,
      icon: guild.icon,
      owner: guild.ownerId === user.discordId,
      permissions: '8',
      hasBot: true,
    }));
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

    return guild;
  }

  async updateGuildSettings(guildId: string, data: any) {
    const guild = await this.prisma.guild.findUnique({
      where: { id: guildId },
    });

    if (!guild) {
      throw new NotFoundException('Guild not found');
    }

    return this.prisma.guildSettings.upsert({
      where: { guildId },
      update: data,
      create: {
        guildId,
        ...data,
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
}
