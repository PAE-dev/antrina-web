import { Module } from '@nestjs/common';
import { ListSiteImagesUseCase } from '@antrina/application';
import { type ImageStorage, type SiteImageRepository } from '@antrina/domain';
import { CatalogModule } from '../catalog/catalog.module.js';
import { IMAGE_STORAGE } from '../catalog/catalog.tokens.js';
import { PrismaSiteImageRepository } from './infrastructure/prisma-site-image.repository.js';
import { SiteController } from './presentation/site.controller.js';
import { SITE_IMAGE_REPOSITORY } from './site.tokens.js';

/** Contenido editorial de la tienda (fotos de portada, historia y empresas). */
@Module({
  imports: [CatalogModule],
  controllers: [SiteController],
  providers: [
    { provide: SITE_IMAGE_REPOSITORY, useClass: PrismaSiteImageRepository },
    {
      provide: ListSiteImagesUseCase,
      useFactory: (images: SiteImageRepository, storage: ImageStorage) =>
        new ListSiteImagesUseCase(images, storage),
      inject: [SITE_IMAGE_REPOSITORY, IMAGE_STORAGE],
    },
  ],
  exports: [SITE_IMAGE_REPOSITORY],
})
export class SiteModule {}
