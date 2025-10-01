-- DropIndex
DROP INDEX "public"."SearchIndex_keywords_trgm";

-- DropIndex
DROP INDEX "public"."SearchIndex_setCode_idx";

-- DropIndex
DROP INDEX "public"."SearchIndex_title_trgm";

-- AlterTable
ALTER TABLE "public"."SearchIndex" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- RenameIndex
ALTER INDEX "public"."SearchIndex_game_lang_paper_idx" RENAME TO "SearchIndex_game_lang_isPaper_idx";
