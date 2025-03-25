# PSADT Pro Editor File Path Structure and API Reference

## URL Structure and Template Path Resolution

### Core Concepts

The PSADT Pro Editor uses a multi-layered approach to file management:

1. **Template Identification**: Templates are identified by unique UUIDs
2. **Storage Path Structure**: Files are physically stored in a nested directory structure
3. **Dynamic API Endpoints**: Content is loaded on-demand via RESTful API calls
4. **Path Resolution**: Various resolution strategies determine the actual file location

### URL Patterns

| URL Pattern | Purpose |
|-------------|---------|
| `/ide/[id]` | Main IDE interface for a specific template |
| `/new-editor` | Alternate editor with enhanced browsing capabilities |
| `/api/templates` | List all available templates |
| `/api/templates/[id]` | Get template metadata |
| `/api/templates/[id]/files` | List all files in a template (top-level) |
| `/api/templates/[id]/files/content?filepath=[path]` | Get content of a specific file or directory listing |

### Storage Path Structure

```
storage/
├── [userId]/
│   └── Templates/
│       └── [templateType]/
│           └── [templateId]/
│               ├── Assets/
│               ├── Config/
│               ├── Files/
│               ├── PSAppDeployToolkit/
│               ├── Strings/
│               │   ├── ar/
│               │   │   └── strings.psd1
│               │   ├── cz/
│               │   └── ...
│               └── ...
└── [templateId]/  (Legacy/direct access path)
```

## Path Resolution Process

### Database to Filesystem Mapping

1. **Template ID Lookup**: API receives a template ID (e.g., `fb50bc62-b088-40ce-ba28-1ad493e1349e`)
2. **Database Query**: The ID is used to lookup the template in the database
3. **Storage Path Extraction**: The system extracts the `storagePath` field from the template record
4. **Physical Path Resolution**: The storage path is resolved to an actual filesystem path:
   ```
   fcf7c63d-fdc8-4560-8bda-05baec752fac/Templates/Default/fb50bc62-b088-40ce-ba28-1ad493e1349e
   ```
   becomes
   ```
   C:\Users\msoun\Documents\psadt-pro-editor\storage\fcf7c63d-fdc8-4560-8bda-05baec752fac\Templates\Default\fb50bc62-b088-40ce-ba28-1ad493e1349e
   ```

### File Path Resolution Logic

The `FileSystemService.getTemplatePath()` method uses this resolution order:

1. Check if the path is absolute (starts with drive letter/root)
2. Check if the path contains "storage/" prefix
3. Check if the path follows the pattern `userId/Templates/templateType/templateId`
4. Check if the database has a `storagePath` field for this template
5. Check if the template metadata JSON contains a `storagePath` property
6. Fall back to direct storage lookup (`storage/templateId`)
7. Fall back to searching user directories for the template

## API Examples

### List All Template Files

```
GET /api/templates/fb50bc62-b088-40ce-ba28-1ad493e1349e/files
```

Response:
```json
{
  "files": [
    "Assets",
    "Config",
    "COPYING.Lesser",
    "Files",
    "Invoke-AppDeployToolkit.exe",
    "Invoke-AppDeployToolkit.ps1",
    "PSAppDeployToolkit",
    "PSAppDeployToolkit.Extensions",
    "Strings",
    "SupportFiles"
  ]
}
```

### Get Directory Contents

```
GET /api/templates/fb50bc62-b088-40ce-ba28-1ad493e1349e/files/content?filepath=Strings
```

Response:
```json
{
  "type": "directory",
  "path": "Strings",
  "items": [
    {
      "type": "directory",
      "name": "ar",
      "path": "Strings/ar",
      "size": 0,
      "createdAt": "2025-03-25T03:32:53.000Z",
      "modifiedAt": "2025-03-25T03:32:53.000Z"
    },
    {
      "type": "directory",
      "name": "cz",
      "path": "Strings/cz",
      "size": 0,
      "createdAt": "2025-03-25T03:32:53.000Z",
      "modifiedAt": "2025-03-25T03:32:53.000Z"
    },
    ...
  ]
}
```

### Get File Content

```
GET /api/templates/fb50bc62-b088-40ce-ba28-1ad493e1349e/files/content?filepath=Strings/ar/strings.psd1
```

Response:
```json
{
  "type": "file",
  "path": "Strings/ar/strings.psd1",
  "binary": false,
  "content": "@{\n    BalloonText = @{\n        Complete = \"تم التثبيت بنجاح [التطبيق]\" ...",
  "extension": ".psd1"
}
```

## Client-Side File Tree Processing

The editor uses a dynamic loading approach for directories:

1. Initial load fetches only top-level files and directories
2. When a folder is clicked:
   - `toggleFolder()` is called to expand/collapse visually
   - On first expansion, it checks if child items are already loaded
   - If not, it makes an API call to `/api/templates/[id]/files/content?filepath=[folderPath]`
   - The returned directory contents are added to the file tree
   - The UI is updated to show the new contents

This approach provides:
- Efficient loading (only loads what's needed)
- Support for deeply nested file structures
- Consistent path handling throughout the application

## Path Format Consistency

A key challenge was ensuring consistent path formats between:
1. **Database storage paths**: `userId/Templates/templateType/templateId`
2. **API request paths**: Relative paths like `Strings/ar/strings.psd1`
3. **Filesystem paths**: Absolute Windows paths with backslashes

The system handles these conversions automatically through path normalization functions.

## Recent Bug Fixes

Recent fixes to the file browser include:

1. Fixed the `FileSystemService` to prioritize database storage paths over direct path lookup
2. Implemented dynamic content loading in the `EditorContext` for nested directories
3. Created a proper recursive tree structure for the file browser component
4. Added on-demand loading of folder contents when expanding directories
5. Ensured consistent path handling across both the original and new editor interfaces

These changes allow the editor to properly navigate and display deeply nested folder structures, while maintaining backward compatibility with existing templates. 