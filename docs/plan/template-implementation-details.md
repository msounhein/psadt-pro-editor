# Template Implementation Details

This document provides technical details for implementing the template management system in PSADT Pro UI, focusing on the distinction between default and custom templates.

## Database Schema Changes

### Update Prisma Schema

Add the template type field to the existing Template model:

```prisma
model Template {
  id            String   @id @default(uuid())
  name          String
  description   String?
  userId        String
  type          String   @default("Custom") // "Default" or "Custom"
  psadtVersion  String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  isExtracted   Boolean  @default(false)
  extractPath   String?
  zipPath       String?
  
  // Relationships
  user          User     @relation(fields: [userId], references: [id])
  packages      Package[]
}
```

### Migration Steps

1. Generate Prisma migration:
   ```bash
   npx prisma migrate dev --name add_template_type
   ```

2. Apply migration:
   ```bash
   npx prisma db push
   ```

## Backend Implementation

### Template Service Updates

Update `src/lib/services/template-service.js` to handle the template type:

```javascript
// Add to existing functions
export async function createTemplate({ name, description, userId, type = "Custom", psadtVersion }) {
  return prisma.template.create({
    data: {
      name,
      description,
      userId,
      type,          // Add type field
      psadtVersion,
    },
  });
}

// Add new clone function
export async function cloneTemplate(templateId, { newName, description, userId }) {
  // Get the source template
  const sourceTemplate = await prisma.template.findUnique({
    where: { id: templateId },
    include: { user: true }  // Include user relation for permission checking
  });

  if (!sourceTemplate) {
    throw new Error("Template not found");
  }
  
  // Check permissions (only owner can clone)
  if (sourceTemplate.userId !== userId) {
    throw new Error("You don't have permission to clone this template");
  }

  // Create new template record
  const newTemplate = await prisma.template.create({
    data: {
      name: newName,
      description: description || `Cloned from ${sourceTemplate.name}`,
      userId,
      type: "Custom",  // Always set cloned templates as Custom
      psadtVersion: sourceTemplate.psadtVersion,
    },
  });

  // Copy template files
  const sourcePath = sourceTemplate.extractPath;
  const targetPath = path.join(
    process.env.STORAGE_DIR || "storage",
    "templates",
    userId,
    "Custom",
    newName
  );

  // Ensure directory exists
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  
  // Copy the template files
  await fs.cp(sourcePath, targetPath, { recursive: true });

  // Update the new template with paths
  return prisma.template.update({
    where: { id: newTemplate.id },
    data: {
      extractPath: targetPath,
      isExtracted: true,
    },
  });
}

// Update the updateTemplate function to check for Default templates
export async function updateTemplate(id, data) {
  // First check if this is a Default template
  const template = await prisma.template.findUnique({ where: { id } });
  
  if (template?.type === "Default") {
    throw new Error("Default templates cannot be modified. Please clone the template first.");
  }
  
  return prisma.template.update({
    where: { id },
    data,
  });
}
```

### API Route Updates

Create or update the following API routes:

1. **Clone Template API Route** (`src/app/api/templates/clone/[id]/route.js`):

```javascript
import { NextResponse } from "next/server";
import { cloneTemplate } from "@/lib/services/template-service";

export async function POST(request, { params }) {
  const { id } = params;
  const { newName, description, userId } = await request.json();

  try {
    const template = await cloneTemplate(id, { newName, description, userId });
    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to clone template" },
      { status: 500 }
    );
  }
}
```

2. **Update Template API Route** (`src/app/api/templates/[id]/route.js`):

```javascript
// Add validation in the PUT handler
export async function PUT(request, { params }) {
  const { id } = params;
  const data = await request.json();

  try {
    const template = await updateTemplate(id, data);
    return NextResponse.json({ template });
  } catch (error) {
    // Will catch the "Default templates cannot be modified" error
    return NextResponse.json(
      { error: error.message || "Failed to update template" },
      { status: 400 }
    );
  }
}
```

3. **GitHub Download API Route** (`src/app/api/github/download/route.js`):

```javascript
// Update to mark templates as "Default"
const templateRecord = await createTemplate({
  name: templateName,
  description: `Official PSADT template v${version}`,
  userId,
  type: "Default",  // Mark as Default
  psadtVersion: version,
});
```

## Frontend Implementation

### Template Card Component

Update `src/components/template-card.jsx` to display and handle template types:

