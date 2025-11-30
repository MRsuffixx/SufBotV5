# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/panel/package*.json ./apps/panel/
COPY packages/shared/package*.json ./packages/shared/

# Install dependencies
RUN npm ci --workspace=@sufbot/panel --workspace=@sufbot/shared

# Copy source files
COPY apps/panel ./apps/panel
COPY packages/shared ./packages/shared

# Build
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace=@sufbot/shared
RUN npm run build --workspace=@sufbot/panel

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built files
COPY --from=builder /app/apps/panel/.next/standalone ./
COPY --from=builder /app/apps/panel/.next/static ./apps/panel/.next/static
COPY --from=builder /app/apps/panel/public ./apps/panel/public

# Set ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

# Set environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

EXPOSE 3000

# Start panel
CMD ["node", "apps/panel/server.js"]
