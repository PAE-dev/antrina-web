-- CreateTable
CREATE TABLE "ProductPiece" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "serial" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductPiece_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductPiece_code_key" ON "ProductPiece"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ProductPiece_productId_serial_key" ON "ProductPiece"("productId", "serial");

-- AddForeignKey
ALTER TABLE "ProductPiece" ADD CONSTRAINT "ProductPiece_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Supabase expone public con su API de datos: toda tabla nueva lleva RLS.
ALTER TABLE "ProductPiece" ENABLE ROW LEVEL SECURITY;
