# Template Management Technical Implementation

This document outlines the specific technical changes needed to implement the template management plan in the PSADT Pro UI application.

## Database Changes

### 1. Update Prisma Schema

Add the `isDefault` field to the Template model in `prisma/schema.prisma`:

```prisma
model Template {
  id          String   @id @default(cuid())
  name        String
  description String?
  userId      String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  version     String?
  type        String   @default("standard")
  isDefault   Boolean  @default(false)
  
  user User @relation(fields: [userId], references: [id])
}
```

### 2. Create Migration

```bash
npx prisma migrate dev --name add_is_default_to_templates
```

## Backend Implementation

### 1. Template Service Updates

Update `src/lib/services/template-service.js` to handle default template protection:

```javascript
export async function updateTemplate(id, data) {
  const template = await prisma.template.findUnique({
    where: { id },
  });

  if (!template) {
    throw new Error('Template not found');
  }

  if (template.isDefault) {
    throw new Error('Default templates cannot be modified');
  }

  return prisma.template.update({
    where: { id },
    data,
  });
}

export async function deleteTemplate(id) {
  const template = await prisma.template.findUnique({
    where: { id },
  });

  if (!template) {
    throw new Error('Template not found');
  }

  if (template.isDefault) {
    throw new Error('Default templates cannot be deleted');
  }

  // Delete template files logic...
  return prisma.template.delete({
    where: { id },
  });
}

export async function cloneTemplate(id, { name, userId }) {
  const sourceTemplate = await prisma.template.findUnique({
    where: { id },
  });

  if (!sourceTemplate) {
    throw new Error('Template not found');
  }

  // Generate template paths
  const sourceDir = getTemplatePath(sourceTemplate.userId, sourceTemplate.isDefault ? 'default' : 'custom', sourceTemplate.name);
  const destDir = getTemplatePath(userId, 'custom', name);

  // Create destination directory
  await fs.mkdir(destDir, { recursive: true });

  // Copy all files from source to destination
  await copyDirectory(sourceDir, destDir);

  // Create new template record in database
  return prisma.template.create({
    data: {
      name,
      description: `Clone of ${sourceTemplate.name}`,
      userId,
      version: sourceTemplate.version,
      type: sourceTemplate.type,
      isDefault: false,
    },
  });
}
```

### 2. Helper Functions

Add helper functions for path management:

```javascript
function getTemplatePath(userId, type, templateName) {
  return path.join(process.cwd(), 'storage', 'templates', userId, type, templateName);
}

async function copyDirectory(source, destination) {
  const entries = await fs.readdir(source, { withFileTypes: true });

  await fs.mkdir(destination, { recursive: true });

  for (const entry of entries) {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}
```

### 3. API Endpoints

Create/update the API endpoints in `src/app/api/templates/[id]/route.js`:

```javascript
// src/app/api/templates/[id]/route.js
import { NextResponse } from 'next/server';
import { getTemplate, updateTemplate, deleteTemplate } from '@/lib/services/template-service';

export async function GET(request, { params }) {
  try {
    const template = await getTemplate(params.id);
    return NextResponse.json({ template });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
}

export async function PUT(request, { params }) {
  try {
    const data = await request.json();
    const template = await updateTemplate(params.id, data);
    return NextResponse.json({ template });
  } catch (error) {
    if (error.message === 'Default templates cannot be modified') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await deleteTemplate(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error.message === 'Default templates cannot be deleted') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
```

Add cloning endpoint in `src/app/api/templates/[id]/clone/route.js`:

```javascript
// src/app/api/templates/[id]/clone/route.js
import { NextResponse } from 'next/server';
import { cloneTemplate } from '@/lib/services/template-service';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const template = await cloneTemplate(params.id, {
      name: data.name,
      userId: session.user.id,
    });

    return NextResponse.json({ template });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
```

## Frontend Implementation

### 1. Template Store Updates

Update the template store to handle default templates in `src/lib/stores/template-store.js`:

```javascript
import { create } from 'zustand';

export const useTemplateStore = create((set) => ({
  templates: [],
  isLoading: false,
  error: null,
  
  fetchTemplates: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/templates');
      const data = await response.json();
      set({ templates: data.templates, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },
  
  cloneTemplate: async (id, name) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/templates/${id}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to clone template');
      }
      
      // Refresh templates
      const templatesResponse = await fetch('/api/templates');
      const templatesData = await templatesResponse.json();
      
      set({ 
        templates: templatesData.templates,
        isLoading: false,
      });
      
      return data.template;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
}));
```

### 2. Template List Component

Update the template list component to show default indicators:

```jsx
// src/components/templates/template-list.jsx
import { useTemplateStore } from '@/lib/stores/template-store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { CloneTemplateDialog } from './clone-template-dialog';

export function TemplateList() {
  const { templates, isLoading } = useTemplateStore();
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  
  const handleCloneClick = (template) => {
    setSelectedTemplate(template);
    setCloneDialogOpen(true);
  };
  
  if (isLoading) {
    return <div>Loading templates...</div>;
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map(template => (
        <div key={template.id} className="border rounded-lg p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-medium">{template.name}</h3>
            {template.isDefault && (
              <Badge variant="secondary">Default</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {template.description || 'No description'}
          </p>
          <div className="flex justify-end space-x-2 mt-auto">
            <Button variant="outline" size="sm" asChild>
              <a href={`/templates/${template.id}`}>View</a>
            </Button>
            
            {template.isDefault ? (
              <Button size="sm" onClick={() => handleCloneClick(template)}>
                Clone
              </Button>
            ) : (
              <Button variant="default" size="sm" asChild>
                <a href={`/templates/${template.id}/edit`}>Edit</a>
              </Button>
            )}
          </div>
        </div>
      ))}
      
      <CloneTemplateDialog 
        open={cloneDialogOpen} 
        onOpenChange={setCloneDialogOpen}
        template={selectedTemplate}
      />
    </div>
  );
}
```

