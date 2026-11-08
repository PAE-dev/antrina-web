-- "Tu cielo" guardado en la cuenta del cliente (Customer con sesión de Google).

-- CreateTable
CREATE TABLE "SkyProfile" (
    "customerId" TEXT NOT NULL,
    "birthDate" TEXT NOT NULL,
    "birthTime" TEXT,
    "placeName" TEXT,
    "placeRegion" TEXT,
    "placeCountry" TEXT,
    "placeLat" DOUBLE PRECISION,
    "placeLon" DOUBLE PRECISION,
    "placeTimezone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkyProfile_pkey" PRIMARY KEY ("customerId")
);

-- CreateTable
CREATE TABLE "SkyQuestion" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkyQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkyBond" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "birthDate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkyBond_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SkyQuestion_customerId_createdAt_idx" ON "SkyQuestion"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "SkyBond_customerId_idx" ON "SkyBond"("customerId");

-- AddForeignKey
ALTER TABLE "SkyProfile" ADD CONSTRAINT "SkyProfile_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkyQuestion" ADD CONSTRAINT "SkyQuestion_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkyBond" ADD CONSTRAINT "SkyBond_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Supabase expone public con su API de datos: toda tabla nueva lleva RLS.
ALTER TABLE "SkyProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SkyQuestion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SkyBond" ENABLE ROW LEVEL SECURITY;
