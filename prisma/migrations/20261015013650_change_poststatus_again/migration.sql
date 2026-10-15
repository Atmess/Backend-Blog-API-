/*
  Warnings:

  - The values [PUBLISHED,DRAFTS] on the enum `PostSatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PostSatus_new" AS ENUM ('GOOD', 'FLAGGED');
ALTER TABLE "public"."Post" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Post" ALTER COLUMN "status" TYPE "PostSatus_new" USING ("status"::text::"PostSatus_new");
ALTER TYPE "PostSatus" RENAME TO "PostSatus_old";
ALTER TYPE "PostSatus_new" RENAME TO "PostSatus";
DROP TYPE "public"."PostSatus_old";
ALTER TABLE "Post" ALTER COLUMN "status" SET DEFAULT 'GOOD';
COMMIT;

-- AlterTable
ALTER TABLE "Post" ALTER COLUMN "status" SET DEFAULT 'GOOD';
