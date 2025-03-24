# Standardized Path Structure for PSADT Pro UI

## Overview

This document outlines the standardized path structure for templates and packages in the PSADT Pro UI application.

## Path Structure

All templates and packages follow this standardized structure:

```
storage/templates/<user id>/<template type>/<package id>
```

Where:
- `<user id>` - The UUID of the user who owns the template/package
- `<template type>` - Either "Default" (for system templates) or "Custom" (for user-created templates)
- `<package id>` - The UUID of the template/package

## Environment Configuration

The base path for storage is defined by the `FILE_STORAGE_PATH` environment variable in `.env.local`. This should always be set to:

```
FILE_STORAGE_PATH="./storage/templates"
```

## Database Structure

Template records in the database should use the relative path (without the base storage path) in these fields:
- `extractionPath` - The path where files are extracted
- `metadata.storagePath` - The path stored in the metadata field
- `metadata.extractionStatus.path` - The path stored in the extraction status

## Path Handling in Code

When working with paths in code:

1. Get the base storage path from the environment variable:
   ```javascript
   const STORAGE_PATH = process.env.FILE_STORAGE_PATH || './storage/templates';
   ```

2. Construct full paths by joining the base path and the relative path:
   ```javascript
   const fullPath = path.join(STORAGE_PATH, template.extractionPath);
   ```

## Downloading Process

When downloading a new template:

1. Create the template record in the database with the correct path structure
2. Create the directory using the standardized path
3. Download files to that location
4. Update the extraction status when complete

## Versioning

Template versions should be stored in the `version` field of the database and metadata, not in the directory path. This keeps the path structure clean and consistent while still maintaining version information.

## Benefits

This standardized approach:
- Makes paths predictable and consistent
- Supports multi-user environments
- Keeps each user's content isolated
- Makes backup and recovery easier
- Simplifies template management
