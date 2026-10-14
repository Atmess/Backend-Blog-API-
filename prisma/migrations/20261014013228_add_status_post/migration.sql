-- CreateEnum
CREATE TYPE "PostSatus" AS ENUM ('GOOD', 'FLAGGED');

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "status" "PostSatus" NOT NULL DEFAULT 'GOOD';
