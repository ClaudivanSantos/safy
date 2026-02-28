-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "key_hash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_key_hash_key" ON "User"("key_hash");
