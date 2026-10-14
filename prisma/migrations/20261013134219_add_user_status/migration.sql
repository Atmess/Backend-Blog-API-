-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'FLAGGED', 'BANNED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';
