-- Run on production DB if Sequelize migrations are not used:
--   psql -U <user> -d <database> -f add-fcm-token-to-users.sql

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "fcm_token" VARCHAR(512),
  ADD COLUMN IF NOT EXISTS "fcm_platform" VARCHAR(32);
