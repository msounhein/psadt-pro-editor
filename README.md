# PSADT Pro Editor

A modern web interface for creating and managing PowerShell App Deployment Toolkit (PSADT) packages.

## Features

- **Template Management**: Create, store, and reuse deployment templates
- **Package Type Selection**: Choose from MSI, EXE, ZIP, or Script packages
- **Parameter Configuration**: Easily configure installation parameters
- **PSADT Function Library**: Access over 30+ PSADT functions with examples
- **User Authentication**: Secure login and user management
- **Dark/Light Mode**: Support for different color themes
- **Responsive Design**: Works on desktop and mobile devices
- **Direct GitHub Integration**: Download official PSADT templates directly from the official repository
- **ZIP File Support**: Download and extract PSADT templates in ZIP format
- **Local Storage**: Templates and packages stored locally for easy access
- **Database Persistence**: Track templates and their associated metadata
- **Fallback Mechanism**: Graceful handling when database operations fail
- **Version Tracking**: Display and track PSADT versions for all templates
- **Search**: Search commands, examples, and documentation using semantic search
- **Documentation**: Browse and search PSADT documentation
- **Code Editor**: Edit deployment scripts with syntax highlighting and auto-completion

## Recent Updates

### Search Functionality Fixes

- **Command Name Display**: Fixed issues with command names not displaying properly in search results
- **Collection Selection**: Implemented automatic validation to ensure v4 collections are prioritized
- **Collection Fallback**: Added fallback mechanism to upgrade older collections to v4 equivalents
- **Result Transformation**: Improved data extraction from Qdrant search results to ensure proper display

The search functionality now properly handles results from different collections and correctly displays command names, descriptions, and syntax information.

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **UI Components**: Radix UI, Lucide Icons
- **Authentication**: NextAuth.js
- **Database**: Prisma ORM with SQLite (local dev) / PostgreSQL (production)
- **State Management**: Zustand
- **API**: RESTful API endpoints
- **GitHub Integration**: Fetch templates directly from the official PSADT repository
- **File Handling**: Local file system storage for templates and packages

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher

### Installation

1. Download or clone the repository and navigate to the project directory:
   ```bash
   cd psadt-pro-editor
   ```

2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

