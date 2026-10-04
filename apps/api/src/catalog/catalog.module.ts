import { Module } from '@nestjs/common';
import { ListCategoriesUseCase, ListProductsUseCase } from '@antrina/application';
import {
  type CategoryRepository,
  type ImageStorage,
  type ProductRepository,
} from '@antrina/domain';
import { APP_ENV, type AppEnv } from '../config/env.js';
import {
  CATEGORY_REPOSITORY,
  IMAGE_STORAGE,
  PRODUCT_IMAGE_REPOSITORY,
  PRODUCT_REPOSITORY,
} from './catalog.tokens.js';
import { PrismaCategoryRepository } from './infrastructure/prisma-category.repository.js';
import { PrismaProductImageRepository } from './infrastructure/prisma-product-image.repository.js';
import { PrismaProductRepository } from './infrastructure/prisma-product.repository.js';
import { S3ImageStorage } from './infrastructure/s3-image.storage.js';
import { CatalogController } from './presentation/catalog.controller.js';

@Module({
  controllers: [CatalogController],
  providers: [
    { provide: PRODUCT_REPOSITORY, useClass: PrismaProductRepository },
    { provide: CATEGORY_REPOSITORY, useClass: PrismaCategoryRepository },
    { provide: PRODUCT_IMAGE_REPOSITORY, useClass: PrismaProductImageRepository },
    {
      provide: IMAGE_STORAGE,
      useFactory: (env: AppEnv) => new S3ImageStorage(env.s3),
      inject: [APP_ENV],
    },
    {
      provide: ListProductsUseCase,
      useFactory: (products: ProductRepository, storage: ImageStorage) =>
        new ListProductsUseCase(products, storage),
      inject: [PRODUCT_REPOSITORY, IMAGE_STORAGE],
    },
    {
      provide: ListCategoriesUseCase,
      useFactory: (categories: CategoryRepository) => new ListCategoriesUseCase(categories),
      inject: [CATEGORY_REPOSITORY],
    },
  ],
  exports: [PRODUCT_REPOSITORY, CATEGORY_REPOSITORY, PRODUCT_IMAGE_REPOSITORY, IMAGE_STORAGE],
})
export class CatalogModule {}
