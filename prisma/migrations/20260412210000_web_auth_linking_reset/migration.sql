-- Web user ↔ billing (one-to-one) + account link + password reset
ALTER TABLE "web_users" ADD COLUMN IF NOT EXISTS "billing_account_id" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "web_users_billing_account_id_key" ON "web_users"("billing_account_id");

ALTER TABLE "web_users" DROP CONSTRAINT IF EXISTS "web_users_billing_account_id_fkey";
ALTER TABLE "web_users" ADD CONSTRAINT "web_users_billing_account_id_fkey" FOREIGN KEY ("billing_account_id") REFERENCES "billing_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "account_link_challenges" (
    "id" TEXT NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "web_user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_link_challenges_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "account_link_challenges_token_hash_key" ON "account_link_challenges"("token_hash");
CREATE INDEX IF NOT EXISTS "account_link_challenges_web_user_id_expires_at_idx" ON "account_link_challenges"("web_user_id", "expires_at");

ALTER TABLE "account_link_challenges" DROP CONSTRAINT IF EXISTS "account_link_challenges_web_user_id_fkey";
ALTER TABLE "account_link_challenges" ADD CONSTRAINT "account_link_challenges_web_user_id_fkey" FOREIGN KEY ("web_user_id") REFERENCES "web_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "web_user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");
CREATE INDEX IF NOT EXISTS "password_reset_tokens_web_user_id_created_at_idx" ON "password_reset_tokens"("web_user_id", "created_at");

ALTER TABLE "password_reset_tokens" DROP CONSTRAINT IF EXISTS "password_reset_tokens_web_user_id_fkey";
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_web_user_id_fkey" FOREIGN KEY ("web_user_id") REFERENCES "web_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
