# Code Editor (New Implementation)

## Overview

The PSADT Pro UI includes an integrated code editor, accessible via the `/new-editor` route, for viewing and modifying template files. Built using Monaco Editor (the same editor that powers VS Code), it provides a powerful interface for editing PowerShell scripts and other files within templates, managed through a context-based state system.

## Core Components

The `/new-editor` feature is structured around the following key components:

-   **Route Entry Point:** `src/app/new-editor/page.tsx`
    -   Sets up the main layout and wraps components in the `EditorProvider`.
-   **State Management:** `src/app/new-editor/contexts/EditorContext.tsx`
    -   Provides context (`EditorContext`) for managing editor state, including selected templates, file lists, file content, loading status, and errors.
    -   Handles fetching templates, file lists, and file content via API calls.
-   **UI Components:**
    -   `src/app/new-editor/components/Sidebar.tsx`: Displays the list of templates and the file tree for the selected template. Uses `EditorContext` to get data and trigger actions (like selecting a template or file).
    -   `src/app/new-editor/components/MainEditor.tsx`: Displays the header (showing selected template/file) and renders the actual code editor component. Consumes `EditorContext` for state.
    -   `src/app/new-editor/components/editor/CodeEditor.tsx`: (Assumed location) The wrapper component around the Monaco Editor instance, responsible for displaying `fileContent` from the context and handling editor-specific configurations.

## State Management (`EditorContext`)

The `EditorContext` is central to the editor's functionality:

-   **`templates` / `selectedTemplateId`:** Manages the list of available templates and which one is currently selected. Templates are loaded via `/api/templates`.
-   **`files` / `currentFile`:** Holds the list of files for the selected template and the path of the currently open file. The file list is loaded via `/api/templates/[templateId]/files`.
-   **`fileContent`:** Stores the content of the `currentFile`. Content is loaded via `/api/templates/[templateId]/files/content?filepath=[...]`.
-   **`expandedFolders`:** Tracks the expansion state of directories in the file tree.
-   **`isLoading` / `error`:** Provides UI feedback during asynchronous operations.

## File Loading Workflow

1.  **Template Loading:** `EditorContext` fetches all user templates from `/api/templates` on initial load. The first valid template is usually selected automatically.
2.  **File List Loading:** When `selectedTemplateId` changes, `EditorContext` fetches the file list for that template from `/api/templates/[templateId]/files`.
    -   The API route (`.../files/route.ts`) reads the template's `storagePath` (or `metadata.storagePath`) from the database, resolves the absolute path (prepending `storage/`), and recursively lists files within that directory.
3.  **File Content Loading:** When `currentFile` changes (and it's not a directory), `EditorContext` fetches its content from `/api/templates/[templateId]/files/content?filepath=[...]`.
    -   The API route (`.../files/content/route.ts`) reads the template's path, resolves the absolute path, reads the file content (handling binary vs. text), and returns it. If the path doesn't exist, it returns a 404.
4.  **Display:** The `CodeEditor` component receives the `fileContent` from the context and displays it.

## Editor Component (`CodeEditor`)

-   Likely located at `src/app/new-editor/components/editor/CodeEditor.tsx`.
-   Uses `@monaco-editor/react` to render the editor.
-   Receives `fileContent` and potentially `language` information from `EditorContext` (or determines language based on `currentFile`).
-   May include features like theme switching, syntax highlighting configuration, and potentially code completion integration in the future.

## API Endpoints

The editor relies on the following backend API routes:

-   **`GET /api/templates`:** Lists available templates for the user.
    -   Handler: `src/app/api/templates/route.ts`
-   **`GET /api/templates/[templateId]/files`:** Lists files within a specific template's storage directory.
    -   Handler: `src/app/api/templates/[templateId]/files/route.ts`
-   **`GET /api/templates/[templateId]/files/content?filepath=[...]`:** Gets the content of a specific file or lists items in a directory within a template.
    -   Handler: `src/app/api/templates/[templateId]/files/content/route.ts`

These routes fetch the template's base path (`storagePath` or `metadata.storagePath`) from the database and interact with the file system located under the project's `storage/` directory.