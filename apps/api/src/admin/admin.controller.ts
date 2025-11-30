import { Controller, Get, Put, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'OWNER')
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: 'Get all users' })
  async getUsers(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.adminService.getUsers(page, limit);
  }

  @Put('users/:id/role')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Update user role' })
  async updateUserRole(@Param('id') userId: string, @Body('role') role: string) {
    return this.adminService.updateUserRole(userId, role);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Get audit logs' })
  async getAuditLogs(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.adminService.getAuditLogs(page, limit);
  }

  @Get('api-keys')
  @ApiOperation({ summary: 'Get API keys' })
  async getApiKeys(@Query('userId') userId?: string) {
    return this.adminService.getApiKeys(userId);
  }

  @Post('api-keys')
  @ApiOperation({ summary: 'Create API key' })
  async createApiKey(
    @CurrentUser('id') userId: string,
    @Body() data: { name: string; permissions: string[] },
  ) {
    return this.adminService.createApiKey(userId, data.name, data.permissions);
  }

  @Delete('api-keys/:id')
  @ApiOperation({ summary: 'Delete API key' })
  async deleteApiKey(@Param('id') keyId: string) {
    return this.adminService.deleteApiKey(keyId);
  }
}
