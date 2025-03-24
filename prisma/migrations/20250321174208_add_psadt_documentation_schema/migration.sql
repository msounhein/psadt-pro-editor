-- CreateTable
CREATE TABLE "PsadtCommand" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "commandName" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "description" TEXT,
    "syntax" TEXT,
    "returnValue" TEXT,
    "notes" TEXT,
    "aliases" TEXT,
    "mappedCommandId" TEXT,
    "isDeprecated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "templateId" TEXT,
    CONSTRAINT "PsadtCommand_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PsadtParameter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "commandId" TEXT NOT NULL,
    "paramName" TEXT NOT NULL,
    "paramType" TEXT,
    "description" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "defaultValue" TEXT,
    "validationPattern" TEXT,
    "position" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PsadtParameter_commandId_fkey" FOREIGN KEY ("commandId") REFERENCES "PsadtCommand" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PsadtExample" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "commandId" TEXT NOT NULL,
    "title" TEXT,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PsadtExample_commandId_fkey" FOREIGN KEY ("commandId") REFERENCES "PsadtCommand" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PsadtDocumentationSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "lastUpdated" DATETIME,
    "lastParsed" DATETIME,
    "hash" TEXT,
    "status" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PsadtPattern" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL,
    "patternType" TEXT NOT NULL,
    "regexPattern" TEXT NOT NULL,
    "tokenName" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "PsadtCommand_commandName_version_idx" ON "PsadtCommand"("commandName", "version");

-- CreateIndex
CREATE INDEX "PsadtCommand_version_idx" ON "PsadtCommand"("version");

-- CreateIndex
CREATE UNIQUE INDEX "PsadtCommand_commandName_version_key" ON "PsadtCommand"("commandName", "version");

-- CreateIndex
CREATE INDEX "PsadtParameter_commandId_idx" ON "PsadtParameter"("commandId");

-- CreateIndex
CREATE INDEX "PsadtParameter_isCritical_idx" ON "PsadtParameter"("isCritical");

-- CreateIndex
CREATE UNIQUE INDEX "PsadtParameter_commandId_paramName_key" ON "PsadtParameter"("commandId", "paramName");

-- CreateIndex
CREATE INDEX "PsadtExample_commandId_idx" ON "PsadtExample"("commandId");

-- CreateIndex
CREATE INDEX "PsadtDocumentationSource_version_idx" ON "PsadtDocumentationSource"("version");

-- CreateIndex
CREATE UNIQUE INDEX "PsadtDocumentationSource_version_fileName_key" ON "PsadtDocumentationSource"("version", "fileName");

-- CreateIndex
CREATE INDEX "PsadtPattern_version_patternType_idx" ON "PsadtPattern"("version", "patternType");

-- CreateIndex
CREATE UNIQUE INDEX "PsadtPattern_version_patternType_regexPattern_key" ON "PsadtPattern"("version", "patternType", "regexPattern");
