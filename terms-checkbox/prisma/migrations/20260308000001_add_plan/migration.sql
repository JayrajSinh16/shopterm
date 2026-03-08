-- AlterTable: add plan column to AppSettings
ALTER TABLE "AppSettings" ADD COLUMN "plan" TEXT NOT NULL DEFAULT 'free';
