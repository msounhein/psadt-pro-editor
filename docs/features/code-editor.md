# Code Editor Implementation

## Overview

The PSADT Pro UI includes an integrated code editor for modifying template files. Built using Monaco Editor (the same editor that powers VS Code), it provides a powerful interface for editing PowerShell scripts and other files within templates.

## Core Components

### Monaco Editor Integration

The editor uses `@monaco-editor/react` for integrating the Monaco Editor into the React application. Key features include:

- Syntax highlighting for multiple languages
- Code completion
- Error checking
- Multiple themes
- Line numbers and gutter indicators

### File Explorer

The file explorer component allows users to:

- Navigate template file structure
- Expand/collapse directories
- Select files for editing
- See file types with appropriate icons

### Key Files

- `src/components/ide/simple-editor.tsx`: Main editor component
- `src/components/ide/components/MonacoEditor.tsx`: Monaco editor wrapper
- `src/components/ide/components/FileTree.tsx`: File explorer component
- `src/components/ide/components/utils.ts`: Utility functions for file operations
- `src/components/ide/components/ThemeSwitcher.tsx`: Editor theme selection

## Implementation Details

### File Loading

Files are loaded through these steps:

1. The component fetches a list of files from the API endpoint
2. The file list is processed to create a hierarchical structure
3. Directories are identified and properly formatted (with trailing slashes)
4. When a file is selected, its content is fetched from the API
5. Binary files are detected and handled differently from text files

### Directory Structure

The file explorer organizes files into a tree structure:

- The `organizeFiles` function in `utils.ts` transforms the flat file list into a hierarchical structure
- Directories are displayed with expand/collapse controls
- Files are displayed with icons based on their type

### User Interface Features

- Directory view: When selecting a directory, displays a folder icon
- Loading indicators: Shows loading spinners when fetching files or content
- Theme selection: Allows switching between light and dark editor themes
- Status indicators: Displays the currently selected file

### State Management

The editor uses React's state management to track:

- The list of files in the template
- The currently selected file
- The current content of the selected file
- Which directories are expanded or collapsed
- Loading states for various operations

### Performance Optimizations

Several optimizations are implemented:

- `useCallback` for event handlers to prevent unnecessary re-renders
- Reference tracking to avoid infinite update loops
- Separating file fetching from file selection logic
- Proper dependency arrays in `useEffect` hooks
- Controlled re-rendering to avoid visual flickering

### Directory Collapse Behavior

By default, all directories start collapsed. Users can click on directories to expand them and view their contents. This behavior is controlled by:

- The `expandedFolders` state set, which tracks which directories are expanded
- The `handleFolderToggle` function that toggles expansion state
- Default initialization with an empty set to ensure all folders start collapsed

## Usage

The IDE is typically accessed through:

1. Template detail page → "Open in IDE" button
2. Direct URL access: `/ide/[template-id]`

When opened, the IDE:

1. Loads the template information
2. Fetches the list of files
3. Organizes them into a hierarchical structure
4. Displays the file tree with all directories collapsed
5. Auto-selects the first file for editing (if available)

## Technical Notes

- The editor supports multiple file types with appropriate syntax highlighting
- PowerShell files receive special treatment with dedicated syntax highlighting
- The editor handles file path differences between web URLs and filesystem paths
- File content is loaded on-demand to improve performance with large templates

This implementation provides a robust editing experience similar to dedicated code editors while maintaining full integration with the template management system.