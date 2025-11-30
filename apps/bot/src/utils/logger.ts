// ============================================
// SUFBOT V5 - Logger Utility
// ============================================

import pino from 'pino';
import path from 'path';
import fs from 'fs';

const logDir = process.env.LOG_DIR || './logs';

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const transport = pino.transport({
  targets: [
    // Console output with pretty printing in development
    {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
      level: process.env.LOG_LEVEL || 'info',
    },
    // File output for errors
    {
      target: 'pino/file',
      options: {
        destination: path.join(logDir, 'errors.log'),
      },
      level: 'error',
    },
    // File output for all logs
    {
      target: 'pino/file',
      options: {
        destination: path.join(logDir, 'combined.log'),
      },
      level: process.env.LOG_LEVEL || 'info',
    },
  ],
});

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
    base: {
      service: 'sufbot',
    },
  },
  transport
);

// Create specialized loggers
export const modLogger = logger.child({ module: 'moderation' });
export const apiLogger = logger.child({ module: 'api' });
export const commandLogger = logger.child({ module: 'commands' });
export const eventLogger = logger.child({ module: 'events' });
