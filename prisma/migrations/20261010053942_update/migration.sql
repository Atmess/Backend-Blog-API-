/*
  Warnings:

  - You are about to drop the `ShareLink` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `postId` to the `File` table without a default value. This is not possible if the table is not empty.
  - Added the required column `postId` to the `Folder` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ShareLink" DROP CONSTRAINT "ShareLink_folderId_fkey";

-- DropForeignKey
ALTER TABLE "ShareLink" DROP CONSTRAINT "ShareLink_userId_fkey";

-- AlterTable
ALTER TABLE "File" ADD COLUMN     "postId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Folder" ADD COLUMN     "postId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "ShareLink";

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
