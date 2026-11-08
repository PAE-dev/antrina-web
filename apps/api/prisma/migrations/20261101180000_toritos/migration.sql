
-- AlterTable
ALTER TABLE "ProductPiece" ADD COLUMN     "giftFrom" TEXT,
ADD COLUMN     "giftMessage" TEXT,
ADD COLUMN     "giftTo" TEXT,
ADD COLUMN     "giftUpdatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Torito" (
    "id" TEXT NOT NULL,
    "pieceId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "colorCode" TEXT NOT NULL,
    "intention" TEXT,
    "lastVisitOn" TEXT,
    "visitStreak" INTEGER NOT NULL DEFAULT 0,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Torito_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Torito_pieceId_key" ON "Torito"("pieceId");

-- CreateIndex
CREATE INDEX "Torito_customerId_idx" ON "Torito"("customerId");

-- AddForeignKey
ALTER TABLE "Torito" ADD CONSTRAINT "Torito_pieceId_fkey" FOREIGN KEY ("pieceId") REFERENCES "ProductPiece"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Torito" ADD CONSTRAINT "Torito_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Supabase expone public con su API de datos: toda tabla nueva lleva RLS.
ALTER TABLE "Torito" ENABLE ROW LEVEL SECURITY;
