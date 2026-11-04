/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `categories` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");
