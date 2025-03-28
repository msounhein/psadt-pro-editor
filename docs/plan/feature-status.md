# Feature Implementation Status

This document tracks the status of major features and potential next steps.

## Code Editor (`/new-editor`)

-   **Status:** Implemented & Functional
-   **Details:**
    -   Core editor UI with file tree and Monaco editor instance.
    -   File loading/saving via API routes (`/api/templates/[templateId]/files` and `/api/templates/[templateId]/files/content`).
    -   Path resolution correctly handles `storagePath` and `metadata.storagePath`.
    -   Obsolete `/ide` route removed.
-   **Documentation:** `docs/features/code-editor.md` updated.

## Code Completions (Qdrant)

-   **Status:** Basic Implementation Complete (Commands/Examples/Docs)
-   **Details:**
    -   API endpoint `/api/editor/completions` created.
    -   Frontend `CodeEditor.tsx` calls the API.
    -   Uses vector search (`searchWithEmbedding`) across `psadt_commands_v4`, `psadt_commands_v4_examples`, `psadt_commands_v4_docs`.
    -   Sorting prioritizes type, label match, and score.
    -   Keyword prefix matching via `hybridSearch` was problematic and is currently bypassed (using vector search only).
-   **Next Steps:**
    -   Investigate potential Qdrant indexing/data issues preventing effective keyword prefix matching in `hybridSearch`.
    -   Implement context-aware parameter completion (e.g., suggest parameters only after a command name is typed). This might require a separate API call or more sophisticated context parsing.

## Template Management

-   **Status:** Implemented (Based on README)
-   **Details:** Downloading, version tracking, local storage, database tracking.

## Search Functionality

-   **Status:** Implemented (Based on README & `/admin/qdrant`)
-   **Details:** Uses `/api/psadt-qdrant/search` with `hybridSearch`. Includes command and documentation search.