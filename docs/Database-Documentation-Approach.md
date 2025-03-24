# Database-Driven PSADT Documentation

## Overview

This document explains the database-driven approach for handling PSADT documentation in the Monaco editor. This approach provides better performance, version-specific handling, and easier maintenance compared to the previous file-based approach.

## Why a Database Approach?

1. **Performance**: Database lookups are significantly faster than parsing documentation files on demand, especially for large documentation sets.

2. **Version Support**: Using a database makes it easy to handle both PSADT v3 and v4 documentation, with mappings between equivalent commands.

3. **Structured Data**: The database provides a structured way to store and query commands, parameters, and their relationships.

4. **Reduced Server Load**: By pre-parsing documentation and storing it in a database, we reduce the server-side processing load.

5. **Caching**: The client-side API includes caching mechanisms to further improve performance.

## Components

The database-driven documentation system consists of the following components:

### 1. Database Layer

- **SQLite Database**: (Please use prisma) A lightweight, file-based database that stores commands, parameters, and mappings.
- **Database Schema**: Defined in `scripts/psadt-db-schema.sql`.
- **Database API**: A JavaScript module (`scripts/psadt-db.js`) that provides methods for interacting with the database.

### 2. Documentation Parser

- **Parser Script**: A Node.js script (`scripts/psadt-docs-parser.js`) that fetches documentation from GitHub, parses it, and stores it in the database.
- **PowerShell Wrapper**: A PowerShell script (`scripts/Update-PsadtDocumentation.ps1`) that makes it easy to run the parser and schedule updates.

### 3. Client-Side API

- **API Module**: A JavaScript module (`src/lib/psadt-docs-api.js`) that provides methods for the Monaco editor to access documentation.
- **API Cache**: In-memory caches for commands, parameters, and other frequently accessed data.

### 4. Server-Side API Route

- **API Route**: A Next.js API route (`src/app/api/psadt-docs/route.js`) that serves the documentation data to the client.

## How It Works

1. **Documentation Fetching**:
   - The documentation parser fetches documentation from GitHub for both PSADT v3 and v4.
   - It uses regular expressions and parsing logic to extract commands, parameters, examples, etc.

2. **Database Population**:
   - The parser stores the extracted data in the SQLite database.
   - It creates mappings between equivalent v3 and v4 commands and parameters.
   - It generates a JSON file for the Monaco editor to consume.

3. **Client-Side Access**:
   - When the Monaco editor loads, it requests documentation data from the API route.
   - The client-side API processes this data and provides methods for syntax highlighting, code completion, and linting.

4. **Version Detection**:
   - The API automatically detects whether a script is using PSADT v3 or v4 commands.
   - It provides version-specific suggestions and linting rules.

## Usage

### Initial Setup

1. Run the documentation parser to populate the database:

```powershell
.\scripts\Update-PsadtDocumentation.ps1 -ResetDatabase
```

2. This creates:
   - A SQLite database file in the `data` directory
   - A JSON file for the Monaco editor to consume
   - A report of the documentation update

### Regular Updates

To update the documentation (e.g., when PSADT releases new versions):

```powershell
.\scripts\Update-PsadtDocumentation.ps1 -ForceUpdate
```

### Scheduled Updates

To set up automatic daily updates:

```powershell
.\scripts\Update-PsadtDocumentation.ps1 -CreateTask
```

## Monaco Editor Integration

The database-driven documentation system integrates with the Monaco editor through:

1. **Syntax Highlighting**: Custom tokenizer rules based on the documentation data.
2. **Code Completion**: Command and parameter suggestions with documentation.
3. **Hover Information**: Documentation tooltips when hovering over commands and parameters.
4. **Diagnostics**: Linting rules for best practices and version compatibility.

## Future Enhancements

Potential future enhancements to the system include:

1. **Full-Text Search**: Adding full-text search capabilities to the database for better search functionality.
2. **User Annotations**: Allowing users to add their own notes to commands and parameters.
3. **Usage Analytics**: Tracking which commands and parameters are most frequently used.
4. **AI Integration**: Using machine learning to provide smarter suggestions and error detection.
5. **Offline Support**: Enabling the documentation system to work without an internet connection.
