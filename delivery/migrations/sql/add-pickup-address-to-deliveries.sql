-- Run on production DB:
--   psql -U <user> -d <database> -f add-pickup-address-to-deliveries.sql

ALTER TABLE "deliveries"
  ADD COLUMN IF NOT EXISTS "pickup_address" VARCHAR(255);

COMMENT ON COLUMN "deliveries"."pickup_address" IS 'Очиж авах хаяг (pickup address from partner)';
