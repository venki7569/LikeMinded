import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import env from './config/env.js';
import { httpLogStream } from './config/logger.js';
import { mountSwagger } from './config/swagger.js';
import apiRoutes from './routes/index.js';
import { apiLimiter } from './middleware/rateLimit.middleware.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import ApiError from './utils/ApiError.js';

export function createApp() {
  const app = express();

  // Required for correct client IPs (and rate limiting) behind Render/Vercel proxies.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      // Swagger UI needs inline styles; the API itself serves no HTML.
      contentSecurityPolicy: env.isProduction ? undefined : false,
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(
    cors({
      origin(origin, callback) {
        // Same-origin/server-to-server requests arrive without an Origin header.
        if (!origin || env.clientOrigins.includes(origin)) return callback(null, true);
        return callback(ApiError.forbidden(`Origin ${origin} is not allowed by CORS`));
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser(env.COOKIE_SECRET));
  app.use(compression());
  app.use(mongoSanitize());
  app.use(hpp());

  if (!env.isTest) {
    app.use(morgan(env.isProduction ? 'combined' : 'dev', { stream: httpLogStream }));
  }

  mountSwagger(app);

  app.use(env.API_PREFIX, apiLimiter, apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
