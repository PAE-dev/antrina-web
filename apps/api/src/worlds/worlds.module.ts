import { Module } from '@nestjs/common';
import { WorldsController } from './presentation/worlds.controller.js';

/** Configuración de los mundos (solo lectura, sin base de datos). */
@Module({
  controllers: [WorldsController],
})
export class WorldsModule {}
