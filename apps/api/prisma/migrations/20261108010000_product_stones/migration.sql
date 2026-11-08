-- Piedras de cada pieza (ids del catálogo de piedras). La tabla ya tiene RLS.
ALTER TABLE "Product" ADD COLUMN "stones" TEXT[] DEFAULT ARRAY[]::TEXT[];
