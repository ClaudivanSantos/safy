/*
  Warnings:

  - A unique constraint covering the columns `[nome]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Made the column `username` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "password_hash" TEXT,
ALTER COLUMN "username" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_nome_key" ON "User"("nome");
