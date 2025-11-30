import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BotService } from './bot.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('bot')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bot')
export class BotController {
  constructor(private botService: BotService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get bot statistics' })
  async getStats() {
    return this.botService.getStats();
  }

  @Get('commands')
  @ApiOperation({ summary: 'Get available commands' })
  async getCommands() {
    return this.botService.getCommands();
  }

  @Get('modules')
  @ApiOperation({ summary: 'Get available modules' })
  async getModules() {
    return this.botService.getModules();
  }

  @Get('command-stats')
  @Roles('ADMIN', 'OWNER')
  @ApiOperation({ summary: 'Get command usage statistics' })
  async getCommandStats(@Query('days') days?: number) {
    return this.botService.getCommandStats(days);
  }
}
