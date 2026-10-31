import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  AddProductImageUseCase,
  AdjustStockUseCase,
  type AdminPrincipal,
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
  ReorderProductImagesUseCase,
  RequestImageUploadUseCase,
  UpdateCategoryUseCase,
  UpdateProductImageAltUseCase,
  UpdateProductUseCase,
  VoidProductPieceUseCase,
} from '@antrina/application';
import {
  type AddProductImageRequest,
  type AdjustStockRequest,
  type AdminCategoryDto,
  type AdminProductDto,
  type AdminProductListResponse,
  type AdminStockFilterCode,
  type ClearStockRequest,
  type ClearStockResponse,
  type GenerateProductPiecesRequest,
  type ImageUploadRequest,
  type ImageUploadTargetDto,
  type InventoryResponse,
  type ProductImageDto,
  type ProductPieceDto,
  type ProductPieceListResponse,
  type ProductStatusCode,
  type ReorderProductImagesRequest,
  type StockMovementDto,
  type StockMovementListResponse,
  type UpdateProductImageAltRequest,
  type UpsertCategoryRequest,
  type UpsertProductRequest,
} from '@antrina/contracts';
import {
  AdminOriginGuard,
  AdminSessionGuard,
  CurrentAdmin,
  RequirePermission,
} from '../../admin-auth/presentation/admin.guards.js';
import { parsePositiveInt } from '../../shared/presentation/query-parsers.js';

@Controller('admin/products')
@UseGuards(AdminOriginGuard, AdminSessionGuard)
@RequirePermission('catalog.manage')
export class AdminProductsController {
  constructor(
    @Inject(ListAdminProductsUseCase) private readonly listProducts: ListAdminProductsUseCase,
    @Inject(GetAdminProductUseCase) private readonly getProduct: GetAdminProductUseCase,
    @Inject(CreateProductUseCase) private readonly createProduct: CreateProductUseCase,
    @Inject(UpdateProductUseCase) private readonly updateProduct: UpdateProductUseCase,
    @Inject(ArchiveProductUseCase) private readonly archiveProduct: ArchiveProductUseCase,
    @Inject(RequestImageUploadUseCase) private readonly requestUpload: RequestImageUploadUseCase,
    @Inject(AddProductImageUseCase) private readonly addImage: AddProductImageUseCase,
    @Inject(ReorderProductImagesUseCase)
    private readonly reorderImages: ReorderProductImagesUseCase,
    @Inject(UpdateProductImageAltUseCase) private readonly updateAlt: UpdateProductImageAltUseCase,
    @Inject(DeleteProductImageUseCase) private readonly deleteImage: DeleteProductImageUseCase,
    @Inject(AdjustStockUseCase) private readonly adjustStock: AdjustStockUseCase,
    @Inject(ListProductPiecesUseCase) private readonly listPieces: ListProductPiecesUseCase,
    @Inject(GenerateProductPiecesUseCase)
    private readonly generatePieces: GenerateProductPiecesUseCase,
    @Inject(VoidProductPieceUseCase) private readonly voidPiece: VoidProductPieceUseCase,
  ) {}

