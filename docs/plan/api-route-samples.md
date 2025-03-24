# Template Management API Route Samples

This document provides sample implementations for the API routes needed to support the template management system.

## Clone Template API Route

The following is a sample implementation for the API route to clone a template.

```javascript
// src/app/api/templates/clone/[id]/route.js

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { exec } from "child_process";
import path from "path";
import { promisify } from "util";

const prisma = new PrismaClient();
const execPromise = promisify(exec);

export async function POST(request, { params }) {
  const { id } = params;
  const { newName, description, userId } = await request.json();

  if (!id || !newName || !userId) {
    return NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 }
    );
  }

  try {
    // 1. Get the source template
    const sourceTemplate = await prisma.template.findUnique({
      where: { id },
    });

    if (!sourceTemplate) {
      return NextResponse.json(
        { error: "Source template not found" },
        { status: 404 }
      );
    }

    // 2. Create the new template record (always as Custom type)
    const newTemplate = await prisma.template.create({
      data: {
        name: newName,
        description: description || `Cloned from ${sourceTemplate.name}`,
        packageType: sourceTemplate.packageType,
        userId,
        isPublic: sourceTemplate.isPublic,
        isDefault: false,
        type: "Custom", // Always set as Custom
        version: sourceTemplate.version,
        extractionStatus: "pending", // Start as pending until files are copied
        extractionPath: `${userId}/Custom/${newName}`,
        storagePath: `${userId}/Custom/${newName}`,
        metadata: JSON.stringify({
          clonedFrom: id,
          originalName: sourceTemplate.name,
          clonedAt: new Date().toISOString(),
          // Add other metadata from source if needed
        }),
      },
    });

    // 3. Launch PowerShell script to copy files (asyncs)
    const scriptPath = path.join(process.cwd(), "scripts", "clone-template-files.ps1");
    const cmd = `powershell -ExecutionPolicy Bypass -File "${scriptPath}" -sourceTemplateId "${id}" -targetTemplateId "${newTemplate.id}"`;
    
    // Run script in background (don't await)
    execPromise(cmd)
      .then(() => console.log(`Template files copied successfully: ${newTemplate.id}`))
      .catch((error) => console.error(`Error copying template files: ${error.message}`));

    // 4. Return success with the new template info
    return NextResponse.json({
      template: newTemplate,
      message: "Template cloned successfully. Files are being copied in the background.",
    });
  } catch (error) {
    console.error("Error cloning template:", error);
    return NextResponse.json(
      { error: error.message || "Failed to clone template" },
      { status: 500 }
    );
  }
}
```

## Template Type Validation API Route

The following is a sample implementation for middleware to protect Default templates from being edited:

```javascript
// src/app/api/templates/[id]/route.js

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Helper function to check if template is editable
async function isTemplateEditable(id) {
  const template = await prisma.template.findUnique({
    where: { id },
    select: { type: true }
  });
  
  // Only Custom templates can be edited
  return template && template.type === "Custom";
}

// GET endpoint - Get template details
export async function GET(request, { params }) {
  const { id } = params;
  
  try {
    const template = await prisma.template.findUnique({
      where: { id }
    });
    
    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ template });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to get template" },
      { status: 500 }
    );
  }
}

// PUT endpoint - Update template
export async function PUT(request, { params }) {
  const { id } = params;
  const data = await request.json();
  
  try {
    // Check if template is editable
    const editable = await isTemplateEditable(id);
    
    if (!editable) {
      return NextResponse.json(
        { 
          error: "Default templates cannot be modified directly. Please clone the template first.",
          canClone: true 
        },
        { status: 403 }
      );
    }
    
    // Proceed with update
    const template = await prisma.template.update({
      where: { id },
      data
    });
    
    return NextResponse.json({ template });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to update template" },
      { status: 500 }
    );
  }
}

// DELETE endpoint - Delete template
export async function DELETE(request, { params }) {
  const { id } = params;
  
  try {
    // All templates can be deleted, regardless of type
    const template = await prisma.template.delete({
      where: { id }
    });
    
    return NextResponse.json({ 
      template,
      message: "Template deleted successfully" 
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to delete template" },
      { status: 500 }
    );
  }
}
```

## Templates List API Route with Type Filtering

The following is a sample implementation for the API route to list templates with type filtering:

```javascript
// src/app/api/templates/route.js

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  const type = url.searchParams.get("type"); // Filter by type (Default, Custom, or null for all)
  
  try {
    // Build the where clause
    const where = {};
    
    // Filter by user if provided
    if (userId) {
      where.userId = userId;
    }
    
    // Filter by type if provided
    if (type && (type === "Default" || type === "Custom")) {
      where.type = type;
    }
    
    // Get templates
    const templates = await prisma.template.findMany({
      where,
      orderBy: {
        createdAt: "desc"
      }
    });
    
    // Count totals
    const totalDefault = await prisma.template.count({
      where: {
        ...where,
        type: "Default"
      }
    });
    
    const totalCustom = await prisma.template.count({
      where: {
        ...where,
        type: "Custom"
      }
    });
    
    return NextResponse.json({
      templates,
      counts: {
        total: templates.length,
        default: totalDefault,
        custom: totalCustom
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch templates" },
      { status: 500 }
    );
  }
}
```

## Template Creation API Route

The following is a sample implementation for creating templates with the type field:

```javascript
// src/app/api/templates/route.js (POST method)

export async function POST(request) {
  const data = await request.json();
  
  // Ensure required fields
  if (!data.name || !data.userId) {
    return NextResponse.json(
      { error: "Missing required fields: name, userId" },
      { status: 400 }
    );
  }
  
  try {
    // Set type (default to "Custom" if not provided)
    const type = data.type === "Default" ? "Default" : "Custom";
    
    // Create template with appropriate path based on type
    const extractionPath = `${data.userId}/${type}/${data.name}`;
    
    const template = await prisma.template.create({
      data: {
        ...data,
        type,
        extractionPath,
        storagePath: extractionPath,
        isDefault: type === "Default"
      }
    });
    
    return NextResponse.json({
      template,
      message: `${type} template created successfully`
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to create template" },
      { status: 500 }
    );
  }
}
```

These API route implementations can be used as a reference when integrating the template management system into the application.
