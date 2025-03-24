# PSADT Pro UI Documentation

Welcome to the PSADT Pro UI documentation. This guide provides detailed information about the features, components, and technical aspects of the PSADT Pro UI application.

## Features

- **[Template Management](./features/template-management.md)**: Learn how the template system works, including default and custom templates, storage, and file handling.
- **[Code Editor](./features/code-editor.md)**: Explore the integrated development environment (IDE) built on Monaco Editor for editing PowerShell scripts and template files.

## Technical Documentation

- **[Filesystem Service](./technical/filesystem-service.md)**: Details about the filesystem service that handles file operations for templates.

## Getting Started

PSADT Pro UI is a web-based tool for creating, managing, and customizing PowerShell Application Deployment Toolkit (PSADT) packages. Key features include:

1. **Template Management**: Create and modify templates for deployment packages
2. **Integrated Editor**: Edit PowerShell scripts and other files directly in the browser
3. **Version Control**: Track changes to templates and files
4. **Package Building**: Build PSADT packages from templates

## Contributing

If you're interested in contributing to PSADT Pro UI, please review our contribution guidelines and coding standards.

## Project Structure

The project follows a standard Next.js application structure:

```
psadt-pro-ui/
├── components/     # Reusable UI components
├── docs/           # Documentation
├── lib/            # Utility functions and services
├── pages/          # Application pages and routes
├── prisma/         # Database schema and migrations
├── public/         # Static assets
├── scripts/        # Helper scripts
└── storage/        # Template storage location
```

## License

This project is licensed under the MIT License. See the LICENSE file for details.