### 3. Clone Template Dialog Component

Create a new component for the clone dialog:

```jsx
// src/components/templates/clone-template-dialog.jsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTemplateStore } from '@/lib/stores/template-store';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function CloneTemplateDialog({ open, onOpenChange, template }) {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cloneTemplate = useTemplateStore(state => state.cloneTemplate);
  const router = useRouter();
  
  // Set default name when template changes
  useEffect(() => {
    if (template) {
      setName(`Copy of ${template.name}`);
    }
  }, [template]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!template || !name.trim()) return;
    
    setIsSubmitting(true);
    try {
      const clonedTemplate = await cloneTemplate(template.id, name);
      onOpenChange(false);
      router.push(`/templates/${clonedTemplate.id}/edit`);
    } catch (error) {
      console.error('Failed to clone template:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clone Template</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="py-4">
            <Label htmlFor="templateName">New Template Name</Label>
            <Input
              id="templateName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter template name"
              className="mt-1"
              required
            />
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting ? 'Cloning...' : 'Clone Template'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### 4. Template Detail Page

Update the template detail page to handle default templates:

```jsx
// src/app/templates/[id]/page.jsx
import { getTemplate } from '@/lib/services/template-service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CloneTemplateDialog } from '@/components/templates/clone-template-dialog';
import { useState } from 'react';

export default async function TemplatePage({ params }) {
  const template = await getTemplate(params.id);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{template.name}</h1>
          {template.isDefault && (
            <Badge variant="secondary" className="mt-1">Default Template</Badge>
          )}
        </div>
        
        <div className="flex space-x-3">
          {template.isDefault ? (
            <Button onClick={() => setCloneDialogOpen(true)}>
              Clone Template
            </Button>
          ) : (
            <Button asChild>
              <a href={`/templates/${template.id}/edit`}>Edit Template</a>
            </Button>
          )}
        </div>
      </div>
      
      {/* Template details content */}
      <div className="border rounded-lg p-6">
        {/* Template content here */}
      </div>
      
      <CloneTemplateDialog 
        open={cloneDialogOpen} 
        onOpenChange={setCloneDialogOpen}
        template={template}
      />
    </div>
  );
}
```

## Testing Plan

### 1. Unit Tests

Create unit tests for template service:

```javascript
// tests/template-service.test.js
import { 
  getTemplate, 
  updateTemplate, 
  deleteTemplate, 
  cloneTemplate 
} from '@/lib/services/template-service';
import { prisma } from '@/lib/db';

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    template: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
    },
  },
}));

describe('Template Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('updateTemplate', () => {
    it('should throw error when trying to update a default template', async () => {
      prisma.template.findUnique.mockResolvedValue({
        id: '1',
        name: 'Default Template',
        isDefault: true,
      });
      
      await expect(updateTemplate('1', { name: 'New Name' })).rejects.toThrow(
        'Default templates cannot be modified'
      );
      
      expect(prisma.template.update).not.toHaveBeenCalled();
    });
    
    it('should update a non-default template', async () => {
      prisma.template.findUnique.mockResolvedValue({
        id: '1',
        name: 'Custom Template',
        isDefault: false,
      });
      
      prisma.template.update.mockResolvedValue({
        id: '1',
        name: 'New Name',
        isDefault: false,
      });
      
      const result = await updateTemplate('1', { name: 'New Name' });
      
      expect(prisma.template.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { name: 'New Name' },
      });
      
      expect(result).toEqual({
        id: '1',
        name: 'New Name',
        isDefault: false,
      });
    });
  });
  
  // Additional tests for deleteTemplate and cloneTemplate...
});
```

### 2. Integration Tests

Create integration tests for API endpoints:

```javascript
// tests/api/templates.test.js
import { NextRequest } from 'next/server';
import { GET, PUT, DELETE } from '@/app/api/templates/[id]/route';
import { POST } from '@/app/api/templates/[id]/clone/route';
import * as templateService from '@/lib/services/template-service';

// Mock template service
jest.mock('@/lib/services/template-service');

describe('Template API Endpoints', () => {
  // tests for each endpoint...
});
```

### 3. E2E Tests

Create E2E tests with Playwright:

```javascript
// e2e/template-management.spec.js
import { test, expect } from '@playwright/test';

test('shows default badge for default templates', async ({ page }) => {
  await page.goto('/templates');
  
  const defaultTemplate = page.locator('.template-card:has-text("Standard Template")');
  await expect(defaultTemplate.locator('.badge')).toHaveText('Default');
});

test('shows clone button instead of edit for default templates', async ({ page }) => {
  await page.goto('/templates');
  
  const defaultTemplate = page.locator('.template-card:has-text("Standard Template")');
  await expect(defaultTemplate.locator('button:has-text("Clone")')).toBeVisible();
  await expect(defaultTemplate.locator('a:has-text("Edit")')).not.toBeVisible();
});

// Additional E2E tests...
```

## Deployment Plan

1. Create and test the changes in a development environment
2. Run database migrations in staging environment
3. Deploy updated code to staging
4. Test all template operations in staging
5. Schedule production deployment during low-traffic period
6. Back up production database before deploying
7. Run migrations in production
8. Deploy code to production
9. Verify functionality in production

## Conclusion

This technical implementation plan provides a detailed roadmap for implementing the template management requirements. By following this plan, we can create a clear distinction between default and custom templates, protect default templates from modifications, and provide intuitive cloning functionality.
