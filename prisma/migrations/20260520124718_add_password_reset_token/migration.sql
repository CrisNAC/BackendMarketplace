-- AlterTable
ALTER TABLE "Users" ADD COLUMN     "password_reset_token" VARCHAR(255),
ADD COLUMN     "password_reset_token_expires" TIMESTAMPTZ;
