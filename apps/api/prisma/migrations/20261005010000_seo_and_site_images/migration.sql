-- CreateEnum
CREATE TYPE "ProductSize" AS ENUM ('MINI', 'STANDARD', 'LARGE', 'SIGNATURE');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "signs" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "size" "ProductSize";

-- AlterTable
ALTER TABLE "ProductTranslation" ADD COLUMN     "metaDescription" TEXT,
ADD COLUMN     "metaTitle" TEXT;

-- CreateTable
CREATE TABLE "SiteImage" (
    "id" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteImageTranslation" (
    "id" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "alt" TEXT NOT NULL,

    CONSTRAINT "SiteImageTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SiteImage_slot_key" ON "SiteImage"("slot");

-- CreateIndex
CREATE UNIQUE INDEX "SiteImage_storageKey_key" ON "SiteImage"("storageKey");

-- CreateIndex
CREATE UNIQUE INDEX "SiteImageTranslation_imageId_locale_key" ON "SiteImageTranslation"("imageId", "locale");

-- AddForeignKey
ALTER TABLE "SiteImageTranslation" ADD CONSTRAINT "SiteImageTranslation_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "SiteImage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