```jsx
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu } from "@/components/ui/dropdown-menu";

export default function TemplateCard({ template, onClone, onEdit, onCreatePackage }) {
  const isDefault = template.type === "Default";
  
  return (
    <div className="border rounded-lg p-4 shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-medium">{template.name}</h3>
          <div className="flex gap-2 mt-1">
            <Badge variant={isDefault ? "default" : "secondary"}>
              {isDefault ? "Default" : "Custom"}
            </Badge>
            {template.psadtVersion && (
              <Badge variant="outline">v{template.psadtVersion}</Badge>
            )}
          </div>
        </div>
        
        {/* Template actions */}
        <div className="flex gap-2">
          {isDefault ? (
            <>
              <Button onClick={() => onClone(template)} className="bg-blue-600 hover:bg-blue-700">
                Clone
              </Button>
              <Button onClick={() => onCreatePackage(template)} variant="outline">
                Create Package
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => onEdit(template)}>
                Edit
              </Button>
              <Button onClick={() => onCreatePackage(template)} variant="outline">
                Create Package
              </Button>
            </>
          )}
          
          <DropdownMenu>
            {/* Common actions */}
            <DropdownMenu.Item onClick={() => router.push(`/templates/${template.id}`)}>
              View Details
            </DropdownMenu.Item>
            <DropdownMenu.Item onClick={() => handleDownload(template)}>
              Download
            </DropdownMenu.Item>
            <DropdownMenu.Item onClick={() => handleDelete(template)} className="text-red-600">
              Delete
            </DropdownMenu.Item>
            
            {/* Custom template specific actions */}
            {!isDefault && (
              <DropdownMenu.Item onClick={() => onClone(template)}>
                Clone
              </DropdownMenu.Item>
            )}
          </DropdownMenu>
        </div>
      </div>
      
      <p className="text-sm text-gray-500 mt-2">
        {template.description || "No description provided"}
      </p>
      
      <div className="text-xs text-gray-400 mt-4">
        Created: {new Date(template.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
}
```

### Clone Template Modal

Create a new component for cloning templates (`src/components/clone-template-modal.jsx`):

```jsx
import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function CloneTemplateModal({ isOpen, onClose, onClone, templateName }) {
  const [newName, setNewName] = useState(`${templateName} (Clone)`);
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await onClone({ newName, description });
      onClose();
    } catch (error) {
      console.error("Failed to clone template:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <Dialog.Content className="sm:max-w-[425px]">
        <Dialog.Header>
          <Dialog.Title>Clone Template</Dialog.Title>
          <Dialog.Description>
            Create a new custom template based on "{templateName}".
          </Dialog.Description>
        </Dialog.Header>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Template Name
            </label>
            <Input
              id="name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description (Optional)
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter a description for your template"
              rows={3}
            />
          </div>
          
          <Dialog.Footer>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !newName.trim()}>
              {isLoading ? "Cloning..." : "Clone Template"}
            </Button>
          </Dialog.Footer>
        </form>
      </Dialog.Content>
    </Dialog>
  );
}
```

### Templates Page Update

Update the main templates page (`src/app/templates/page.jsx`) to handle cloning and respect template types:

```jsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import TemplateCard from "@/components/template-card";
import CloneTemplateModal from "@/components/clone-template-modal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cloneModal, setCloneModal] = useState({ open: false, template: null });
  const router = useRouter();
  const { toast } = useToast();
  
  // Fetch templates
  useEffect(() => {
    async function fetchTemplates() {
      try {
        const response = await fetch("/api/templates");
        const data = await response.json();
        setTemplates(data.templates || []);
      } catch (error) {
        console.error("Failed to fetch templates:", error);
        toast({
          title: "Error",
          description: "Failed to load templates",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchTemplates();
  }, [toast]);
  
  const handleCloneTemplate = async ({ newName, description }) => {
    try {
      const response = await fetch(`/api/templates/clone/${cloneModal.template.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newName,
          description,
          userId: "current-user-id", // Replace with actual user ID
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to clone template");
      }
      
      const { template } = await response.json();
      
      // Update templates list
      setTemplates((prev) => [...prev, template]);
      
      toast({
        title: "Template cloned",
        description: `Successfully created "${newName}" from "${cloneModal.template.name}"`,
      });
      
      // Optionally redirect to the new template
      router.push(`/templates/${template.id}`);
    } catch (error) {
      console.error("Error cloning template:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to clone template",
        variant: "destructive",
      });
    }
  };
  
  const handleEditTemplate = (template) => {
    if (template.type === "Default") {
      // Show modal asking to clone instead
      setCloneModal({ open: true, template });
      toast({
        title: "Default Template",
        description: "Default templates can't be edited directly. Please clone it first.",
      });
    } else {
      // Navigate to edit page
      router.push(`/templates/${template.id}/edit`);
    }
  };
  
  // Filter templates by type
  const defaultTemplates = templates.filter((t) => t.type === "Default");
  const customTemplates = templates.filter((t) => t.type === "Custom");
  
  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Templates</h1>
        <Button onClick={() => router.push("/templates/new")}>Create Template</Button>
      </div>
      
      <Tabs defaultValue="all">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Templates ({templates.length})</TabsTrigger>
          <TabsTrigger value="default">Default ({defaultTemplates.length})</TabsTrigger>
          <TabsTrigger value="custom">Custom ({customTemplates.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onClone={(template) => setCloneModal({ open: true, template })}
              onEdit={handleEditTemplate}
              onCreatePackage={(template) => router.push(`/packages/new?templateId=${template.id}`)}
            />
          ))}
        </TabsContent>
        
        <TabsContent value="default" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {defaultTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onClone={(template) => setCloneModal({ open: true, template })}
              onEdit={handleEditTemplate}
              onCreatePackage={(template) => router.push(`/packages/new?templateId=${template.id}`)}
            />
          ))}
        </TabsContent>
        
        <TabsContent value="custom" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onClone={(template) => setCloneModal({ open: true, template })}
              onEdit={handleEditTemplate}
              onCreatePackage={(template) => router.push(`/packages/new?templateId=${template.id}`)}
            />
          ))}
        </TabsContent>
      </Tabs>
      
      {/* Empty state */}
      {!isLoading && templates.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium">No templates found</h3>
          <p className="text-gray-500 mt-2">
            Create a new template or download a default template to get started.
          </p>
          <div className="flex justify-center gap-4 mt-4">
            <Button onClick={() => router.push("/templates/new")}>Create Template</Button>
            <Button variant="outline" onClick={() => router.push("/default-template")}>
              Download Default Template
            </Button>
          </div>
        </div>
      )}
      
      {/* Clone modal */}
      {cloneModal.template && (
        <CloneTemplateModal
          isOpen={cloneModal.open}
          onClose={() => setCloneModal({ open: false, template: null })}
          onClone={handleCloneTemplate}
          templateName={cloneModal.template.name}
        />
      )}
    </div>
  );
}
```

## File System Structure

Implement a consistent file system structure to separate default and custom templates:

```javascript
// In src/lib/utils/path-helpers.js

