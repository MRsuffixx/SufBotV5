// ============================================
// SUFBOT V5 - App Module
// ============================================

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { GuildsModule } from './guilds/guilds.module';
import { BotModule } from './bot/bot.module';
import { AdminModule } from './admin/admin.module';
import { WebSocketModule } from './websocket/websocket.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),

    // Database
    PrismaModule,

    // Feature modules
    AuthModule,
    GuildsModule,
    BotModule,
    AdminModule,
    WebSocketModule,
  ],
})
export class AppModule {}
