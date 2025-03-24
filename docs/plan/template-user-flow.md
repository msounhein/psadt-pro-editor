# Template Management User Flow

This document outlines the user flow for interacting with templates in the PSADT Pro UI application.

## Template Types and User Interactions

```
┌─────────────────┐              ┌─────────────────┐
│                 │              │                 │
│  Default        │              │  Custom         │
│  Templates      │              │  Templates      │
│                 │              │                 │
└────────┬────────┘              └────────┬────────┘
         │                                │
         │                                │
         ▼                                ▼
┌─────────────────┐              ┌─────────────────┐
│ Actions:        │              │ Actions:        │
│ - View Details  │              │ - View Details  │
│ - Clone         │◄─────────────┤ - Edit          │
│ - Create Package│              │ - Clone         │
│ - Download      │              │ - Create Package│
│ - Delete        │              │ - Download      │
└─────────────────┘              │ - Delete        │
                                 └─────────────────┘
```

## User Workflow Scenarios

### Scenario 1: New User - First-time Setup

1. User logs into PSADT Pro UI for the first time
2. User navigates to the Templates page (empty state)
3. User clicks "Download Default Template" button
4. System downloads the default PSADT template from GitHub
5. System stores template in `/storage/templates/{userId}/Default/{templateName}/`
6. System creates database record with `type: "Default"`
7. User sees the new template on the Templates page with a "Default" badge

### Scenario 2: Creating a Custom Template from Default

1. User views a Default template
2. User clicks "Clone" button on the Default template card
3. System displays "Clone Template" modal
4. User enters a name and optional description for the new template
5. User clicks "Clone Template" button
6. System creates a copy of the template files in `/storage/templates/{userId}/Custom/{newName}/`
7. System creates a new database record with `type: "Custom"`
8. System redirects user to the new Custom template details page

### Scenario 3: Attempting to Edit a Default Template

1. User navigates to Templates page
2. User clicks on a Default template to view details
3. User attempts to edit the template (clicks "Edit" button)
4. System displays message: "Default templates cannot be edited directly. Would you like to clone this template instead?"
5. User clicks "Clone Template" button
6. System follows the cloning workflow (Scenario 2)

### Scenario 4: Working with Custom Templates

1. User navigates to Templates page
2. User clicks on a Custom template to view details
3. User clicks "Edit" button
4. System loads template editor
5. User makes changes to the template
6. User clicks "Save" button
7. System updates template files and database record
8. System redirects user to template details page

### Scenario 5: Creating a Package from Any Template

1. User navigates to Templates page
2. User clicks "Create Package" on any template card (Default or Custom)
3. System redirects to Package Creation page with template pre-selected
4. User configures package parameters
5. User clicks "Create Package" button
6. System creates package using the selected template
7. System redirects user to the new package details page

## UI Mockups

### Templates List Page

```
┌─────────────────────────────────────────────────────────┐
│ Templates                           [Create Template] ▶ │
├─────────────────────────────────────────────────────────┤
│ [All Templates] [Default] [Custom]                      │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────┐  ┌─────────────────────┐        │
│ │ Standard Template   │  │ Company Template    │        │
│ │ [Default]  [v3.8.4] │  │ [Custom]            │        │
│ │                     │  │                     │        │
│ │ Official PSADT...   │  │ Custom template...  │        │
│ │                     │  │                     │        │
│ │ [Clone] [Create] ▼  │  │ [Edit] [Create] ▼   │        │
│ └─────────────────────┘  └─────────────────────┘        │
│                                                         │
│ ┌─────────────────────┐  ┌─────────────────────┐        │
│ │ MSI Template        │  │ Modified Standard   │        │
│ │ [Default]  [v3.8.4] │  │ [Custom]            │        │
│ │                     │  │                     │        │
│ │ Specialized MSI...  │  │ Standard with...    │        │
│ │                     │  │                     │        │
│ │ [Clone] [Create] ▼  │  │ [Edit] [Create] ▼   │        │
│ └─────────────────────┘  └─────────────────────┘        │
└─────────────────────────────────────────────────────────┘
```

### Clone Template Modal

```
┌───────────────────────────────────────────┐
│ Clone Template                     [X]    │
├───────────────────────────────────────────┤
│ Create a new custom template based on     │
│ "Standard Template".                      │
│                                           │
│ Template Name:                            │
│ ┌─────────────────────────────────────┐   │
│ │ Standard Template (Custom)          │   │
│ └─────────────────────────────────────┘   │
│                                           │
│ Description (Optional):                   │
│ ┌─────────────────────────────────────┐   │
│ │ Customized version of the standard  │   │
│ │ PSADT template for our organization │   │
│ │                                     │   │
│ └─────────────────────────────────────┘   │
│                                           │
│                   [Cancel] [Clone Template]│
└───────────────────────────────────────────┘
```

### Edit Protection Message

```
┌───────────────────────────────────────────┐
│ Default Template                    [X]   │
├───────────────────────────────────────────┤
│                                           │
│ Default templates cannot be edited        │
│ directly. Would you like to clone this    │
│ template instead?                         │
│                                           │
│                                           │
│               [Cancel] [Clone Template]   │
└───────────────────────────────────────────┘
```

## Implementation Considerations

1. **Visual Distinction**: Default and Custom templates should be visually distinct through badges, icons, or color schemes.

2. **User Guidance**: Provide tooltips or help text explaining the differences between template types.

3. **Confirmation Dialogs**: Use confirmation dialogs for destructive actions like template deletion.

4. **Consistent Terminology**: Use consistent terms throughout the UI ("Default"/"Custom" templates, "Clone" for creating copies).

5. **Responsive Design**: Ensure all modals and cards work well on mobile devices.

6. **Error Handling**: Provide clear error messages if cloning or other operations fail.

7. **Performance**: Optimize file copying to ensure cloning large templates is efficient.

8. **Accessibility**: Ensure all modals and interactions are keyboard-accessible and work with screen readers.

## Feature Expansion Ideas

For future iterations, consider these additional template management features:

1. **Template Sharing**: Allow users to share their custom templates with team members
2. **Template Versions**: Enable versioning of custom templates with change history
3. **Template Categories**: Add categorization for templates beyond Default/Custom (e.g., Application Type)
4. **Template Exports**: Allow exporting templates to different formats
5. **Template Import**: Enable importing templates from external sources
6. **Template Approval Workflow**: Add approval process for enterprise environments
