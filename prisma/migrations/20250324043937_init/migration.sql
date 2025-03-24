/*
  Warnings:

  - You are about to drop the `PsadtCommand` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PsadtDocumentationSource` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PsadtExample` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PsadtParameter` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PsadtPattern` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `type` on the `Template` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "PsadtCommand_commandName_version_key";

-- DropIndex
DROP INDEX "PsadtCommand_version_idx";

-- DropIndex
DROP INDEX "PsadtCommand_commandName_version_idx";

-- DropIndex
DROP INDEX "PsadtDocumentationSource_version_fileName_key";

-- DropIndex
DROP INDEX "PsadtDocumentationSource_version_idx";

-- DropIndex
DROP INDEX "PsadtExample_commandId_idx";

-- DropIndex
DROP INDEX "PsadtParameter_commandId_paramName_key";

-- DropIndex
DROP INDEX "PsadtParameter_isCritical_idx";

-- DropIndex
DROP INDEX "PsadtParameter_commandId_idx";

-- DropIndex
DROP INDEX "PsadtPattern_version_patternType_regexPattern_key";

-- DropIndex
DROP INDEX "PsadtPattern_version_patternType_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "PsadtCommand";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "PsadtDocumentationSource";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "PsadtExample";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "PsadtParameter";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "PsadtPattern";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Template" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "packageType" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "metadata" TEXT,
    "version" TEXT,
    "storagePath" TEXT,
    "extractionStatus" TEXT DEFAULT 'pending',
    "extractionPath" TEXT,
    "lastExtractionDate" DATETIME,
    CONSTRAINT "Template_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Template" ("createdAt", "description", "extractionPath", "extractionStatus", "id", "isDefault", "isPublic", "lastExtractionDate", "metadata", "name", "packageType", "storagePath", "updatedAt", "userId", "version") SELECT "createdAt", "description", "extractionPath", "extractionStatus", "id", "isDefault", "isPublic", "lastExtractionDate", "metadata", "name", "packageType", "storagePath", "updatedAt", "userId", "version" FROM "Template";
DROP TABLE "Template";
ALTER TABLE "new_Template" RENAME TO "Template";
CREATE INDEX "Template_userId_idx" ON "Template"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