/**
 * Get the path for a template based on its type
 */
export function getTemplatePath(userId, templateName, type = "Custom") {
  return path.join(
    process.env.STORAGE_DIR || "storage",
    "templates",
    userId,
    type === "Default" ? "Default" : "Custom",
    templateName
  );
}

/**
 * Get the ZIP file path for a template
 */
export function getTemplateZipPath(userId, templateName, type = "Custom") {
  return path.join(
    process.env.STORAGE_DIR || "storage",
    "templates",
    userId,
    type === "Default" ? "Default" : "Custom",
    `${templateName}.zip`
  );
}
```

## Migration Scripts

Create a migration script to update existing templates:

```javascript
// scripts/migrate-template-types.js

const { PrismaClient } = require('@prisma/client');
const fs = require('fs/promises');
const path = require('path');

const prisma = new PrismaClient();

async function migrateTemplateTypes() {
  try {
    console.log('Starting template type migration...');

    // Get all templates
    const templates = await prisma.template.findMany();
    console.log(`Found ${templates.length} templates to process`);

    // Process each template
    for (const template of templates) {
      // Default to "Custom" type
      let type = "Custom";
      
      // Check if this is likely a default template based on name
      if (
        template.name.includes("PSADT") ||
        template.name.includes("PowerShell App Deployment Toolkit") ||
        template.name.includes("Default Template")
      ) {
        type = "Default";
      }
      
      console.log(`Setting template "${template.name}" to type: ${type}`);
      
      // Update the template type
      await prisma.template.update({
        where: { id: template.id },
        data: { type },
      });
      
      // Move files if necessary
      if (template.extractPath) {
        const userId = template.userId;
        const templateName = template.name;
        
        // New path structure
        const newBasePath = path.join(
          process.env.STORAGE_DIR || "storage",
          "templates",
          userId,
          type
        );
        
        const newExtractPath = path.join(newBasePath, templateName);
        
        // Create directory if it doesn't exist
        await fs.mkdir(newBasePath, { recursive: true });
        
        // Check if files need to be moved
        if (template.extractPath !== newExtractPath) {
          try {
            // Copy files to new location
            await fs.cp(template.extractPath, newExtractPath, { recursive: true });
            
            // Update database record
            await prisma.template.update({
              where: { id: template.id },
              data: { extractPath: newExtractPath },
            });
            
            console.log(`Moved template files for "${templateName}" to new location`);
          } catch (error) {
            console.error(`Error moving files for "${templateName}":`, error);
          }
        }
      }
    }
    
    console.log('Template type migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateTemplateTypes();
```

## Testing Checklist

Before deploying to production, test the following:

1. **Database Schema**:
   - [ ] Verify template type field is added correctly
   - [ ] Check default values for existing records

2. **Template Download**:
   - [ ] Download default template from GitHub
   - [ ] Verify it's marked as "Default" type
   - [ ] Check file system structure

3. **Template Cloning**:
   - [ ] Clone a default template
   - [ ] Verify new template is marked as "Custom"
   - [ ] Check file system structure for the cloned template

4. **Edit Protection**:
   - [ ] Attempt to edit a default template
   - [ ] Verify appropriate error message
   - [ ] Check that clone dialog appears

5. **UI Display**:
   - [ ] Verify template cards show correct type badges
   - [ ] Check that appropriate actions are shown for each type
   - [ ] Test filtering templates by type

6. **File Operations**:
   - [ ] Download template as ZIP
   - [ ] Delete template
   - [ ] Create package from template

## Deployment Steps

1. **Database Migration**:
   ```bash
   npx prisma migrate deploy
   ```

2. **File System Updates**:
   ```bash
   node scripts/migrate-template-types.js
   ```

3. **Application Restart**:
   ```bash
   npm run build
   npm run start
   ```

4. **Post-Deployment Verification**:
   - Check database records
   - Verify file system structure
   - Test template operations
