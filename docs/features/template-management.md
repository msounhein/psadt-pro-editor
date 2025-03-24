# Template Management System

## Overview

The Template Management System in PSADT Pro UI provides a framework for creating, managing, and using PowerShell Application Deployment Toolkit (PSADT) templates. This document explains how templates work and the key components that make them function.

## Template Types

The system supports two main types of templates:

1. **Default Templates**: Read-only templates that come pre-packaged with the application. These cannot be modified directly but can be cloned to create custom templates.

2. **Custom Templates**: User-created templates that can be fully edited, either created from scratch or cloned from default templates.

## Core Components

### Database Schema

Templates are stored in the database with the following key properties:

- `id`: Unique identifier (UUID)
- `name`: Template name
- `type`: Either "Default" or "Custom"
- `packageType`: Type of package (e.g., "PowerShellAppDeploymentToolkit")
- `version`: Version number (e.g., "4.0.6")
- `description`: Optional description
- `storagePath`: Path to template files in the storage system
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

### File Storage

Templates are stored on the filesystem in the following structure:

```
storage/
├── [user-id]/
│   ├── Default/
│   │   └── [template-name]/
│   └── Custom/
│       └── [template-name]/
└── templates/
    └── [template-id]/
```

Each template contains a complete set of PSADT files and folders, following the standard PSADT structure:

```
[template-name]/
├── AppDeployToolkit/
│   ├── AppDeployToolkitMain.ps1
│   └── AppDeployToolkitExtensions.ps1
├── Files/
├── SupportFiles/
├── Deploy-Application.ps1
└── [other PSADT files]
```

### API Endpoints

The template system uses several key API endpoints:

- `GET /api/templates`: List all templates
- `GET /api/templates/[id]`: Get a specific template
- `POST /api/templates`: Create a new template
- `PUT /api/templates/[id]`: Update a template
- `DELETE /api/templates/[id]`: Delete a template
- `POST /api/templates/clone/[id]`: Clone a template
- `GET /api/templates/[id]/files`: List files in a template
- `GET /api/templates/[id]/files/content`: Get file content

### Filesystem Service

The `fileSystemService` provides key operations for working with template files:

- Reading file content
- Writing file changes
- Listing files in a template
- Creating directories and files
- Path handling between web and filesystem paths

## Key Features

### Template Cloning

The clone functionality allows users to create a custom copy of a default template. This process:

1. Reads the source template path
2. Creates a new target directory
3. Copies all files from source to target
4. Creates a new template record in the database

### Template Protection

Default templates are protected from edits through:

- UI-level restrictions (hiding edit buttons)
- API-level validations that check template type before allowing modifications
- Database constraints

### File Handling

The system handles:

- Text files: PowerShell scripts, configuration files, etc.
- Binary files: Executables, images, etc. (with special handling in the UI)
- Directory structures: Maintaining proper hierarchy in the file explorer

## Workflow

1. Users browse available templates (default and custom)
2. They can view details of any template
3. For default templates, users can clone them to create editable copies
4. For custom templates, users can edit properties or content
5. The Integrated Development Environment (IDE) allows editing template files
6. All changes are saved to both the database and the filesystem

## Implementation Notes

- The system uses path normalization to handle different operating systems (Windows vs. Unix paths)
- The frontend uses React with Next.js for the UI
- Templates are displayed with different UI elements depending on their type
- API endpoints perform permission checks before allowing operations