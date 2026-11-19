-- Storno platby: platba zůstává v historii, jen se označí časem storna.
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);
