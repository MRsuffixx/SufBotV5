import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import * as crypto from 'crypto';

export interface DiscordProfile {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  email: string | null;
}

export interface TokenPayload {
  sub: string;
  discordId: string;
  role: UserRole;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateDiscordUser(profile: DiscordProfile, discordAccessToken?: string) {
    let user = await this.prisma.user.findUnique({
      where: { discordId: profile.id },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          discordId: profile.id,
          username: profile.username,
          discriminator: profile.discriminator,
          avatar: profile.avatar,
          email: profile.email,
          role: UserRole.USER,
        },
      });
    } else {
      user = await this.prisma.user.update({
        where: { discordId: profile.id },
        data: {
          username: profile.username,
          discriminator: profile.discriminator,
          avatar: profile.avatar,
          email: profile.email,
        },
      });
    }

    // Store Discord access token in session for fetching guilds
    if (discordAccessToken) {
      await this.storeDiscordToken(user.id, discordAccessToken);
    }

    return user;
  }

  async storeDiscordToken(userId: string, token: string) {
    // Store in a simple way - in production use encrypted storage
    await this.prisma.session.updateMany({
      where: { userId },
      data: { 
        // Store token in userAgent field temporarily (should add proper field)
        userAgent: `discord_token:${token}`,
      },
    });
  }

  async getDiscordToken(userId: string): Promise<string | null> {
    const session = await this.prisma.session.findFirst({
      where: { 
        userId,
        userAgent: { startsWith: 'discord_token:' },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    if (session?.userAgent?.startsWith('discord_token:')) {
      return session.userAgent.replace('discord_token:', '');
    }
    return null;
  }

  async generateTokens(userId: string, discordId: string, role: UserRole) {
    const payload: TokenPayload = { sub: userId, discordId, role };

    const accessToken = this.jwtService.sign(payload);
    
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const refreshExpiry = new Date();
    refreshExpiry.setDate(refreshExpiry.getDate() + 7); // 7 days

    // Store refresh token
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt: refreshExpiry,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  }

  async refreshTokens(refreshToken: string) {
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.expiresAt < new Date()) {
      await this.prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });
      throw new UnauthorizedException('Refresh token expired');
    }

    // Delete old refresh token
    await this.prisma.refreshToken.delete({
      where: { id: storedToken.id },
    });

    // Generate new tokens
    return this.generateTokens(
      storedToken.user.id,
      storedToken.user.discordId,
      storedToken.user.role,
    );
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    } else {
      // Delete all refresh tokens for user
      await this.prisma.refreshToken.deleteMany({
        where: { userId },
      });
    }
  }

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  async getUserByDiscordId(discordId: string) {
    return this.prisma.user.findUnique({
      where: { discordId },
    });
  }

  async createSession(userId: string, ipAddress?: string, userAgent?: string) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    return this.prisma.session.create({
      data: {
        userId,
        ipAddress,
        userAgent,
        expiresAt,
      },
    });
  }

  async logAudit(
    action: string,
    userId?: string,
    target?: string,
    targetId?: string,
    details?: Record<string, unknown>,
    ipAddress?: string,
  ) {
    return this.prisma.auditLog.create({
      data: {
        userId,
        action,
        target,
        targetId,
        details: details as any,
        ipAddress,
      },
    });
  }
}
