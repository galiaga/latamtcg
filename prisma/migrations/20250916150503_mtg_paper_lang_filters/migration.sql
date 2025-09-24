-- AlterTable
ALTER TABLE "public"."MtgCard" ADD COLUMN     "borderColor" TEXT,
ADD COLUMN     "frameEffects" TEXT[],
ADD COLUMN     "fullArt" BOOLEAN DEFAULT false,
ADD COLUMN     "isPaper" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lang" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN     "oracleId" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "priceUsdEtched" DECIMAL(10,2),
ADD COLUMN     "promoTypes" TEXT[],
ADD COLUMN     "releasedAt" TIMESTAMP(3),
ADD COLUMN     "setName" TEXT,
ADD COLUMN     "setType" TEXT;

-- CreateIndex
CREATE INDEX "MtgCard_oracleId_idx" ON "public"."MtgCard"("oracleId");

-- CreateIndex
CREATE INDEX "MtgCard_isPaper_lang_idx" ON "public"."MtgCard"("isPaper", "lang");

-- CreateIndex
CREATE INDEX "MtgCard_setCode_idx" ON "public"."MtgCard"("setCode");

-- CreateIndex
CREATE INDEX "MtgCard_name_idx" ON "public"."MtgCard"("name");