4. Initialize SQLite database:
   ```bash
   npm run db:sqlite
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development Mode

The application is currently configured for simplified development:

- Authentication is bypassed in development mode
- Templates are displayed as empty by default
- API endpoints are mocked for demonstration purposes
- Database operations use a fallback mechanism when Prisma client fails

## Template Management

PSADT Pro UI provides a comprehensive template management system:

### Downloading Templates

1. **Default Templates Page**: Navigate to the "Default Templates" page to download official PSADT templates directly from GitHub.
   - View release notes for different versions
   - Select specific template types (Standard, MSI, EXE)
   - Download ZIP files directly to your local storage

2. **Quick Download**: Use the "Download Default Template" button on the home page for a one-click download of the standard template.

3. **Template Types Available**:
   - **Full PSADT Toolkit (ZIP)**: Complete toolkit with all files and documentation
   - **MSI Deployment Template (ZIP)**: Specialized template optimized for MSI deployments
   - **EXE Deployment Template (ZIP)**: Template configured for complex EXE installers

### Version Tracking

1. **Template Versioning**: All templates now track their PSADT version:
   - Version information is stored in the database
   - Version is displayed on template cards
   - Version is shown in template details
   - Version is included in success messages when downloading templates

2. **Version Selection**: When downloading templates:
   - Select from available PSADT versions
   - View release notes for each version
   - Download specific versions as needed

### Template Storage

1. **Local Storage**: All templates are stored in the `/storage/templates` directory, organized by user and template name:
   - ZIP files are stored directly in the user's Default directory
   - Extracted files are placed in a subfolder with the template name
   - Path structure: `/storage/{userId}/Default/{templateName}.zip` and `/storage/{userId}/Default/{templateName}/`

2. **Template Extraction**: Templates are automatically extracted using optimized path handling:
   - ZIP files are extracted to avoid Windows path length limitations
   - Proper directory structure is maintained
   - PowerShell's native extraction is used for performance

3. **Database Tracking**: Templates are tracked in the database with:
   - Template name and type
   - PSADT version information
   - Creation/modification dates
   - Associated files and metadata
   - Default template status

4. **Template Browsing**: View all downloaded templates on the home page, with:
   - Template name and type
   - PSADT version
   - Default template indicator
   - Creation date
   - Quick access to template details

### Creating Custom Templates

1. Create a new template from scratch using the "Create Template" button
2. Customize the template with your specific deployment requirements
3. Save the template to use as a base for future deployments

## Package Creation

Once you have a template downloaded or created:

1. **Start a New Package**: Select a template as your starting point
2. **Configure Package Parameters**: Set deployment options based on package type (MSI, EXE, etc.)
3. **Add Custom Scripts**: Include pre/post-installation scripts as needed
4. **Generate Deployment Package**: Create a ready-to-deploy PSADT package

## Available Scripts

- `npm run dev`: Start the development server
- `npm run build`: Build the application for production
- `npm run start`: Start the production server
- `npm run lint`: Run ESLint
- `npm run db:sqlite`: Initialize SQLite database for local development
- `npm run db:studio`: Open Prisma Studio to manage database
- `npm run db:migrate`: Run database migrations
- `npm run db:reset`: Reset the database (caution: deletes all data)
- `npm run clean`: Clean build cache
- `npm run rebuild`: Perform a clean rebuild
- `npm run fix`: Fix common Next.js issues
- `npm run fix:webpack`: Fix webpack cache errors
- `npm run diagnose`: Run diagnostics to identify and fix issues
- `npm run kill`: Kill all Node.js processes to resolve conflicts

## Troubleshooting

### Common Issues

1. **SQLite Database Issues**:
   ```bash
   npm run db:sqlite
   ```

2. **Login Problems**:
   - Ensure you've created a user with:
     ```bash
     node create-demo-user.js
     ```

3. **Build Errors**:
   ```bash
   npm run clean
   npm run rebuild
   ```

4. **Webpack Cache Errors**:
   - If you see "Caching failed for pack" errors or issues with the "fallback" directory:
     ```bash
     npm run fix:webpack
     ```

5. **Symbolic Link Errors**:
   - Run the fix script:
     ```bash
     npm run fix
     ```

6. **Permission Issues on Windows**:
   - If you encounter EPERM errors during setup:
     - Close any applications that might be using the database file
     - Run PowerShell as administrator
     - Try running the commands individually instead of using the setup script

7. **Template Download Issues**:
   - If templates fail to download:
     - Check your network connection
     - Ensure GitHub is accessible
     - Try using the "Download Default Template" button on the home page
     - Verify storage directory permissions

8. **Template Storage Problems**:
   - If templates are not appearing after download:
     - Ensure the `/storage/templates` directory exists and is writable
     - Check browser console for any download errors
     - Try restarting the application

9. **GitHub API Rate Limits**:
   - If you encounter issues downloading templates from GitHub due to rate limits:
     - Create a GitHub Personal Access Token and add it to your .env file:
       ```
       GITHUB_TOKEN=your_token_here
       ```

10. **Path Length Issues**:
    - If you encounter errors related to path length limitations in Windows:
      - Don't worry, the application now uses optimized extraction to avoid path length issues
      - ZIP files are now extracted with a flatter structure
      - If problems persist, try enabling long path support in Windows

11. **Database Authentication Issues**:
    - If you see foreign key constraint errors or authentication issues:
      - Ensure you have a valid JWT token in your .env file
      - Run the db-cleanup.ps1 script to reset the database:
        ```bash
        .\scripts\db-cleanup.ps1
        ```
      - Create a demo user with:
        ```bash
        node create-demo-user.js
        ```

## Database Reset

If you need to reset the database completely:

1. Run the database cleanup script:
   ```bash
   .\scripts\db-cleanup.ps1
   ```

2. Create a demo user:
   ```bash
   node create-demo-user.js
   ```

3. Restart the development server:
   ```bash
   npm run dev
   ```

## Project Structure

- `/src/app`: Main application routes and pages
- `/src/app/default-template`: Template download interface
- `/src/app/templates`: Template management pages
- `/src/app/api`: Backend API endpoints
- `/src/app/api/github`: GitHub integration for template downloads
- `/src/components`: Reusable UI components
- `/src/lib`: Utility functions and services
- `/src/providers`: Context providers
- `/prisma`: Database schema and migrations
- `/scripts`: Utility scripts for maintenance and setup
- `/public`: Static assets
- `/storage`: Local storage for templates and packages

## Database Schema

The application uses the following key models:

- **User**: User account information
- **Template**: PSADT template details with metadata and version information
- **Package**: Deployment packages created from templates

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [PowerShell App Deployment Toolkit](https://psappdeploytoolkit.com/)
- [Next.js](https://nextjs.org/)
- [Radix UI](https://www.radix-ui.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Prisma](https://www.prisma.io/)

## Setup & Installation

To set up the application from scratch:

```powershell
# Full setup including database, directories, and demo user
./scripts/setup.ps1
```

## Development Commands

```powershell
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

