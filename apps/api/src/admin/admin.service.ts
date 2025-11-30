import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getUsers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    return {
      data: users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateUserRole(userId: string, role: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role: role as any },
    });
  }

  async getAuditLogs(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: true },
      }),
      this.prisma.auditLog.count(),
    ]);

    return {
      data: logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getApiKeys(userId?: string) {
    return this.prisma.apiKey.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createApiKey(userId: string, name: string, permissions: string[]) {
    const key = require('crypto').randomBytes(32).toString('hex');
    
    return this.prisma.apiKey.create({
      data: {
        userId,
        name,
        key,
        permissions,
      },
    });
  }

  async deleteApiKey(keyId: string) {
    return this.prisma.apiKey.delete({
      where: { id: keyId },
    });
  }
}
