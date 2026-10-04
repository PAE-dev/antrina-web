import { Module } from '@nestjs/common';
import {
  AddProductImageUseCase,
  ArchiveProductUseCase,
  CreateProductUseCase,
  DeleteProductImageUseCase,
  GetAdminProductUseCase,
  ListAdminCategoriesUseCase,
  ListAdminProductsUseCase,
  type ProductImagesDeps,
  ReorderProductImagesUseCase,
  RequestImageUploadUseCase,
  UpdateProductImageAltUseCase,
  UpdateProductUseCase,
} from '@antrina/application';
import {
  type AuditLog,
  type CategoryRepository,
  type ImageStorage,
  type ProductImageRepository,
  type ProductRepository,
} from '@antrina/domain';
import { AdminAuthModule } from '../admin-auth/admin-auth.module.js';
import { AUDIT_LOG } from '../admin-auth/admin-auth.tokens.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import {
  CATEGORY_REPOSITORY,
  IMAGE_STORAGE,
  PRODUCT_IMAGE_REPOSITORY,
  PRODUCT_REPOSITORY,
} from '../catalog/catalog.tokens.js';
import {
  AdminCategoriesController,
  AdminProductsController,
} from './presentation/admin-products.controller.js';

const PRODUCT_IMAGES_DEPS = Symbol('ProductImagesDeps');

type ProductUseCase<T> = new (
  products: ProductRepository,
  storage: ImageStorage,
  audit: AuditLog,
) => T;

const productUseCase = <T>(UseCase: ProductUseCase<T>) => ({
  provide: UseCase,
  useFactory: (products: ProductRepository, storage: ImageStorage, audit: AuditLog) =>
    new UseCase(products, storage, audit),
  inject: [PRODUCT_REPOSITORY, IMAGE_STORAGE, AUDIT_LOG],
});

const imageUseCase = <T>(UseCase: new (deps: ProductImagesDeps) => T) => ({
  provide: UseCase,
  useFactory: (deps: ProductImagesDeps) => new UseCase(deps),
  inject: [PRODUCT_IMAGES_DEPS],
});

/** Catálogo desde el panel: productos, galería de fotos (MinIO/R2) e intenciones. */
@Module({
  imports: [AdminAuthModule, CatalogModule],
  controllers: [AdminProductsController, AdminCategoriesController],
  providers: [
    {
      provide: PRODUCT_IMAGES_DEPS,
      useFactory: (
        products: ProductRepository,
        images: ProductImageRepository,
        storage: ImageStorage,
        audit: AuditLog,
      ): ProductImagesDeps => ({ products, images, storage, audit }),
      inject: [PRODUCT_REPOSITORY, PRODUCT_IMAGE_REPOSITORY, IMAGE_STORAGE, AUDIT_LOG],
    },
    {
      provide: ListAdminProductsUseCase,
      useFactory: (products: ProductRepository, storage: ImageStorage) =>
        new ListAdminProductsUseCase(products, storage),
      inject: [PRODUCT_REPOSITORY, IMAGE_STORAGE],
    },
    {
      provide: GetAdminProductUseCase,
      useFactory: (products: ProductRepository, storage: ImageStorage) =>
        new GetAdminProductUseCase(products, storage),
      inject: [PRODUCT_REPOSITORY, IMAGE_STORAGE],
    },
    productUseCase(CreateProductUseCase),
    productUseCase(UpdateProductUseCase),
    productUseCase(ArchiveProductUseCase),
    imageUseCase(RequestImageUploadUseCase),
    imageUseCase(AddProductImageUseCase),
    imageUseCase(ReorderProductImagesUseCase),
    imageUseCase(UpdateProductImageAltUseCase),
    imageUseCase(DeleteProductImageUseCase),
    {
      provide: ListAdminCategoriesUseCase,
      useFactory: (categories: CategoryRepository) => new ListAdminCategoriesUseCase(categories),
      inject: [CATEGORY_REPOSITORY],
    },
  ],
})
export class AdminCatalogModule {}
