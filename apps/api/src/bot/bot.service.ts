import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BotService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const latestStats = await this.prisma.botStats.findFirst({
      orderBy: { recordedAt: 'desc' },
    });

    return latestStats || {
      guildCount: 0,
      userCount: 0,
      channelCount: 0,
      commandsUsed: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      uptime: 0,
    };
  }

  async getCommands() {
    // This would be populated from the bot via WebSocket
    return [];
  }

  async getModules() {
    // This would be populated from the bot via WebSocket
    return [];
  }

  async getCommandStats(days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const stats = await this.prisma.commandStats.groupBy({
      by: ['commandName'],
      where: {
        createdAt: { gte: since },
      },
      _count: {
        commandName: true,
      },
      orderBy: {
        _count: {
          commandName: 'desc',
        },
      },
      take: 10,
    });

    return stats.map(s => ({
      command: s.commandName,
      count: s._count.commandName,
    }));
  }

  async recordStats(stats: {
    guildCount: number;
    userCount: number;
    channelCount: number;
    memoryUsage?: number;
    cpuUsage?: number;
    uptime?: number;
    shardId?: number;
  }) {
    return this.prisma.botStats.create({
      data: stats,
    });
  }
}
