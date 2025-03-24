# Template Management Plan

## Overview

This document outlines the template management workflow for PSADT Pro UI, focusing on how users interact with default and custom templates.

## Template Types

### Default Templates

Default templates are the foundation of package creation. They represent official, unmodified PSADT templates that serve as starting points for users.

**Characteristics:**
- Downloaded directly from official PSADT GitHub repository
- Stored in `/storage/templates/[userId]/Default/` directory
- Read-only status prevents accidental modification
- Versioned according to official PSADT releases
- Clearly marked as "Default" in the UI

### Custom Templates

Custom templates are user-created or user-modified templates derived from default templates.

**Characteristics:**
- Created by cloning default templates or from scratch
- Stored in `/storage/templates/[userId]/Custom/` directory
- Fully editable by users
- Can be versioned independently from PSADT versions
- Clearly marked as "Custom" in the UI

## User Workflow

### Template List View

The main template list should clearly distinguish between default and custom templates:

1. **Visual Distinction:**
   - Default templates: Blue badge or icon indicating official status
   - Custom templates: Different colored badge/icon indicating custom status

2. **Sort/Filter Options:**
   - Filter by template type (Default/Custom)
   - Sort by creation date, name, or PSADT version

### Template Actions

For **Default Templates**:
- **View Details**: View template files and metadata (read-only)
- **Clone**: Create a copy as a custom template (primary action)
- **Create Package**: Use template directly to create a package (without modification)
- **Download**: Download the template files as a ZIP
- **Delete**: Remove the template from local storage (can be re-downloaded)

For **Custom Templates**:
- **View Details**: View template files and metadata
- **Edit**: Modify template files and configuration
- **Clone**: Create another copy as a custom template
- **Create Package**: Use template to create a package
- **Download**: Download the template files as a ZIP
- **Delete**: Remove the template from local storage

## UI Implementation

### Template Cards

Each template card should display:
- Template name
- Type badge (Default/Custom)
- PSADT version
- Creation/modification date
- Quick action buttons

### Template Actions Buttons

For **Default Templates**:
1. **Primary Button: "Clone Template"**
   - Prominent, clearly visible
   - Creates a copy as a custom template
   - Opens modal for naming the new custom template

2. **Secondary Button: "Create Package"**
   - Allows package creation without template modification
   - Opens the package creation workflow

3. **Menu Actions:**
   - View Details
   - Download
   - Delete

For **Custom Templates**:
1. **Primary Button: "Edit Template"**
   - Opens template editor
   - Allows full modification of template files

2. **Secondary Button: "Create Package"**
   - Opens the package creation workflow

3. **Menu Actions:**
   - View Details
   - Clone
   - Download
   - Delete

## Technical Implementation

### Database Schema Updates

Add a new field to the Template model:
```prisma
model Template {
  // Existing fields
  id        String   @id @default(uuid())
  name      String
  userId    String
  // Add new field for template type
  type      String   @default("Custom") // Values: "Default" or "Custom"
  // Other existing fields
}
```

### API Endpoints

Create or update the following API endpoints:

1. **GET /api/templates**
   - Return all templates with type information
   - Allow filtering by type

2. **POST /api/templates/clone/:id**
   - Clone an existing template (default or custom)
   - Create a new template with type="Custom"

3. **PUT /api/templates/:id**
   - Update template details
   - Validate that default templates cannot be modified

### File System Structure

Organize templates in the file system by type:
```
/storage/templates/[userId]/
  ├── Default/
  │   ├── StandardTemplate/
  │   │   └── [Files...]
  │   ├── MSITemplate/
  │   │   └── [Files...]
  │   └── [Other default templates...]
  └── Custom/
      ├── ModifiedStandard/
      │   └── [Files...]
      ├── CompanyTemplate/
      │   └── [Files...]
      └── [Other custom templates...]
```

## Implementation Plan

### Phase 1: Database Schema Update
1. Update Prisma schema to include template type
2. Generate migration
3. Apply migration to database

### Phase 2: Backend Implementation
1. Update template API routes to handle template types
2. Implement clone template functionality
3. Add validation to prevent editing default templates
4. Update file system structure to separate default and custom templates

### Phase 3: Frontend Implementation
1. Update UI to display template types
2. Add "Clone Template" button to default template cards
3. Disable direct edit functionality for default templates
4. Implement template clone modal
5. Update template list filters to include type

### Phase 4: Testing
1. Test template downloading and classification
2. Test template cloning functionality
3. Test template editing restrictions
4. Test package creation from both template types

## Migration Strategy

For existing deployments:
1. Mark all existing templates as "Custom" by default
2. Add migration script to re-download and classify default templates
3. Provide user documentation on the new template workflow

## UI/UX Considerations

1. **Clear Visual Distinction:**
   - Use color coding and badges to distinguish template types
   - Add tooltip explanations for template type differences

2. **Intuitive Actions:**
   - Ensure primary actions (Clone for default, Edit for custom) are prominent
   - Use clear, consistent terminology throughout the UI

3. **Helpful Messaging:**
   - Explain why default templates cannot be edited directly
   - Provide contextual help for the clone workflow
   - Confirm actions that might be unexpected (e.g., "Default templates cannot be edited directly. Would you like to clone this template instead?")
