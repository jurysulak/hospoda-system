-- EET 2.0: evidované tržby (platby a storna) a stav jejich odeslání.
CREATE TABLE IF NOT EXISTS "EetRecord" (
    "id" SERIAL NOT NULL,
    "paymentId" INTEGER,
    "kind" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "datTrzby" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "pok" TEXT,
    "test" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "lastAttemptAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EetRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EetRecord_status_idx" ON "EetRecord"("status");

DO $$ BEGIN
  ALTER TABLE "EetRecord" ADD CONSTRAINT "EetRecord_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
