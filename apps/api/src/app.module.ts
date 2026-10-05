import { Module } from '@nestjs/common';
import { AdminAuthModule } from './admin-auth/admin-auth.module.js';
import { AdminCatalogModule } from './admin-catalog/admin-catalog.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { CheckoutModule } from './checkout/checkout.module.js';
import { ConfigModule } from './config/config.module.js';
import { HealthController } from './health/health.controller.js';
import { NotificationModule } from './notification/notification.module.js';
import { AdminSiteModule } from './admin-site/admin-site.module.js';
import { PrismaModule } from './shared/infrastructure/prisma/prisma.module.js';
import { SiteModule } from './site/site.module.js';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    CatalogModule,
    CheckoutModule,
    NotificationModule,
    AdminAuthModule,
    AdminCatalogModule,
    SiteModule,
    AdminSiteModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
