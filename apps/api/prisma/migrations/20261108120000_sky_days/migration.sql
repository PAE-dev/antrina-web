-- Días de "Tu cielo" por cliente: racha, ranking, ritual y papel de la fortuna.
CREATE TABLE "SkyDay" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "rankingSeen" BOOLEAN NOT NULL DEFAULT false,
    "ritualDone" BOOLEAN NOT NULL DEFAULT false,
    "fortuneLevel" TEXT,
    "fortuneVerse" INTEGER,
    "fortuneStone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkyDay_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SkyDay_customerId_day_key" ON "SkyDay"("customerId", "day");
CREATE INDEX "SkyDay_customerId_day_idx" ON "SkyDay"("customerId", "day");

ALTER TABLE "SkyDay" ADD CONSTRAINT "SkyDay_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Supabase expone public con su API de datos: toda tabla nueva lleva RLS.
ALTER TABLE "SkyDay" ENABLE ROW LEVEL SECURITY;
