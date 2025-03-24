# PSADT Pro UI - Editor Implementation Documentation

## Overview
The PSADT Pro UI provides a web-based IDE for editing PowerShell Application Deployment Toolkit (PSADT) scripts. The core component is a Monaco-based code editor that allows users to browse, view, and edit files within PSADT templates.

## Technology Stack

### Core Technologies
- **Next.js**: Framework for server-rendered React applications
- **TypeScript**: Type-safe JavaScript for better code quality
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Prisma**: Database ORM for SQLite data storage
- **File System Integration**: Using direct file system access in the server, with `storage` as the root directory

### Editor Components
- **Monaco Editor**: The code editing core (same engine as VS Code)
- **Direct DOM Manipulation**: Custom implementation to ensure proper content rendering
- **Lucide React**: Icon set for the UI elements
- **Hierarchical File Browser**: Tree-based file navigation with expandable directories

## Key Implementation Features

### File System Integration
- Templates are stored in the filesystem with a reference in the SQLite database
- Files are loaded via API endpoints that read directly from storage
- Metadata for templates is stored in JSON format
- Directory contents are loaded on-demand when directories are expanded

### Editor Implementation
- Monaco editor is initialized directly using its native API
- Intelligent file tree navigation with folder expansion and directory detection
- Syntax highlighting for PowerShell and other file types
- File content caching to preserve edits when switching between files
- Directory-aware navigation that distinguishes between files and folders

### API Routes
- `/api/templates/[id]/files`: Lists all files in a template
- `/api/templates/[id]/files/content`: Gets or updates file content, with special handling for directories
- `/api/templates`: Manages template metadata

## Current Limitations and Future Work

### Performance Improvements
- **Monaco Model Management**: Better cleanup of old models to prevent memory leaks
- **Content Caching**: More efficient content caching system
- **Lazy Loading**: Implement lazy loading for large files and the file tree

### Functionality Enhancements
- **File Creation/Deletion**: Add ability to create and delete files
- **Folder Operations**: Support for creating and managing folders
- **Drag-and-Drop**: Implement drag-and-drop for file organization
- **Search**: Add search functionality within files and across the template
- **Git Integration**: Version control for script changes

### UI/UX Improvements
- **Split Editor View**: Support for viewing multiple files side by side
- **Diff View**: Visual diff when comparing file versions
- **Tab Management**: Better handling of open files with tabs
- **Customizable UI**: Allow users to adjust themes and layout

### Error Handling
- **Improved Recovery**: Better recovery from network errors
- **Conflict Resolution**: Handle edit conflicts when multiple users edit same file
- **Automated Backup**: Backup file content before major changes

### Testing
- **Unit Tests**: Add comprehensive tests for editor functionality
- **Integration Tests**: Ensure proper API and frontend integration
- **Performance Testing**: Test with large files and templates

## Package Dependencies

### Production Dependencies
- `@monaco-editor/react`: React wrapper for Monaco Editor (partially used)
- `monaco-editor`: Core editor engine
- `react`, `react-dom`: React library for UI
- `next`: Next.js framework
- `@prisma/client`: Prisma ORM client
- `lucide-react`: Icon components
- `tailwindcss`: Utility CSS framework
- `classnames` or `clsx`: For conditional class names

### Development Dependencies
- `typescript`: TypeScript compiler
- `prisma`: Database ORM and migration tool
- `eslint`: Code linting
- `postcss`, `autoprefixer`: CSS processing

## Implementation Challenges

### Monaco Editor Integration
The current implementation faced challenges with the React wrapper for Monaco Editor, leading to a direct implementation using the Monaco API. This approach provides better control over the editor's behavior but requires more maintenance.

### Content Synchronization
Ensuring that file content is properly loaded and displayed required multiple approaches:
1. Direct model manipulation
2. Custom content synchronization
3. Forced re-rendering with unique keys
4. DOM manipulation as a fallback

### File Tree Navigation
The file tree implementation has been enhanced to:
1. Properly handle directories vs files
2. Expand/collapse directories in-place
3. Load directory contents dynamically
4. Provide visual cues for navigation with proper icons
5. Support nested directory structures

## Conclusion
The editor implementation has been improved to properly handle both files and directories. The system now correctly treats directories as expandable containers rather than attempting to open them as files. This enhancement provides a more intuitive file browsing experience similar to desktop IDEs.

Future work should focus on creating a more seamless editing experience while improving performance for larger templates and files. The foundation is solid, but additional features and optimizations will enhance the overall developer experience.
