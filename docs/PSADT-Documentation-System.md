# PSADT Documentation System

## Overview

This document outlines the database-driven documentation system for PSADT, including file structures, implementation steps, and integration with the Monaco editor.

## Key File Structure

```
psadt-pro-ui/
├── data/                           # Database and generated files
│   ├── psadt-docs.sqlite           # SQLite database
│   ├── psadt-commands.json         # Generated JSON for client
│   └── psadt-sync-report.md        # Sync results report
├── scripts/
│   ├── psadt-db-schema.sql         # Database schema
│   ├── psadt-db.js                 # Database API module
│   ├── psadt-docs-parser.js        # Documentation parser
│   └── Update-PsadtDocumentation.ps1  # PowerShell updater
├── src/
│   ├── app/
│   │   └── api/
│   │       └── psadt-docs/
│   │           └── route.js        # API endpoint
│   ├── components/
│   │   └── ide/
│   │       ├── components/
│   │       │   ├── MonacoEditor.tsx  # Editor component
│   │       │   ├── PowerShellLinting.ts  # Linting module
│   │       │   └── ResizableFilePanel.tsx  # File panel
│   │       └── styles/
│   │           └── resizable-panel-styles.css  # Panel styles
│   └── lib/
│       └── psadt-docs-api.js       # Client-side API
└── docs/
    ├── PSADT-v3-v4-Migration.md    # Migration reference
    └── Database-Documentation-Approach.md  # Approach explanation
```

## Implementation Steps

1. **Create Directory Structure**
   ```bash
   mkdir -p data
   mkdir -p src/app/api/psadt-docs
   mkdir -p src/lib
   mkdir -p scripts
   ```

2. **Install Dependencies**
   ```bash
   npm install --save-dev sqlite3 node-fetch cheerio
   ```

3. **Database Initialization**
   - Create the SQLite database using the schema file
   ```bash
   sqlite3 data/psadt-docs.sqlite < scripts/psadt-db-schema.sql
   ```

4. **Run Documentation Parser**
   - Use PowerShell script to fetch and process documentation
   ```powershell
   .\scripts\Update-PsadtDocumentation.ps1 -ResetDatabase
   ```

5. **API Integration**
   - Ensure API endpoint is accessible at `/api/psadt-docs`
   - Verify JSON data is correctly generated in the data directory

6. **Monaco Editor Integration**
   - Update the MonacoEditor.tsx component to use the PSADT documentation API
   - Initialize the documentation API when the editor loads
   - Implement version detection, command completion, and linting

## Database Schema

The database schema includes the following key tables:

1. **commands** - Stores command information for both v3 and v4
   - id, command_name, version, syntax, description, examples, category
   - v3_equivalent_id, v4_equivalent_id (cross-version mapping)

2. **parameters** - Stores parameter information for commands
   - id, command_id, param_name, param_type, description
   - is_required, is_critical, default_value, position

3. **documentation_sources** - Tracks documentation sources
   - id, source_type, source_url, version, last_updated, hash

4. **sync_logs** - Logs documentation sync operations
   - id, source_id, sync_date, status, commands_added, commands_updated, etc.

## API Endpoints

1. **GET /api/psadt-docs**
   - Returns the complete documentation data for client-side use
   - Format: JSON containing commands, parameters, mappings, and critical params

## Client-Side API Methods

The `psadt-docs-api.js` module provides these key methods:

1. **initialize()** - Loads documentation data from the API
2. **detectVersion(scriptContent)** - Detects PSADT version from script
3. **getCommandCompletions(prefix, version)** - Gets command completion items
4. **getParameterCompletions(commandName, prefix, version)** - Gets parameter completions
5. **getCommandHover(commandName, version)** - Gets hover information for commands
6. **getParameterHover(paramName, commandName, version)** - Gets hover info for parameters
7. **getDiagnostics(scriptContent, version)** - Gets linting diagnostics
8. **getMonacoConfig(version)** - Gets Monaco editor syntax highlighting config

## Version Detection Logic

The system automatically detects whether a script is using PSADT v3 or v4 by:

1. Looking for v4-specific command patterns (with ADT prefix)
2. Checking for v3-specific imports or dot-sourcing patterns
3. Defaulting to v3 if unable to determine (since more common)

## Monaco Editor Integration

The Monaco editor integration involves:

1. Loading the documentation API when the editor initializes
2. Detecting the PSADT version from the script content
3. Configuring syntax highlighting based on version
4. Providing command and parameter completion
5. Adding hover documentation for commands and parameters
6. Implementing linting for best practices and version compatibility
