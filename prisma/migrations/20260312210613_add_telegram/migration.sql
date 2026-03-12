-- AlterTable
ALTER TABLE "User" ADD COLUMN     "premium_expires_at" TIMESTAMPTZ(6),
ADD COLUMN     "telegram_chat_id" TEXT,
ADD COLUMN     "wallet_address" TEXT;
