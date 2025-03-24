# PSADT Pro UI Scripts

This directory contains various utility scripts for managing and maintaining the PSADT Pro UI application. 

## Quick Help

All PowerShell scripts support a `-Usage` parameter that displays common usage examples:

```powershell
# Display usage examples for troubleshooting
./scripts/troubleshoot.ps1 -Usage

# Display usage examples for database management
./scripts/db-manager.ps1 -Usage
```

## Consolidated Scripts

These scripts have been created to consolidate multiple related functionalities:

### `template-management.js`

Consolidated script for template operations (replacing individual scripts like `check-template.js`, `list-templates.js`, etc.).

```powershell
# List all templates
node scripts/template-management.js list

# Check a specific template
node scripts/template-management.js check <templateId>

# Create a new template
node scripts/template-management.js create --userId <id> --name <n> --version <version> --type <Default|Custom>

# Update template extraction status
node scripts/template-management.js update <templateId> --userId <id> --status <status>

# Clone a template (creates a Custom template from any template)
node scripts/template-management.js clone <templateId> --userId <id> --name <newName>
```

### `troubleshoot.ps1`

Consolidated troubleshooting and maintenance script that combines functionality from several scripts.

```powershell
# Run diagnostics only (no changes)
./scripts/troubleshoot.ps1

# Fix all detected issues automatically
./scripts/troubleshoot.ps1 -Action fix-all

# Fix specific issues
./scripts/troubleshoot.ps1 -Action fix-webpack
./scripts/troubleshoot.ps1 -Action fix-nextjs
./scripts/troubleshoot.ps1 -Action clean
./scripts/troubleshoot.ps1 -Action kill-node
./scripts/troubleshoot.ps1 -Action maintenance
```

### `db-manager.ps1`

Consolidated database management script that combines setup, reset, and maintenance functions.

```powershell
# Setup a new database
./scripts/db-manager.ps1 -Action setup

# Reset the database
./scripts/db-manager.ps1 -Action reset

# Launch Prisma Studio
./scripts/db-manager.ps1 -Action studio

# Run Prisma migrations
./scripts/db-manager.ps1 -Action migrate

# Generate Prisma client
./scripts/db-manager.ps1 -Action generate

# Kill Node processes and reset database
./scripts/db-manager.ps1 -Action cleanup
```

## Database Management Scripts

### `setup-sqlite.ps1`

Sets up the SQLite database for development.

```powershell
./scripts/setup-sqlite.ps1
```

### `db-cleanup.ps1`

Cleans up the database by killing Node processes and resetting the database.

```powershell
./scripts/db-cleanup.ps1
```

### `launch-prisma-studio.ps1`

Launches Prisma Studio for database visualization and management.

```powershell
./scripts/launch-prisma-studio.ps1
```

## Template Management Scripts

### `update-extraction-status.ps1`

Manually updates the extraction status for a template.

```powershell
./scripts/update-extraction-status.ps1 -templateId <id> -userId <id> -templateName <n> -version <ver> [-status <status>]
```

### `check-templates.ps1`

Checks all templates in the database and validates their extraction status.

```powershell
./scripts/check-templates.ps1
```

### `clone-template-files.ps1`

PowerShell script for copying template files during cloning operations.

```powershell
# Clone template files and update status
./scripts/clone-template-files.ps1 -sourceTemplateId <id> -targetTemplateId <id> -UpdateStatus

# Clone template files without updating status
./scripts/clone-template-files.ps1 -sourceTemplateId <id> -targetTemplateId <id>
```

### `migrate-template-type-field.ps1`

Script to add the template type field to the database.

```powershell
# Dry run (check only)
./scripts/migrate-template-type-field.ps1

# Execute migration
./scripts/migrate-template-type-field.ps1 -Execute
```

### `migrate-template-types.js`

Script to update existing templates with the appropriate type (Default or Custom).

```powershell
# Dry run
node scripts/migrate-template-types.js --dry-run

# Execute
node scripts/migrate-template-types.js
```

## System Management Scripts

### `clean-build.ps1`

Cleans build artifacts and cached files.

```powershell
./scripts/clean-build.ps1
```

### `kill-node.ps1`

Kills all Node.js processes that might be locking files.

```powershell
./scripts/kill-node.ps1
```

### `rebuild.ps1`

Performs a complete rebuild of the application.

```powershell
./scripts/rebuild.ps1
```

### `setup.ps1`

Complete setup script for PSADT Pro UI, setting up directories, database, and demo user.

```powershell
./scripts/setup.ps1
```

## Legacy/Individual Scripts

These scripts still exist but their functionality has been consolidated:

- `check-template.js` - Check a specific template by ID (use `template-management.js check` instead)
- `list-templates.js` - List all templates (use `template-management.js list` instead)
- `create-template.js` - Create a new template (use `template-management.js create` instead)
- `update-db-directly.js` - Update database directly (use appropriate consolidated script instead)
- `fix-nextjs.ps1` - Fix Next.js cache (use `troubleshoot.ps1 -Action fix-nextjs` instead)
- `fix-webpack-cache.ps1` - Fix Webpack cache (use `troubleshoot.ps1 -Action fix-webpack` instead)
- `maintenance.ps1` - Perform routine maintenance (use `troubleshoot.ps1 -Action maintenance` instead)
- `diagnose.ps1` - Run diagnostics (use `troubleshoot.ps1` instead)
- `setup-sqlite.ps1` - Setup SQLite database (use `db-manager.ps1 -Action setup` instead)
- `db-cleanup.ps1` - Clean database (use `db-manager.ps1 -Action cleanup` instead)
- `launch-prisma-studio.ps1` - Launch Prisma Studio (use `db-manager.ps1 -Action studio` instead)

## Miscellaneous Scripts

### `fetch-documentation.ps1`

Fetches updated documentation from GitHub.

```powershell
./scripts/fetch-documentation.ps1
```

### `common.ps1`

Contains common utility functions used by other PowerShell scripts. This script is not meant to be run directly but is imported by other scripts.

## Script Categories

1. **Setup & Installation**
   - `setup.ps1`
   - `db-manager.ps1` (with `-Action setup` parameter)

2. **Database Management**
   - `db-manager.ps1` (consolidated database operations)
   - `migrate-template-type-field.ps1` (database schema updates)

3. **Template Management**
   - `template-management.js` (consolidated template operations)
   - `update-extraction-status.ps1`
   - `check-templates.ps1`
   - `clone-template-files.ps1` (file operations for template cloning)
   - `migrate-template-types.js` (template data migration)

4. **Troubleshooting & Maintenance**
   - `troubleshoot.ps1` (consolidated troubleshooting operations)
   - `clean-build.ps1`
   - `kill-node.ps1`
   - `rebuild.ps1`

5. **Documentation**
   - `fetch-documentation.ps1`

## Best Practices

1. Always run PowerShell scripts from the project root directory
2. Use the consolidated scripts whenever possible
3. Check the output of `troubleshoot.ps1` before applying fixes
4. For database operations, ensure no Node.js processes are locking the database files
5. When cloning templates, make sure to use the proper template type (Default or Custom)
6. Default templates should not be modified directly; use cloning instead
