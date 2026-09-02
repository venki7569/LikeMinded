import winston from 'winston';
import env from './env.js';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const developmentFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${ts} ${level}: ${stack || message}${extra}`;
  })
);

const productionFormat = combine(timestamp(), errors({ stack: true }), json());

export const logger = winston.createLogger({
  level: env.isProduction ? 'info' : 'debug',
  format: env.isProduction ? productionFormat : developmentFormat,
  transports: [new winston.transports.Console()],
  silent: env.isTest,
});

// Bridge for morgan's stream interface.
export const httpLogStream = {
  write: (message) => logger.http?.(message.trim()) ?? logger.info(message.trim()),
};

export default logger;
