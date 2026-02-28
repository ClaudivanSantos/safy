-- AlterTable: Add auth_id, email; make telegram_id and username optional
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "auth_id" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "User" ALTER COLUMN "telegram_id" DROP NOT NULL;
ALTER TABLE "User" ALTER COLUMN "username" DROP NOT NULL;
ALTER TABLE "User" ALTER COLUMN "username" SET DEFAULT '';
CREATE UNIQUE INDEX IF NOT EXISTS "User_auth_id_key" ON "User"("auth_id");
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