## Consolidated Management Scripts

We've created several consolidated scripts to simplify common operations:

### Template Management

Use the consolidated template management script to work with templates:

```powershell
# List all templates
node scripts/template-management.js list

# Check a specific template
node scripts/template-management.js check <templateId>

# Create a new template
node scripts/template-management.js create --userId <id> --name <name> --version <version>

# Update template extraction status
node scripts/template-management.js update <templateId> --userId <id> --status <status>
```

### Database Management

Use the consolidated database management script for all database operations:

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

### Troubleshooting & Maintenance

Use the consolidated troubleshooting script to diagnose and fix common issues:

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

For more detailed information about available scripts, see the [scripts/README.md](scripts/README.md) file.

## Environment Configuration

The application requires a `.env` file with the following variables:

```
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

## Embedding Service Implementation

### Transformer-Based Embeddings

This project uses a transformer-based embedding model for generating vector embeddings of documentation content for semantic search. The implementation uses the Hugging Face model `sentence-transformers/all-MiniLM-L6-v2` via the @xenova/transformers library.

Key features:
1. Real transformer-based embeddings with 384 dimensions
2. Hard-fail approach if model cannot be loaded (no fallbacks to inferior methods)
3. Clear error messages and detailed logging
4. Efficient model caching to improve performance

### Model Details

- Model: `sentence-transformers/all-MiniLM-L6-v2`
- Implementation: JavaScript using @xenova/transformers
- Vector Dimensions: 384
- Distance Metric: Cosine similarity
- Model Location: `./Qdrant/models/`

### Key Files

- `src/lib/embedding-service.js`: Main service for generating embeddings via transformer model
- `src/lib/docs-processor-helpers.js`: Helper functions that interface with the embedding service
- `src/lib/docs-processor.js`: Documentation processor that uses embeddings for vector storage

### Test Scripts

- `scripts/check-embedding.js`: Verifies the embedding service is working correctly
- `scripts/test-sync.js`: Tests the document synchronization process with real embeddings
- `scripts/build-embed.js`: Helps build embedding service dependencies

### Production Requirements

For production use, ensure:

1. The transformer model files are properly installed in the `./Qdrant/models/` directory
2. The @xenova/transformers library is installed
3. The system has sufficient memory and resources to run the model (minimum 2GB RAM recommended)

The system will not fall back to inferior methods if the transformer model fails to load, ensuring consistent search quality.

## Documentation Search

The application now includes a dedicated Documentation Search tab that allows users to search specifically for documentation content. This feature uses the same semantic search technology as the Command Search but focuses on finding relevant documentation sections.

### Key Features

- **Collection Selection**: Choose from different documentation collections including official PSADT docs and test collections.
- **Parameter Documentation**: Automatically generates documentation entries for each parameter when no explicit documentation is available.
- **Content Chunking**: Large documentation sections are automatically split into manageable chunks to improve search relevance and precision.
- **Document Types**: Search results show the type of documentation (parameter, section, etc.) and indicate when a result is part of a larger chunked document.

### Implementation Details

- Documentation sections longer than 1500 characters are split into smaller semantic chunks.
- Each chunk maintains context with section headers and related information.
- Chunks are labeled with indices (Part 1, Part 2, etc.) to maintain reading order.
- Parameters are stored as individual documentation entries for targeted parameter searches.
