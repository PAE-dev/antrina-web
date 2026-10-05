import { Module } from '@nestjs/common';
import {
  DeleteSiteImageUseCase,
  ListAdminSiteImagesUseCase,
  RequestSiteImageUploadUseCase,
  SetSiteImageUseCase,
  type SiteImagesDeps,
  UpdateSiteImageAltUseCase,
} from '@antrina/application';
import { type AuditLog, type ImageStorage, type SiteImageRepository } from '@antrina/domain';
import { AdminAuthModule } from '../admin-auth/admin-auth.module.js';
import { AUDIT_LOG } from '../admin-auth/admin-auth.tokens.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { IMAGE_STORAGE } from '../catalog/catalog.tokens.js';
import { SiteModule } from '../site/site.module.js';
import { SITE_IMAGE_REPOSITORY } from '../site/site.tokens.js';
import { AdminSiteImagesController } from './presentation/admin-site-images.controller.js';

const SITE_IMAGES_DEPS = Symbol('SiteImagesDeps');

const siteImageUseCase = <T>(UseCase: new (deps: SiteImagesDeps) => T) => ({
  provide: UseCase,
  useFactory: (deps: SiteImagesDeps) => new UseCase(deps),
  inject: [SITE_IMAGES_DEPS],
});

/** Fotos editoriales de la tienda desde el panel (sección "Portada"). */
@Module({
  imports: [AdminAuthModule, CatalogModule, SiteModule],
  controllers: [AdminSiteImagesController],
  providers: [
    {
      provide: SITE_IMAGES_DEPS,
      useFactory: (
        images: SiteImageRepository,
        storage: ImageStorage,
        audit: AuditLog,
      ): SiteImagesDeps => ({ images, storage, audit }),
      inject: [SITE_IMAGE_REPOSITORY, IMAGE_STORAGE, AUDIT_LOG],
    },
    {
      provide: ListAdminSiteImagesUseCase,
      useFactory: (images: SiteImageRepository, storage: ImageStorage) =>
        new ListAdminSiteImagesUseCase(images, storage),
      inject: [SITE_IMAGE_REPOSITORY, IMAGE_STORAGE],
    },
    siteImageUseCase(RequestSiteImageUploadUseCase),
    siteImageUseCase(SetSiteImageUseCase),
    siteImageUseCase(UpdateSiteImageAltUseCase),
    siteImageUseCase(DeleteSiteImageUseCase),
  ],
})
export class AdminSiteModule {}