  @Get()
  list(
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('categoryId') categoryId?: string,
    @Query('stock') stock?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<AdminProductListResponse> {
    const parsedPage = parsePositiveInt(page);
    const parsedPageSize = parsePositiveInt(pageSize);
    return this.listProducts.execute({
      ...(q ? { q } : {}),
      ...(status ? { status: status as ProductStatusCode } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(stock ? { stock: stock as AdminStockFilterCode } : {}),
      ...(parsedPage ? { page: parsedPage } : {}),
      ...(parsedPageSize ? { pageSize: parsedPageSize } : {}),
    });
  }

  @Post()
  create(
    @Body() body: UpsertProductRequest,
    @CurrentAdmin() admin: AdminPrincipal,
  ): Promise<AdminProductDto> {
    return this.createProduct.execute(body, admin.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<AdminProductDto> {
    return this.getProduct.execute(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() body: UpsertProductRequest,
    @CurrentAdmin() admin: AdminPrincipal,
  ): Promise<AdminProductDto> {
    return this.updateProduct.execute(id, body, admin.id);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  archive(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminPrincipal,
  ): Promise<AdminProductDto> {
    return this.archiveProduct.execute(id, admin.id);
  }

  @Post(':id/stock')
  changeStock(
    @Param('id') id: string,
    @Body() body: AdjustStockRequest,
    @CurrentAdmin() admin: AdminPrincipal,
  ): Promise<StockMovementDto> {
    return this.adjustStock.execute(id, body, admin.id);
  }

  @Get(':id/pieces')
  pieces(@Param('id') id: string): Promise<ProductPieceListResponse> {
    return this.listPieces.execute(id);
  }

  @Post(':id/pieces')
  createPieces(
    @Param('id') id: string,
    @Body() body: GenerateProductPiecesRequest,
    @CurrentAdmin() admin: AdminPrincipal,
  ): Promise<ProductPieceListResponse> {
    return this.generatePieces.execute(id, body, admin.id);
  }

  @Post(':id/pieces/:pieceId/void')
  @HttpCode(HttpStatus.OK)
  cancelPiece(
    @Param('id') id: string,
    @Param('pieceId') pieceId: string,
    @CurrentAdmin() admin: AdminPrincipal,
  ): Promise<ProductPieceDto> {
    return this.voidPiece.execute(id, pieceId, admin.id);
  }

  @Post(':id/images/upload-url')
  @HttpCode(HttpStatus.OK)
  uploadUrl(
    @Param('id') id: string,
    @Body() body: ImageUploadRequest,
  ): Promise<ImageUploadTargetDto> {
    return this.requestUpload.execute(id, body);
  }

  @Post(':id/images')
  addProductImage(
    @Param('id') id: string,
    @Body() body: AddProductImageRequest,
    @CurrentAdmin() admin: AdminPrincipal,
  ): Promise<ProductImageDto> {
    return this.addImage.execute(id, body, admin.id);
  }

  @Put(':id/images/order')
  reorder(
    @Param('id') id: string,
    @Body() body: ReorderProductImagesRequest,
    @CurrentAdmin() admin: AdminPrincipal,
  ): Promise<ProductImageDto[]> {
    return this.reorderImages.execute(id, body?.imageIds, admin.id);
  }

  @Patch(':id/images/:imageId')
  updateImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @Body() body: UpdateProductImageAltRequest,
    @CurrentAdmin() admin: AdminPrincipal,
  ): Promise<ProductImageDto> {
    return this.updateAlt.execute(id, imageId, body?.alt, admin.id);
  }

  @Delete(':id/images/:imageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @CurrentAdmin() admin: AdminPrincipal,
  ): Promise<void> {
    return this.deleteImage.execute(id, imageId, admin.id);
  }
}

@Controller('admin/categories')
@UseGuards(AdminOriginGuard, AdminSessionGuard)
@RequirePermission('catalog.manage')
export class AdminCategoriesController {
  constructor(
    @Inject(ListAdminCategoriesUseCase) private readonly listCategories: ListAdminCategoriesUseCase,
    @Inject(CreateCategoryUseCase) private readonly createCategory: CreateCategoryUseCase,
    @Inject(UpdateCategoryUseCase) private readonly updateCategory: UpdateCategoryUseCase,
    @Inject(DeleteCategoryUseCase) private readonly deleteCategory: DeleteCategoryUseCase,
  ) {}

  @Get()
  list(): Promise<AdminCategoryDto[]> {
    return this.listCategories.execute();
  }

  @Post()
  create(
    @Body() body: UpsertCategoryRequest,
    @CurrentAdmin() admin: AdminPrincipal,
  ): Promise<AdminCategoryDto> {
    return this.createCategory.execute(body, admin.id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() body: UpsertCategoryRequest,
    @CurrentAdmin() admin: AdminPrincipal,
  ): Promise<AdminCategoryDto> {
    return this.updateCategory.execute(id, body, admin.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentAdmin() admin: AdminPrincipal): Promise<void> {
    return this.deleteCategory.execute(id, admin.id);
  }
}

@Controller('admin/inventory')
@UseGuards(AdminOriginGuard, AdminSessionGuard)
@RequirePermission('catalog.manage')
export class AdminInventoryController {
  constructor(
    @Inject(ListInventoryUseCase) private readonly listInventory: ListInventoryUseCase,
    @Inject(ClearStockUseCase) private readonly clearStock: ClearStockUseCase,
  ) {}

  @Get()
  list(@Query('q') q?: string, @Query('stock') stock?: string): Promise<InventoryResponse> {
    return this.listInventory.execute({
      ...(q ? { q } : {}),
      ...(stock ? { stock: stock as AdminStockFilterCode } : {}),
    });
  }

  @Post('clear')
  @HttpCode(HttpStatus.OK)
  clear(
    @Body() body: ClearStockRequest,
    @CurrentAdmin() admin: AdminPrincipal,
  ): Promise<ClearStockResponse> {
    return this.clearStock.execute(body, admin.id);
  }
}

@Controller('admin/stock-movements')
@UseGuards(AdminOriginGuard, AdminSessionGuard)
@RequirePermission('catalog.manage')
export class AdminStockMovementsController {
  constructor(
    @Inject(ListStockMovementsUseCase) private readonly listMovements: ListStockMovementsUseCase,
  ) {}

  @Get()
  list(
    @Query('productId') productId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<StockMovementListResponse> {
    const parsedPage = parsePositiveInt(page);
    const parsedPageSize = parsePositiveInt(pageSize);
    return this.listMovements.execute({
      ...(productId ? { productId } : {}),
      ...(parsedPage ? { page: parsedPage } : {}),
      ...(parsedPageSize ? { pageSize: parsedPageSize } : {}),
    });
  }
}
