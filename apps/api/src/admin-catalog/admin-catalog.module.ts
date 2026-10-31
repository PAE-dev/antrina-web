import { Module } from '@nestjs/common';
import {
  AddProductImageUseCase,
  AdjustStockUseCase,
  ArchiveProductUseCase,
  ClearStockUseCase,
  CreateCategoryUseCase,
  CreateProductUseCase,
  DeleteCategoryUseCase,
  DeleteProductImageUseCase,
  GenerateProductPiecesUseCase,
  GetAdminProductUseCase,
  ListAdminCategoriesUseCase,
  ListAdminProductsUseCase,
  ListInventoryUseCase,
  ListProductPiecesUseCase,
  ListStockMovementsUseCase,
  type ProductImagesDeps,
  ReorderProductImagesUseCase,
  RequestImageUploadUseCase,
  UpdateCategoryUseCase,
  UpdateProductImageAltUseCase,
  UpdateProductUseCase,
  VoidProductPieceUseCase,
} from '@antrina/application';
import {
  type AuditLog,
  type CategoryRepository,
  type ImageStorage,
  type PieceCodeGenerator,
  type ProductImageRepository,
  type ProductPieceRepository,
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
import { CryptoPieceCodeGenerator } from './infrastructure/crypto-piece-code.generator.js';
import { PrismaProductPieceRepository } from './infrastructure/prisma-product-piece.repository.js';
import { PrismaStockRepository } from './infrastructure/prisma-stock.repository.js';
import {
  AdminCategoriesController,
  AdminInventoryController,
  AdminProductsController,
  AdminStockMovementsController,
} from './presentation/admin-products.controller.js';

const PRODUCT_IMAGES_DEPS = Symbol('ProductImagesDeps');
const STOCK_REPOSITORY = Symbol('StockRepository');
const PRODUCT_PIECE_REPOSITORY = Symbol('ProductPieceRepository');
const PIECE_CODE_GENERATOR = Symbol('PieceCodeGenerator');

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
  controllers: [
    AdminProductsController,
    AdminCategoriesController,
    AdminStockMovementsController,
    AdminInventoryController,
  ],
  providers: [
    { provide: STOCK_REPOSITORY, useClass: PrismaStockRepository },
    { provide: PRODUCT_PIECE_REPOSITORY, useClass: PrismaProductPieceRepository },
    { provide: PIECE_CODE_GENERATOR, useClass: CryptoPieceCodeGenerator },
    {
      provide: ListProductPiecesUseCase,
      useFactory: (products: ProductRepository, pieces: ProductPieceRepository) =>
        new ListProductPiecesUseCase(products, pieces),
      inject: [PRODUCT_REPOSITORY, PRODUCT_PIECE_REPOSITORY],
    },
    {
      provide: GenerateProductPiecesUseCase,
      useFactory: (
        products: ProductRepository,
        pieces: ProductPieceRepository,
        codes: PieceCodeGenerator,
        audit: AuditLog,
      ) => new GenerateProductPiecesUseCase(products, pieces, codes, audit),
      inject: [PRODUCT_REPOSITORY, PRODUCT_PIECE_REPOSITORY, PIECE_CODE_GENERATOR, AUDIT_LOG],
    },
    {
      provide: VoidProductPieceUseCase,
      useFactory: (pieces: ProductPieceRepository, audit: AuditLog) =>
        new VoidProductPieceUseCase(pieces, audit),
      inject: [PRODUCT_PIECE_REPOSITORY, AUDIT_LOG],
    },
    {
      provide: ListInventoryUseCase,
      useFactory: (products: ProductRepository, categories: CategoryRepository) =>
        new ListInventoryUseCase(products, categories),
      inject: [PRODUCT_REPOSITORY, CATEGORY_REPOSITORY],
    },
    {
      provide: ClearStockUseCase,
      useFactory: (stock: StockRepository, audit: AuditLog) => new ClearStockUseCase(stock, audit),
      inject: [STOCK_REPOSITORY, AUDIT_LOG],
    },
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
