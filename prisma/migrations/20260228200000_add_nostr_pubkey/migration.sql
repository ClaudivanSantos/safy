-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "nostr_pubkey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_nostr_pubkey_key" ON "User"("nostr_pubkey");
