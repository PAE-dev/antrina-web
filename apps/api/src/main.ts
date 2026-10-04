import 'reflect-metadata';
import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { type NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { type NextFunction, type Request, type Response } from 'express';
import { AppModule } from './app.module.js';
import { type AppEnv, loadEnv } from './config/env.js';
import { DomainExceptionFilter } from './shared/presentation/domain-exception.filter.js';

/** Solo el panel recibe CORS con credenciales; la tienda consume la API pública sin cookies. */
function corsFor(env: AppEnv) {
  return (
    request: Request,
    callback: (
      error: Error | null,
      options: { origin: string | false; credentials?: boolean },
    ) => void,
  ) => {
    const origin = request.get('origin');
    if (origin && origin === env.adminOrigin && request.path.startsWith('/admin')) {
      callback(null, { origin, credentials: true });
    } else if (origin && env.corsOrigins.includes(origin) && !request.path.startsWith('/admin')) {
      callback(null, { origin });
    } else {
      callback(null, { origin: false });
    }
  };
}

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  if (env.isProduction) app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(cookieParser());
  app.use('/admin', (_request: Request, response: Response, next: NextFunction) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Robots-Tag', 'noindex, nofollow');
    next();
  });
  app.enableCors(corsFor(env));
  app.useGlobalFilters(new DomainExceptionFilter());
  app.enableShutdownHooks();

  await app.listen(env.port);
  Logger.log(`API escuchando en http://localhost:${env.port}`, 'Bootstrap');
}

void bootstrap();
