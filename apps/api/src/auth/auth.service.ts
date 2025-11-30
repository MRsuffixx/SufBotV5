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
    // Check if user is a bot owner from .env
    const botOwnerIdsStr = this.configService.get<string>('BOT_OWNER_IDS', '');
    const botOwnerIds = botOwnerIdsStr.split(',').map(id => id.trim()).filter(id => id.length > 0);
    const isBotOwner = botOwnerIds.includes(profile.id);
    
    console.log(`[Auth] Validating user: ${profile.username} (${profile.id})`);
    console.log(`[Auth] Bot owner IDs from env: [${botOwnerIds.join(', ')}]`);
    console.log(`[Auth] Is bot owner: ${isBotOwner}`);
    
    let user = await this.prisma.user.findUnique({
      where: { discordId: profile.id },
    });

    // Determine user role
    let role = UserRole.USER;
    if (isBotOwner) {
      role = UserRole.OWNER;
    } else if (user?.role === UserRole.ADMIN || user?.role === UserRole.MODERATOR) {
      // Preserve existing elevated roles
      role = user.role;
    }

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          discordId: profile.id,
          username: profile.username,
          discriminator: profile.discriminator,
          avatar: profile.avatar,
          email: profile.email,
          role,
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
          // Update role if user is bot owner (always set to OWNER)
          ...(isBotOwner && { role: UserRole.OWNER }),
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
    // Create a special session to store the Discord token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    // Delete old discord token sessions
    await this.prisma.session.deleteMany({
      where: { 
        userId,
        ipAddress: 'discord_token',
      },
    });
    
    // Create new session with Discord token
    await this.prisma.session.create({
      data: {
        userId,
        ipAddress: 'discord_token',
        userAgent: token,
        expiresAt,
      },
    });
  }

  async getDiscordToken(userId: string): Promise<string | null> {
    const session = await this.prisma.session.findFirst({
      where: { 
        userId,
        ipAddress: 'discord_token',
      },
      orderBy: { createdAt: 'desc' },
    });
    
    return session?.userAgent || null;
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
