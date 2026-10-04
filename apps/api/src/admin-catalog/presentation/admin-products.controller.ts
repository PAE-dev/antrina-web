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
  type AdminPrincipal,
  ArchiveProductUseCase,
  CreateProductUseCase,
  DeleteProductImageUseCase,
  GetAdminProductUseCase,
  ListAdminCategoriesUseCase,
  ListAdminProductsUseCase,
  ReorderProductImagesUseCase,
  RequestImageUploadUseCase,
  UpdateProductImageAltUseCase,
  UpdateProductUseCase,
} from '@antrina/application';
import {
  type AddProductImageRequest,
  type AdminCategoryDto,
  type AdminProductDto,
  type AdminProductListResponse,
  type ImageUploadRequest,
  type ImageUploadTargetDto,
  type ProductImageDto,
  type ProductStatusCode,
  type ReorderProductImagesRequest,
  type UpdateProductImageAltRequest,
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
  ) {}

  @Get()
  list(
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<AdminProductListResponse> {
    const parsedPage = parsePositiveInt(page);
    const parsedPageSize = parsePositiveInt(pageSize);
    return this.listProducts.execute({
      ...(q ? { q } : {}),
      ...(status ? { status: status as ProductStatusCode } : {}),
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
  ) {}

  @Get()
  list(): Promise<AdminCategoryDto[]> {
    return this.listCategories.execute();
  }
}
