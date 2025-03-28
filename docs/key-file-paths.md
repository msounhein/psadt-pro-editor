# Key File Paths and Project Structure Summary

This document provides a quick reference to the locations of key features and configurations within the PSADT Pro Editor project.

## Core Application Structure (Next.js App Router)

-   **Frontend Routes:** `src/app/`
    -   **Main Editor:** `src/app/new-editor/`
        -   Entry Point: `src/app/new-editor/page.tsx`
        -   Context: `src/app/new-editor/contexts/EditorContext.tsx`
        -   UI Components: `src/app/new-editor/components/` (Sidebar, MainEditor)
        -   Editor Component: `src/app/new-editor/components/editor/CodeEditor.tsx`
    -   **Admin Pages:** `src/app/admin/`
    -   **Search UI:** `src/app/search/` (Likely uses `/api/psadt-qdrant/search`)
    -   **Template Management UI:** `src/app/templates/`, `src/app/default-template/`
-   **API Routes:** `src/app/api/`
    -   **Editor Completions:** `src/app/api/editor/completions/route.ts`
    -   **Template File Listing:** `src/app/api/templates/[templateId]/files/route.ts`
    -   **Template File Content (GET/POST):** `src/app/api/templates/[templateId]/files/content/route.ts`
    -   **General Template Ops (List/Create):** `src/app/api/templates/route.ts`
    -   **Qdrant Admin Search:** `/api/psadt-qdrant/search/route.ts` (Used by `/admin/qdrant` UI)
    -   **Other Qdrant Ops:** `/api/psadt-qdrant/`, `/api/qdrant/`
    -   **Auth:** `/api/auth/`
    -   **GitHub Integration:** `/api/github/`
-   **Middleware:** `src/middleware.ts` (Handles authentication checks)

## Libraries & Services (`src/lib/`)

-   **Qdrant DB Helper:** `src/lib/psadt-qdrant-db.ts` (Contains `hybridSearch`, `searchWithEmbedding`, `searchByCommandName`, etc.)
-   **Embedding Service:** `src/lib/embedding-service.ts` (Uses `@xenova/transformers`)
-   **Prisma Client:** `src/lib/prisma.ts`
-   **Authentication Config:** `src/lib/auth.ts`
-   **File System Utilities:** `src/lib/filesystem/`

## Components (`src/components/`)

-   **Reusable UI:** `src/components/ui/`
-   **Admin Components:** `src/components/Admin/` (e.g., `QdrantManager.tsx`)
-   *(Note: `src/components/ide/` was removed)*

## Configuration

-   **Package & Scripts:** `package.json`
-   **Next.js Config:** `next.config.ts`
-   **Environment Variables:**
    -   `.env` (Defaults, potentially committed)
    -   `.env.local` (Local overrides, secrets - **DO NOT COMMIT**)
    -   `.env.example` (Template for required variables)
-   **Tailwind CSS:** `tailwind.config.js`, `postcss.config.mjs`
-   **TypeScript:** `tsconfig.json`
-   **Prisma Schema:** `prisma/schema.prisma`

## Data & Storage

-   **Database File (SQLite Dev):** `prisma/dev.db` (or path specified in `DATABASE_URL`)
-   **Template Storage:** `storage/` (Structure: `storage/<userId>/Templates/Default/<templateId>/...`)
-   **Qdrant Model Cache:** `Qdrant/models/`

## Documentation & Planning

-   **Main Docs:** `docs/`
-   **Feature Docs:** `docs/features/` (e.g., `code-editor.md`)
-   **Planning/Status:** `docs/plan/` (e.g., `feature-status.md`)

## Scripts

-   **Utility/Maintenance:** `scripts/` (Contains JS and PS scripts for various tasks)
    -   **Qdrant Analysis:** `scripts/JS/analyze-qdrant-data/`
    -   **Completions API Test:** `scripts/JS/test-completions-api.js`