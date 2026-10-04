-- CreateEnum
CREATE TYPE "ProductBadge" AS ENUM ('NEW', 'CUSTOMIZABLE', 'LIMITED_EDITION');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "badge" "ProductBadge";

