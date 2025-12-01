import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { DiscordAuthGuard } from './guards/discord-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('discord')
  @UseGuards(DiscordAuthGuard)
  @ApiOperation({ summary: 'Initiate Discord OAuth2 login' })
  discordLogin() {
    // Guard redirects to Discord
  }

  @Get('discord/callback')
  @UseGuards(DiscordAuthGuard)
  @ApiOperation({ summary: 'Discord OAuth2 callback' })
  async discordCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as any;
    
    console.log('[Auth] Discord callback received for user:', user?.username);
    console.log('[Auth] User ID:', user?.id);
    console.log('[Auth] PANEL_URL:', process.env.PANEL_URL);
    
    // Create session first (needed for storing Discord token)
    await this.authService.createSession(
      user.id,
      req.ip,
      req.headers['user-agent'] as string,
    );

    // Store Discord access token if available
    if (user.discordAccessToken) {
      await this.authService.storeDiscordToken(user.id, user.discordAccessToken);
    }

    const tokens = await this.authService.generateTokens(
      user.id,
      user.discordId,
      user.role,
    );

    // Log the login
    await this.authService.logAudit(
      'LOGIN',
      user.id,
      'user',
      user.id,
      { method: 'discord_oauth' },
      req.ip,
    );

    // Set refresh token as HTTP-only cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax', // 'none' required for cross-site cookies
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      domain: isProduction ? '.olnk.tr' : undefined, // Share cookie across subdomains
    });

    // Redirect to panel with access token
    const panelUrl = process.env.PANEL_URL || 'http://localhost:3000';
    const redirectUrl = `${panelUrl}/auth/callback?token=${tokens.accessToken}`;
    console.log('[Auth] Redirecting to:', redirectUrl);
    res.redirect(redirectUrl);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    const refreshToken = dto.refreshToken || req.cookies?.refreshToken;
    return this.authService.refreshTokens(refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user' })
  async logout(
    @CurrentUser('id') userId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const refreshToken = req.cookies?.refreshToken;
    await this.authService.logout(userId, refreshToken);

    await this.authService.logAudit('LOGOUT', userId, 'user', userId, {}, req.ip);

    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully' });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user' })
  async me(@CurrentUser('id') userId: string) {
    console.log('[Auth] /me endpoint called for userId:', userId);
    const user = await this.authService.validateUser(userId);
    if (!user) {
      console.log('[Auth] /me - User not found');
      return null;
    }
    console.log('[Auth] /me - Returning user:', user.username);
    return {
      id: user.id,
      discordId: user.discordId,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar,
      role: user.role,
    };
  }
}
