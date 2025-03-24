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
    "type" TEXT NOT NULL DEFAULT 'Custom',
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
