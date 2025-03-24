# Database-Driven PSADT Documentation Implementation

## Overview

This document describes the implementation of the database-driven approach for handling PSADT documentation in the Monaco editor. The original approach outlined in the "Database-Documentation-Approach.md" file has been successfully implemented with some modifications to work with the Prisma database system.

## Implementation Details

### Database System

Instead of using a separate SQLite database as initially planned, we integrated the PSADT documentation directly into the application's Prisma database. This offers several advantages:

1. **Unified Data Access**: All application data, including PSADT documentation, is accessed through a single database system
2. **Transaction Support**: Prisma provides better transaction support for database operations
3. **Type Safety**: Prisma's strong typing helps prevent errors when working with the database
4. **Simplified Schema Management**: Using Prisma's migration system to manage schema changes

### Schema Structure

The implemented schema includes the following models:

```prisma
model PsadtCommand {
  id              String            @id @default(uuid())
  commandName     String
  version         Int               // 3 or 4
  description     String?
  syntax          String?
  returnValue     String?
  notes           String?
  aliases         String?
  mappedCommandId String?           // Reference to the equivalent command in the other version
  isDeprecated    Boolean           @default(false)
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  parameters      PsadtParameter[]
  examples        PsadtExample[]
  templateId      String?           // Which template this command belongs to
  template        Template?         @relation(fields: [templateId], references: [id])

  @@unique([commandName, version])
  @@index([commandName, version])
  @@index([version])
}

model PsadtParameter {
  id                String        @id @default(uuid())
  commandId         String
  paramName         String
  paramType         String?
  description       String?
  isRequired        Boolean       @default(false)
  isCritical        Boolean       @default(false)
  defaultValue      String?
  validationPattern String?
  position          Int?
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
  command           PsadtCommand  @relation(fields: [commandId], references: [id], onDelete: Cascade)

  @@unique([commandId, paramName])
  @@index([commandId])
  @@index([isCritical])
}

model PsadtExample {
  id          String       @id @default(uuid())
  commandId   String
  title       String?
  code        String
  description String?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  command     PsadtCommand @relation(fields: [commandId], references: [id], onDelete: Cascade)

  @@index([commandId])
}

model PsadtDocumentationSource {
  id          String   @id @default(uuid())
  version     Int      // 3 or 4
  sourceUrl   String
  fileName    String
  lastUpdated DateTime?
  lastParsed  DateTime?
  hash        String?   // To detect changes
  status      String?   // 'success', 'error', etc.
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([version, fileName])
  @@index([version])
}

model PsadtPattern {
  id            String   @id @default(uuid())
  version       Int      // 3 or 4
  patternType   String   // 'command', 'parameter', 'critical_parameter', etc.
  regexPattern  String
  tokenName     String   // The token name for Monaco editor
  priority      Int      @default(0) // Higher numbers get evaluated first
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([version, patternType, regexPattern])
  @@index([version, patternType])
}
```

### Relation to Templates

A key modification from the original design is the relation between PSADT Commands and Templates:

```prisma
model Template {
  // ... existing fields
  commands           PsadtCommand[]
}
```

This allows:
1. Commands to be associated with specific templates
2. Templates to have their own set of commands
3. Documentation templates to serve as containers for commands

### Data Population

The data population process involves:

1. **Template Creation**: Creating documentation templates for PSADT v3 and v4
2. **Command Population**: Populating commands with descriptions, syntax, and examples
3. **Parameter Association**: Creating parameters for each command
4. **Version Mapping**: Establishing relationships between v3 and v4 equivalent commands
5. **Pattern Definition**: Creating regex patterns for syntax highlighting

### Monaco Editor Integration

The Monaco editor integration has been updated to:

1. **Use Prisma Data**: Query the Prisma database for PSADT documentation
2. **Detect Versions**: Automatically detect whether a script is using v3 or v4 commands
3. **Provide Suggestions**: Offer autocomplete suggestions based on the detected version
4. **Show Documentation**: Display hover information from the database
5. **Apply Linting**: Use database-defined patterns for linting

## How It Works

1. **Documentation Storage**:
   - PSADT command documentation is stored in the Prisma database
   - Commands are linked to specific templates
   - Version-specific information is tracked

2. **Client-Side Access**:
   - Documentation is loaded when the editor initializes
   - The client-side API detects the PSADT version being used
   - Commands, parameters, and examples are provided based on the detected version

3. **Editor Features**:
   - Syntax highlighting uses regex patterns from the database
   - Autocomplete suggests commands and parameters with documentation
   - Hover information displays command documentation and examples
   - Linting identifies potential issues and suggests improvements

## Future Enhancements

1. **Real-Time Updates**: Implementing real-time updates to documentation as new versions are released
2. **User Annotations**: Allowing users to add their own notes to commands and parameters
3. **Integration with GitHub**: Automatically syncing with the latest PSADT documentation from GitHub
4. **AI-Assisted Features**: Using machine learning to provide smarter suggestions and error detection
