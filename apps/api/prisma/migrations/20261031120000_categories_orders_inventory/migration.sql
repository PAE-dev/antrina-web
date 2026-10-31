-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderChannel" AS ENUM ('WHATSAPP', 'STORE', 'INSTAGRAM', 'FACEBOOK', 'IN_PERSON', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('YAPE', 'PLIN', 'TRANSFER', 'CASH', 'CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('INITIAL', 'RESTOCK', 'SALE', 'SALE_CANCELLED', 'ADJUSTMENT');

-- DropForeignKey
ALTER TABLE "Category" DROP CONSTRAINT "Category_parentId_fkey";

-- AlterTable: el slug empieza vacío y se rellena abajo, antes de hacerlo obligatorio.
ALTER TABLE "CategoryTranslation" ADD COLUMN     "description" TEXT,
ADD COLUMN     "slug" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "costCents" INTEGER,
ADD COLUMN     "intention" TEXT,
ADD COLUMN     "lowStockThreshold" INTEGER NOT NULL DEFAULT 3;

-- Datos: las categorías antiguas eran intenciones. Cada producto conserva su intención en
-- `Product.intention` y pasa a la nueva categoría real "Árboles de cuarzo".
UPDATE "Product" p
SET "intention" = c."slug"
FROM "Category" c
WHERE c."id" = p."categoryId"
  AND c."slug" IN ('abundancia', 'amor', 'proteccion', 'felicidad', 'mixto');

INSERT INTO "Category" ("id", "slug", "sortOrder", "createdAt", "updatedAt")
VALUES ('cat_arboles_de_cuarzo', 'arboles-de-cuarzo', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "CategoryTranslation" ("id", "categoryId", "locale", "name", "slug")
VALUES
  ('cat_arboles_de_cuarzo_es', 'cat_arboles_de_cuarzo', 'es', 'Árboles de cuarzo', 'arboles-de-cuarzo'),
  ('cat_arboles_de_cuarzo_en', 'cat_arboles_de_cuarzo', 'en', 'Quartz trees', 'quartz-trees');

UPDATE "Product" SET "categoryId" = 'cat_arboles_de_cuarzo' WHERE "intention" IS NOT NULL;

DELETE FROM "Category"
WHERE "slug" IN ('abundancia', 'amor', 'proteccion', 'felicidad', 'mixto')
  AND NOT EXISTS (SELECT 1 FROM "Product" p WHERE p."categoryId" = "Category"."id");

-- Cualquier otra categoría que existiera usa su slug en todos los idiomas.
UPDATE "CategoryTranslation" t
SET "slug" = c."slug"
FROM "Category" c
WHERE c."id" = t."categoryId" AND t."slug" IS NULL;

ALTER TABLE "CategoryTranslation" ALTER COLUMN "slug" SET NOT NULL;

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "stockAfter" INTEGER NOT NULL,
    "note" TEXT,
    "orderId" TEXT,
    "adminUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PAID',
    "channel" "OrderChannel" NOT NULL DEFAULT 'WHATSAPP',
    "paymentMethod" "PaymentMethod",
    "customerId" TEXT,
    "currency" "Currency" NOT NULL DEFAULT 'PEN',
    "subtotalCents" INTEGER NOT NULL,
    "shippingCents" INTEGER NOT NULL DEFAULT 0,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL,
    "note" TEXT,
    "soldAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderLine" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,

    CONSTRAINT "OrderLine_pkey" PRIMARY KEY ("id")
);

-- Datos: el stock actual de cada producto es el punto de partida del historial.
INSERT INTO "StockMovement" ("id", "productId", "type", "quantity", "stockAfter", "note")
SELECT 'mov_' || p."id", p."id", 'INITIAL', p."stock", p."stock", 'Stock al activar el historial'
FROM "Product" p;

-- CreateIndex
CREATE INDEX "StockMovement_productId_createdAt_idx" ON "StockMovement"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_createdAt_idx" ON "StockMovement"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_phone_key" ON "Customer"("phone");

-- CreateIndex
CREATE INDEX "Customer_name_idx" ON "Customer"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Order_number_key" ON "Order"("number");

-- CreateIndex
CREATE INDEX "Order_status_soldAt_idx" ON "Order"("status", "soldAt");

-- CreateIndex
CREATE INDEX "Order_soldAt_idx" ON "Order"("soldAt");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE INDEX "OrderLine_orderId_idx" ON "OrderLine"("orderId");

-- CreateIndex
CREATE INDEX "OrderLine_productId_idx" ON "OrderLine"("productId");

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryTranslation_locale_slug_key" ON "CategoryTranslation"("locale", "slug");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_intention_idx" ON "Product"("intention");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
