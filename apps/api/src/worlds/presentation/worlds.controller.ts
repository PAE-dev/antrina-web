import { Controller, Get, Header, Inject } from '@nestjs/common';
import { WORLDS_CONFIG, type WorldsConfigResponse } from '@antrina/contracts';
import { APP_ENV, type AppEnv } from '../../config/env.js';

/**
 * Los mundos de `/mundos` para la app móvil: la misma configuración que usa la tienda
 * (`WORLDS_CONFIG` de `@antrina/contracts`), con el origen de la tienda para resolver las imágenes.
 */
@Controller('worlds')
export class WorldsController {
  constructor(@Inject(APP_ENV) private readonly env: AppEnv) {}

  @Get()
  @Header('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')
  config(): WorldsConfigResponse {
    return { ...WORLDS_CONFIG, assetBaseUrl: this.env.storeOrigin };
  }
}
