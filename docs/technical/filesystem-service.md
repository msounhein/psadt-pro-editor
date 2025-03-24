# Filesystem Service

## Overview

The Filesystem Service is a core component of PSADT Pro UI that provides a bridge between the application and the underlying file system. It handles operations such as reading, writing, and managing template files on disk.

## Responsibilities

- Managing file paths and ensuring proper access
- Reading and writing template files
- Listing directory contents
- Creating and deleting files and directories
- Normalizing paths between web and filesystem formats
- Handling binary vs. text files appropriately

## Implementation

The service is implemented in `src/lib/filesystem/filesystem-service.ts` and provides a comprehensive set of methods for file operations:

```typescript
class FileSystemService {
  // Core path and file methods
  private getTemplatePath(templateId: string): string
  private normalizePath(filePath: string): string
  
  // File operations
  async readFile(templateId: string, relativePath: string): Promise<Uint8Array>
  async readTextFile(templateId: string, relativePath: string): Promise<string>
  async writeFile(templateId: string, relativePath: string, content: Uint8Array): Promise<void>
  async writeTextFile(templateId: string, relativePath: string, content: string): Promise<void>
  
  // Directory operations
  async createDirectory(templateId: string, relativePath: string): Promise<void>
  async readDirectory(templateId: string, relativePath: string = ''): Promise<FileStat[]>
  
  // File management
  async delete(templateId: string, relativePath: string, options?: { recursive?: boolean }): Promise<void>
  async rename(templateId: string, sourcePath: string, targetPath: string): Promise<void>
  async copy(templateId: string, sourcePath: string, targetPath: string): Promise<void>
  async exists(templateId: string, relativePath: string): Promise<boolean>
  async stat(templateId: string, relativePath: string): Promise<FileStat>
  
  // Advanced operations
  async watchFiles(templateId: string, relativePath: string, recursive: boolean = true): Promise<FSWatcher>
  async searchFiles(templateId: string, query: string): Promise<string[]>
}
```

## Path Handling

The service is responsible for resolving template paths:

1. It accepts template IDs or full storage paths
2. It resolves these to actual filesystem paths
3. It handles normalization between Windows and Unix-style paths
4. It maintains a consistent path structure throughout the application

## Server Actions

The filesystem service is called by server actions defined in `src/lib/filesystem/file-actions.ts`, which provide the interface between the frontend and the filesystem:

- `createPowerShellScriptAction`: Creates a new PowerShell script
- `listFilesAction`: Lists files in a template directory
- `readFileAction`: Reads a file from a template
- `writeFileAction`: Writes content to a file

## Error Handling

The service implements robust error handling:

- All operations are wrapped in try/catch blocks
- Errors are properly logged and propagated
- Missing directories are created when needed
- Path existence is verified before operations

## Path Normalization

A key responsibility is normalizing paths between web and filesystem formats:

```typescript
// Web path: folder/subfolder/file.txt (forward slashes)
// Windows path: folder\subfolder\file.txt (backslashes)

// The normalizePath function handles this conversion:
private normalizePath(filePath: string): string {
  if (process.platform === 'win32') {
    return filePath.replace(/\//g, '\\');
  }
  return filePath;
}
```

## Usage Example

```typescript
// Reading a file
const content = await fileSystemService.readTextFile(
  'template-123', 
  'Deploy-Application.ps1'
);

// Writing to a file
await fileSystemService.writeTextFile(
  'template-123',
  'Deploy-Application.ps1',
  '# Updated content'
);

// Listing files
const files = await fileSystemService.readDirectory(
  'template-123'
);
```

## Security Considerations

The service implements several security measures:

- Path validation to prevent directory traversal attacks
- Permission checks before file operations
- Proper error handling to prevent information leakage
- Isolation of template directories