# This bot is not finished yet. Please do not use it.

# SufBot V5 - Advanced Discord Bot Infrastructure

A production-ready Discord bot infrastructure built with a monorepo architecture featuring:

- **Bot**: Discord.js v14 with sharding support
- **API**: NestJS with JWT authentication, RBAC, and WebSocket
- **Panel**: Next.js 15 with Tailwind CSS
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis for caching and pub/sub

## 🏗️ Architecture

```
sufbot-v5/
├── apps/
│   ├── bot/          # Discord bot (Discord.js v14)
│   ├── api/          # REST API (NestJS)
│   └── panel/        # Web dashboard (Next.js 15)
├── packages/
│   ├── database/     # Prisma schema & client
│   └── shared/       # Shared types & constants
├── docker-compose.yml
└── package.json
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- Docker & Docker Compose (optional)

### 1. Clone and Install

```bash
git clone <repository>
cd sufbot-v5
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Discord
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/sufbot_db

# Secrets
JWT_SECRET=your_jwt_secret_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_min_32_chars
API_SECRET=your_api_secret
WS_SECRET=your_websocket_secret
```

### 3. Setup Database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Or run migrations
npm run db:migrate
```

### 4. Start Development

```bash
# Start all services
npm run dev

# Or start individually
npm run bot:dev
npm run api:dev
npm run panel:dev
```

## 🐳 Docker Deployment

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📁 Project Structure

### Bot (`apps/bot`)

```
bot/
├── src/
│   ├── config/           # Configuration
│   ├── events/           # Discord events
│   ├── handlers/         # Command & event handlers
│   ├── modules/          # Feature modules
│   │   ├── moderation/   # Ban, kick, mute, etc.
│   │   └── economy/      # Daily, work, balance
│   ├── services/         # Cache, WebSocket
│   ├── types/            # TypeScript types
│   └── utils/            # Utilities
├── bot.ts                # Bot client
└── index.ts              # Sharding manager
```

### API (`apps/api`)

```
api/
├── src/
│   ├── auth/             # Authentication (Discord OAuth2, JWT)
│   ├── guilds/           # Guild management
│   ├── bot/              # Bot control endpoints
│   ├── admin/            # Admin endpoints
│   ├── websocket/        # WebSocket gateway
│   └── prisma/           # Database service
└── main.ts
```

### Panel (`apps/panel`)

```
panel/
├── src/
│   ├── app/              # Next.js app router
│   ├── components/       # React components
│   └── stores/           # Zustand stores
└── tailwind.config.ts
```

## 🔐 Security Features

- **JWT + Refresh Token**: Access tokens expire in 15 minutes
- **Discord OAuth2**: Secure authentication via Discord
- **RBAC**: Role-based access control (USER, MODERATOR, ADMIN, OWNER)
- **Rate Limiting**: Per-endpoint rate limits
- **CSRF Protection**: Built into Next.js
- **Webhook Signature Verification**: All bot communications are signed

## 📊 Features

### Bot Features
- Modular command system with JSON metadata
- Sharding support for large bots
- Redis caching for guild settings
- Real-time WebSocket communication with API

### Panel Features
- Dashboard with bot statistics
- Guild management (settings, modules, commands)
- Moderation logs viewer
- Economy configuration
- Welcome message editor
- Auto-role management
- Filter configuration

### API Features
- RESTful endpoints for all operations
- WebSocket for real-time updates
- Swagger documentation at `/docs`
- Audit logging

## 🔧 Commands

### Development

```bash
npm run dev              # Start all services
npm run bot:dev          # Start bot only
npm run api:dev          # Start API only
npm run panel:dev        # Start panel only
```

### Database

```bash
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema to database
npm run db:migrate       # Run migrations
npm run db:studio        # Open Prisma Studio
```

### Build

```bash
npm run build            # Build all packages
npm run bot:start        # Start bot in production
npm run api:start        # Start API in production
npm run panel:build      # Build panel for production
```

### Docker

```bash
npm run docker:up        # Start Docker services
npm run docker:down      # Stop Docker services
npm run docker:build     # Build Docker images
```

## 📝 Adding New Commands

1. Create a new file in `apps/bot/src/modules/<category>/commands/`:

```typescript
// apps/bot/src/modules/utility/commands/ping.ts
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../../../types';

const command: Command = {
  meta: {
    name: 'ping',
    description: 'Check bot latency',
    category: 'utility',
    permissions: [],
    botPermissions: [],
    cooldown: 3000,
    guildOnly: false,
    ownerOnly: false,
    nsfw: false,
    panelEditable: true,
    enabled: true,
  },
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency'),

  async execute(interaction: ChatInputCommandInteraction) {
    const ping = interaction.client.ws.ping;
    await interaction.reply(`🏓 Pong! Latency: ${ping}ms`);
  },
};

export default command;
```

2. Create `module.json` in the module folder:

```json
{
  "name": "utility",
  "description": "Utility commands",
  "enabled": true,
  "version": "1.0.0"
}
```

3. Commands are automatically loaded on bot start!

## 🌐 API Endpoints

### Authentication
- `GET /api/auth/discord` - Initiate Discord OAuth
- `GET /api/auth/discord/callback` - OAuth callback
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Guilds
- `GET /api/guilds` - Get user's guilds
- `GET /api/guilds/:id` - Get guild details
- `PUT /api/guilds/:id/settings` - Update settings
- `PUT /api/guilds/:id/welcome` - Update welcome config
- `PUT /api/guilds/:id/moderation` - Update moderation config
- `GET /api/guilds/:id/modlogs` - Get moderation logs

### Bot
- `GET /api/bot/stats` - Get bot statistics
- `GET /api/bot/commands` - Get available commands
- `GET /api/bot/modules` - Get available modules

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request
