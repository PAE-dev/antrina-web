import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ListSiteImagesUseCase } from '@antrina/application';
import { type SiteImagesResponse } from '@antrina/contracts';
import { resolveLocale } from '@antrina/domain';

@Controller('site')
export class SiteController {
  constructor(@Inject(ListSiteImagesUseCase) private readonly listImages: ListSiteImagesUseCase) {}

  @Get('images')
  images(@Query('locale') locale?: string): Promise<SiteImagesResponse> {
    return this.listImages.execute(resolveLocale(locale));
  }
}
