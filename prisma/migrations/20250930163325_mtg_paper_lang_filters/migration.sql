/*
  Warnings:

  - Made the column `set_name` on table `Set` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "public"."idx_set_pk";

-- AlterTable
ALTER TABLE "public"."Set" ALTER COLUMN "set_name" SET NOT NULL,
ALTER COLUMN "released_at" SET DATA TYPE TIMESTAMP(3);

-- RenameForeignKey
ALTER TABLE "public"."MtgCard" RENAME CONSTRAINT "fk_mtgcard_set" TO "MtgCard_setCode_fkey";
