-- CreateTable
CREATE TABLE "Purchase" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "currency" TEXT NOT NULL,
    "preco" DOUBLE PRECISION NOT NULL,
    "quantidade" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Purchase_user_id_idx" ON "Purchase"("user_id");

-- CreateIndex
CREATE INDEX "Purchase_user_id_currency_idx" ON "Purchase"("user_id", "currency");

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
