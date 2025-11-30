# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/database/package*.json ./packages/database/
COPY packages/shared/package*.json ./packages/shared/

# Install dependencies
RUN npm ci --workspace=@sufbot/api --workspace=@sufbot/database --workspace=@sufbot/shared

# Copy source files
COPY apps/api ./apps/api
COPY packages/database ./packages/database
COPY packages/shared ./packages/shared
COPY tsconfig.json ./

# Generate Prisma client
RUN npm run db:generate

# Build packages
RUN npm run build --workspace=@sufbot/shared
RUN npm run build --workspace=@sufbot/database
RUN npm run build --workspace=@sufbot/api

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 sufbot

# Copy built files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/database/package.json ./packages/database/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma

# Set ownership
RUN chown -R sufbot:nodejs /app

USER sufbot

# Set environment
ENV NODE_ENV=production

EXPOSE 4000

# Start API
CMD ["node", "apps/api/dist/main.js"]
