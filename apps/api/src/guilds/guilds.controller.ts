import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GuildsService } from './guilds.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('guilds')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('guilds')
export class GuildsController {
  constructor(private guildsService: GuildsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all guilds for current user' })
  async getGuilds(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.guildsService.getGuilds(userId, role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get guild by ID' })
  async getGuild(
    @Param('id') guildId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.guildsService.getGuild(guildId, userId, role);
  }

  @Put(':id/settings')
  @ApiOperation({ summary: 'Update guild settings' })
  async updateSettings(
    @Param('id') guildId: string,
    @Body() data: any,
  ) {
    return this.guildsService.updateGuildSettings(guildId, data);
  }

  @Put(':id/welcome')
  @ApiOperation({ summary: 'Update welcome config' })
  async updateWelcome(
    @Param('id') guildId: string,
    @Body() data: any,
  ) {
    return this.guildsService.updateWelcomeConfig(guildId, data);
  }

  @Put(':id/moderation')
  @ApiOperation({ summary: 'Update moderation config' })
  async updateModeration(
    @Param('id') guildId: string,
    @Body() data: any,
  ) {
    return this.guildsService.updateModerationConfig(guildId, data);
  }

  @Put(':id/economy')
  @ApiOperation({ summary: 'Update economy config' })
  async updateEconomy(
    @Param('id') guildId: string,
    @Body() data: any,
  ) {
    return this.guildsService.updateEconomyConfig(guildId, data);
  }

  @Get(':id/modlogs')
  @ApiOperation({ summary: 'Get moderation logs' })
  async getModLogs(
    @Param('id') guildId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.guildsService.getModLogs(guildId, page, limit);
  }

  @Get(':id/warnings')
  @ApiOperation({ summary: 'Get warnings' })
  async getWarnings(
    @Param('id') guildId: string,
    @Query('userId') userId?: string,
  ) {
    return this.guildsService.getWarnings(guildId, userId);
  }

  @Post(':id/autoroles')
  @ApiOperation({ summary: 'Add auto role' })
  async addAutoRole(
    @Param('id') guildId: string,
    @Body() data: { roleId: string; delay?: number },
  ) {
    return this.guildsService.addAutoRole(guildId, data.roleId, data.delay);
  }

  @Delete(':id/autoroles/:roleId')
  @ApiOperation({ summary: 'Remove auto role' })
  async removeAutoRole(
    @Param('id') guildId: string,
    @Param('roleId') roleId: string,
  ) {
    return this.guildsService.removeAutoRole(guildId, roleId);
  }

  @Put(':id/filters/:type')
  @ApiOperation({ summary: 'Update filter' })
  async updateFilter(
    @Param('id') guildId: string,
    @Param('type') filterType: string,
    @Body() data: any,
  ) {
    return this.guildsService.updateFilter(guildId, filterType, data);
  }

  @Get(':id/channels')
  @ApiOperation({ summary: 'Get guild channels from Discord' })
  async getChannels(
    @Param('id') guildId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.guildsService.getGuildChannels(guildId);
  }

  @Get(':id/roles')
  @ApiOperation({ summary: 'Get guild roles from Discord' })
  async getRoles(
    @Param('id') guildId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.guildsService.getGuildRoles(guildId);
  }

  @Put(':id/bot-nickname')
  @ApiOperation({ summary: 'Change bot nickname in guild' })
  async changeBotNickname(
    @Param('id') guildId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { nickname: string },
  ) {
    return this.guildsService.changeBotNickname(guildId, body.nickname);
  }

  // Auto Responder endpoints
  @Get(':id/auto-responders')
  @ApiOperation({ summary: 'Get all auto responders for a guild' })
  async getAutoResponders(
    @Param('id') guildId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.guildsService.getAutoResponders(guildId);
  }

  @Post(':id/auto-responders')
  @ApiOperation({ summary: 'Create a new auto responder' })
  async createAutoResponder(
    @Param('id') guildId: string,
    @CurrentUser('id') userId: string,
    @Body() body: {
      trigger: string;
      wildcard: boolean;
      sendAsReply: boolean;
      replies: string[];
      allowedRoles: string[];
      disabledRoles: string[];
      allowedChannels: string[];
      disabledChannels: string[];
    },
  ) {
    return this.guildsService.createAutoResponder(guildId, body);
  }

  @Put(':id/auto-responders/:responderId')
  @ApiOperation({ summary: 'Update an auto responder' })
  async updateAutoResponder(
    @Param('id') guildId: string,
    @Param('responderId') responderId: string,
    @CurrentUser('id') userId: string,
    @Body() body: {
      trigger?: string;
      wildcard?: boolean;
      sendAsReply?: boolean;
      replies?: string[];
      allowedRoles?: string[];
      disabledRoles?: string[];
      allowedChannels?: string[];
      disabledChannels?: string[];
      enabled?: boolean;
    },
  ) {
    return this.guildsService.updateAutoResponder(guildId, responderId, body);
  }

  @Delete(':id/auto-responders/:responderId')
  @ApiOperation({ summary: 'Delete an auto responder' })
  async deleteAutoResponder(
    @Param('id') guildId: string,
    @Param('responderId') responderId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.guildsService.deleteAutoResponder(guildId, responderId);
  }
}
