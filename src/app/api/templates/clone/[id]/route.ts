import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import path from "path";
import fs from "fs/promises";
import { ensureDirectory } from "@/lib/filesystem/ensure-template-directories";

/**
 * POST handler for cloning a template
 * Creates a new template record and copies all files from source template
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Get the session to identify the user
    const session = await getServerSession(authOptions);

    // Require authentication for all requests
    if (!session?.user?.id) {
      console.log("Clone Template API: Unauthorized request - no session user ID");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const { id } = params;
    
    console.log(`Clone Template API: Cloning template ${id} for user: ${userId}`);

    // Get request body
    const body = await request.json();
    const { newName, description } = body;
    
    if (!newName || newName.trim() === "") {
      return NextResponse.json(
        { error: "New template name is required" },
        { status: 400 }
      );
    }

    // Get source template
    const sourceTemplate = await prisma.template.findUnique({
      where: { id }
    });

    if (!sourceTemplate) {
      console.log(`Clone Template API: Template ${id} not found`);
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Verify user has access to this template
    if (sourceTemplate.userId !== userId) {
      console.log(`Clone Template API: User ${userId} does not have permission to clone template ${id}`);
      return NextResponse.json(
        { error: "You don't have permission to clone this template" },
        { status: 403 }
      );
    }

    // Define storage paths
    const storageDir = process.env.STORAGE_DIR || "storage";
    
    // Source path (where files are copied from)
    const sourcePath = sourceTemplate.storagePath || path.join(
      storageDir,
      "templates",
      userId,
      sourceTemplate.type || "Default",
      sourceTemplate.name
    );
    
    // Target path (where files are copied to) - always in "Custom" directory
    const targetPath = path.join(
      storageDir,
      "templates",
      userId,
      "Custom",
      newName
    );
    
    console.log(`Clone Template API: Source path: ${sourcePath}`);
    console.log(`Clone Template API: Target path: ${targetPath}`);

    try {
      // Create the new template record
      const newTemplate = await prisma.template.create({
        data: {
          name: newName,
          description: description || `Cloned from ${sourceTemplate.name}`,
          packageType: sourceTemplate.packageType,
          userId,
          type: "Custom",  // Always mark cloned templates as Custom
          version: sourceTemplate.version,
          storagePath: targetPath,
          extractionStatus: "complete",  // Mark as already extracted
          metadata: sourceTemplate.metadata, // Copy any metadata
        }
      });
      
      // Ensure target directory exists
      await ensureDirectory(path.dirname(targetPath));
      
      // Check if source path exists
      const sourceExists = await fs.stat(sourcePath).catch(() => false);
      
      // Copy template files if source exists
      if (sourceExists) {
        await fs.cp(sourcePath, targetPath, { recursive: true });
        console.log(`Clone Template API: Files copied from ${sourcePath} to ${targetPath}`);
      } else {
        console.log(`Clone Template API: Source path ${sourcePath} does not exist, skipping file copy`);
      }
      
      return NextResponse.json({
        success: true,
        template: newTemplate
      }, { status: 201 });
    } catch (error) {
      console.error("Clone Template API: Error during cloning process:", error);
      return NextResponse.json(
        { error: "Failed to clone template" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Clone Template API: Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}