-- AlterTable
ALTER TABLE "Template" ADD COLUMN "extractionPath" TEXT;
ALTER TABLE "Template" ADD COLUMN "extractionStatus" TEXT DEFAULT 'pending';
ALTER TABLE "Template" ADD COLUMN "lastExtractionDate" DATETIME;
ALTER TABLE "Template" ADD COLUMN "storagePath" TEXT;
