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
  UseGuards,
} from '@nestjs/common';
import {
  type AdminPrincipal,
  DeleteSiteImageUseCase,
  ListAdminSiteImagesUseCase,
  RequestSiteImageUploadUseCase,
  SetSiteImageUseCase,
  UpdateSiteImageAltUseCase,
} from '@antrina/application';
import {
  type AdminSiteImageDto,
  type AdminSiteImagesResponse,
  type ImageUploadRequest,
  type ImageUploadTargetDto,
  type SetSiteImageRequest,
  type UpdateProductImageAltRequest,
} from '@antrina/contracts';
import {
  AdminOriginGuard,
  AdminSessionGuard,
  CurrentAdmin,
  RequirePermission,
} from '../../admin-auth/presentation/admin.guards.js';

@Controller('admin/site/images')
@UseGuards(AdminOriginGuard, AdminSessionGuard)
@RequirePermission('catalog.manage')
export class AdminSiteImagesController {
  constructor(
    @Inject(ListAdminSiteImagesUseCase) private readonly listImages: ListAdminSiteImagesUseCase,
    @Inject(RequestSiteImageUploadUseCase)
    private readonly requestUpload: RequestSiteImageUploadUseCase,
    @Inject(SetSiteImageUseCase) private readonly setImage: SetSiteImageUseCase,
    @Inject(UpdateSiteImageAltUseCase) private readonly updateAlt: UpdateSiteImageAltUseCase,
    @Inject(DeleteSiteImageUseCase) private readonly deleteImage: DeleteSiteImageUseCase,
  ) {}

  @Get()
  async list(): Promise<AdminSiteImagesResponse> {
    return { data: await this.listImages.execute() };
  }

  @Post(':slot/upload-url')
  @HttpCode(HttpStatus.OK)
  uploadUrl(
    @Param('slot') slot: string,
    @Body() body: ImageUploadRequest,
  ): Promise<ImageUploadTargetDto> {
    return this.requestUpload.execute(slot, body);
  }

  @Put(':slot')
  set(
    @Param('slot') slot: string,
    @Body() body: SetSiteImageRequest,
    @CurrentAdmin() admin: AdminPrincipal,
  ): Promise<AdminSiteImageDto> {
    return this.setImage.execute(slot, body, admin.id);
  }

  @Patch(':slot')
  update(
    @Param('slot') slot: string,
    @Body() body: UpdateProductImageAltRequest,
    @CurrentAdmin() admin: AdminPrincipal,
  ): Promise<AdminSiteImageDto> {
    return this.updateAlt.execute(slot, body?.alt, admin.id);
  }

  @Delete(':slot')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('slot') slot: string, @CurrentAdmin() admin: AdminPrincipal): Promise<void> {
    return this.deleteImage.execute(slot, admin.id);
  }
}
