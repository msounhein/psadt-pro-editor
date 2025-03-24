# Template Management Usage Guide

This document provides a guide on how to use the new template management system in PSADT Pro UI.

## Understanding Template Types

PSADT Pro UI now distinguishes between two types of templates:

1. **Default Templates** - Official, unmodified PSADT templates that serve as starting points
2. **Custom Templates** - User-created or user-modified templates derived from default templates

## Working with Default Templates

Default templates provide a baseline for creating packages. These templates:

- Are read-only
- Cannot be directly modified
- Can be cloned to create custom templates
- Can be used directly for package creation

### Downloading Default Templates

1. Navigate to the "Default Templates" page
2. Browse and select from available templates
3. Click the "Download" button
4. The template will be stored with a "Default" type designation

### Using Default Templates

1. From the Templates list, find a Default template (marked with a Default badge)
2. Use the "Create Package" button to create a package without modifying the template
3. Alternatively, use the "Clone" button to create a Custom template based on it

### Cloning a Default Template

When working with a Default template, you have multiple ways to clone it:

1. **From the Templates List**:
   - Click the "Clone" button on the template card
   - Enter a new name in the Clone Template modal
   - Click "Clone Template"

2. **From the Template Detail Page**:
   - Click the "Clone Template" button
   - Enter a new name in the Clone Template modal
   - Click "Clone Template"

3. **When Attempting to Edit**:
   - If you try to edit a Default template, you'll be prompted to clone it
   - The system will redirect to the Clone Template page
   - Complete the form and click "Clone Template" or "Clone & Edit"

## Working with Custom Templates

Custom templates are fully editable and can be used for specialized deployment needs. These templates:

- Can be created from scratch
- Can be cloned from Default templates
- Are fully editable
- Can be used for package creation

### Creating Custom Templates

**Method 1: Clone from Default**
1. Find a Default template in the Templates list
2. Click the "Clone" button
3. Enter a name and optional description for the new template
4. Click "Clone Template" (creates template and returns to list) or "Clone & Edit" (creates and opens editor)
5. The system will create a copy of the template with type "Custom"

**Method 2: Create from Scratch**
1. Click the "Create Template" button on the Templates page
2. Enter a name and configuration details
3. The system will create a new template with type "Custom"

### Editing Custom Templates

1. Find a Custom template in the Templates list
2. Click the "Edit" button to go to the edit page
3. Make your changes in the template editor
4. Click "Save" to save your changes or "Next Step" to proceed to code editing

## Command-Line Management

The template management system can also be operated via command-line scripts.

### Listing Templates

To list all templates with their types:

```
node scripts/template-management.js list
```

### Checking Template Details

To view details about a specific template:

```
node scripts/template-management.js check <templateId>
```

### Creating Templates

To create a new template with a specific type:

```
node scripts/template-management.js create --userId <id> --name "Template Name" --version "1.0.0" --type "Default"
```

Or for a Custom template:

```
node scripts/template-management.js create --userId <id> --name "Custom Template" --version "1.0.0" --type "Custom"
```

### Cloning Templates

To clone a template (always creates a Custom template):

```
node scripts/template-management.js clone <sourceTemplateId> --userId <id> --name "New Template Name"
```

### Copying Template Files

After cloning a template in the database, you need to copy the actual files:

```
./scripts/clone-template-files.ps1 -sourceTemplateId <id> -targetTemplateId <id> -UpdateStatus
```

## Template Management Best Practices

### Organization

1. **Naming Conventions**
   - Use clear, descriptive names for templates
   - Include purpose or application type in the name
   - Consider adding version information for clarity

2. **Template Structure**
   - Default templates should be kept in the `/storage/templates/{userId}/Default/` directory
   - Custom templates should be kept in the `/storage/templates/{userId}/Custom/` directory
   - Maintain a consistent internal structure for all templates

### Workflow Recommendations

1. **Start with Default Templates**
   - Always start with a Default template as your base
   - Clone the Default template before making modifications
   - Keep Default templates up-to-date with official releases

2. **Custom Template Management**
   - Create specialized Custom templates for different deployment scenarios
   - Document the purpose and modifications of each Custom template
   - Consider creating a "master" Custom template for your organization's standards

3. **Template Versioning**
   - Include version information in template names or descriptions
   - Document changes between versions
   - Consider creating new templates rather than overwriting existing ones

## New UI Elements

The UI has been enhanced with several new features:

### 1. Templates List Page

- **Search Bar**: Quickly find templates by name or package type
- **Type Filtering Tabs**: Filter templates by All, Default, or Custom types
- **Template Cards**: Visual display with type badges and appropriate actions
- **Count Indicators**: Shows the number of templates in each category

### 2. Template Detail Page

- **Type Badge**: Clearly shows whether a template is Default or Custom
- **Conditional Buttons**: Different actions available based on template type
  - Default templates: "Clone Template" instead of "Edit"
  - Custom templates: "Edit" button available
- **Template Info**: Displays template ID, package type, and version
- **Action Cards**: Organized into Package Type, Configuration, and Version sections

### 3. Template Edit Page

- **Form Navigation**: "Save", "Next Step", and "Cancel" buttons
- **Input Validation**: Ensures required fields are completed
- **Edit Protection**: Prevents editing of Default templates
- **Sequential Workflow**: Save and continue to the next step in the process

### 4. Clone Template Page

- **Source Template Info**: Shows the name and type of the source template
- **New Template Form**: Set name and description for the cloned template
- **Workflow Options**: "Clone Template" or "Clone & Edit" buttons
- **Descriptive Help Text**: Explains the cloning process

## Troubleshooting

### Common Issues

1. **Template Not Appearing**
   - Check extraction status using `node scripts/template-management.js check <id>`
   - Verify the template files exist in the correct directory
   - Run `scripts/check-templates.ps1` to validate all templates

2. **Clone Operation Failed**
   - Verify both source and target templates exist in the database
   - Check filesystem permissions
   - Manually run `clone-template-files.ps1` with appropriate parameters

3. **Cannot Edit Default Template**
   - Remember that Default templates are read-only by design
   - Clone the template to create an editable Custom version
   - If you need to update a Default template, download a new version

4. **Template Not Found Error**
   - If you see "Template Not Found" when clicking on a template
   - Check if the template exists in the database with the debug tool
   - Verify the user has permission to access the template
   - In development mode, use the Debug Template button for more information

## Migration Guide

If you have existing templates before this update, follow these steps to migrate:

1. Update the database schema:
   ```
   ./scripts/migrate-template-type-field.ps1 -Execute
   ```

2. Update existing templates with type information:
   ```
   node scripts/migrate-template-types.js
   ```

3. Verify the migration:
   ```
   node scripts/template-management.js list
   ```

4. Organize template files according to type:
   - Default templates should be in `/storage/templates/{userId}/Default/`
   - Custom templates should be in `/storage/templates/{userId}/Custom/`

## Development Tools

For developers working on the template management system, several debugging tools are available:

1. **Debug Template Endpoint**: `/api/debug/template/{id}` for checking template existence without authentication
2. **Debug Information Display**: Template detail page shows debug info in development mode
3. **Development Mode Permissions**: API routes bypass strict user checks in development mode

Last Updated: March 21, 2025
