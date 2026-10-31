import { Module } from '@nestjs/common';
import {
  AddProductImageUseCase,
  AdjustStockUseCase,
  ArchiveProductUseCase,
  CreateCategoryUseCase,
  CreateProductUseCase,
  DeleteCategoryUseCase,
  DeleteProductImageUseCase,
  GetAdminProductUseCase,
  ListAdminCategoriesUseCase,
  ListAdminProductsUseCase,
  ListStockMovementsUseCase,
  type ProductImagesDeps,
  ReorderProductImagesUseCase,
  RequestImageUploadUseCase,
  UpdateCategoryUseCase,
  UpdateProductImageAltUseCase,
  UpdateProductUseCase,
} from '@antrina/application';
import {
  type AuditLog,
  type CategoryRepository,
  type ImageStorage,
  type ProductImageRepository,
  type ProductRepository,
  type StockRepository,
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
import { PrismaStockRepository } from './infrastructure/prisma-stock.repository.js';
import {
  AdminCategoriesController,
  AdminProductsController,
  AdminStockMovementsController,
} from './presentation/admin-products.controller.js';

const PRODUCT_IMAGES_DEPS = Symbol('ProductImagesDeps');
const STOCK_REPOSITORY = Symbol('StockRepository');

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

const categoryUseCase = <T>(
  UseCase: new (categories: CategoryRepository, audit: AuditLog) => T,
) => ({
  provide: UseCase,
  useFactory: (categories: CategoryRepository, audit: AuditLog) => new UseCase(categories, audit),
  inject: [CATEGORY_REPOSITORY, AUDIT_LOG],
});

const imageUseCase = <T>(UseCase: new (deps: ProductImagesDeps) => T) => ({
  provide: UseCase,
  useFactory: (deps: ProductImagesDeps) => new UseCase(deps),
  inject: [PRODUCT_IMAGES_DEPS],
});

/** Catálogo desde el panel: productos, galería de fotos (MinIO/R2), categorías e inventario. */
@Module({
  imports: [AdminAuthModule, CatalogModule],
  controllers: [AdminProductsController, AdminCategoriesController, AdminStockMovementsController],
  providers: [
    { provide: STOCK_REPOSITORY, useClass: PrismaStockRepository },
    {
      provide: AdjustStockUseCase,
      useFactory: (stock: StockRepository, audit: AuditLog) => new AdjustStockUseCase(stock, audit),
      inject: [STOCK_REPOSITORY, AUDIT_LOG],
    },
    {
      provide: ListStockMovementsUseCase,
      useFactory: (stock: StockRepository) => new ListStockMovementsUseCase(stock),
      inject: [STOCK_REPOSITORY],
    },
    categoryUseCase(CreateCategoryUseCase),
    categoryUseCase(UpdateCategoryUseCase),
    categoryUseCase(DeleteCategoryUseCase),
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
