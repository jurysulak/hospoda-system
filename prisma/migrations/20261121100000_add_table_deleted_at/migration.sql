-- Smazaný stůl s historií plateb se jen skryje (platby a EET záznamy zůstanou).
ALTER TABLE "Table" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
