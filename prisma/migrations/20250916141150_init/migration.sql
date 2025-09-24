-- CreateTable
CREATE TABLE "public"."MtgCard" (
    "id" TEXT NOT NULL,
    "scryfallId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "setCode" TEXT NOT NULL,
    "collectorNumber" TEXT NOT NULL,
    "rarity" TEXT,
    "finishes" TEXT[],
    "imageNormalUrl" TEXT,
    "legalitiesJson" JSONB,
    "priceUsd" DECIMAL(10,2),
    "priceUsdFoil" DECIMAL(10,2),
    "priceEur" DECIMAL(10,2),
    "priceTix" DECIMAL(10,2),
    "scryfallUpdatedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MtgCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."KvMeta" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KvMeta_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "MtgCard_scryfallId_key" ON "public"."MtgCard"("scryfallId");
