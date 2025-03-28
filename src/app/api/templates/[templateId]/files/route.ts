import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import path from 'path';
import fs from 'fs/promises';
import { constants as fsConstants } from 'fs';

// Recursive function to list all files within a directory
async function listFilesRecursive(dirPath: string, basePath: string): Promise<string[]> {
  let filesList: string[] = [];
  try {
    // Wrap the readdir call itself in the try block
    const dirents = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const dirent of dirents) {
      const fullPath = path.join(dirPath, dirent.name);
      const relativePath = path.relative(basePath, fullPath).replace(/\\/g, '/'); // Get path relative to base

      try { // Add inner try/catch for recursive call robustness
        if (dirent.isDirectory()) {
          // Optionally add directory paths themselves if needed by frontend
          // filesList.push(relativePath + '/');
          filesList = filesList.concat(await listFilesRecursive(fullPath, basePath));
        } else {
          filesList.push(relativePath);
        }
      } catch (innerError: any) {
         // Log errors from recursive calls but continue processing other files/dirs
         console.warn(`[API /files] Error processing item ${fullPath}: ${innerError.message}`);
      }
    }
  } catch (error: any) {
    // Catch errors reading the initial directory (e.g., permissions)
    console.error(`[API /files] Failed to read directory ${dirPath}: ${error.message}`);
    // Re-throw the error to be caught by the main handler, resulting in 500
    throw error;
  }
  return filesList;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;
    const templateId = params.templateId;

    if (!templateId) {
      return NextResponse.json({ error: 'Missing templateId' }, { status: 400 });
    }

    console.log(`[API /files] User: ${userId}, Template: ${templateId}`);

    // Fetch template from database to get storagePath
    const template = await prisma.template.findUnique({
      where: { id: templateId, userId: userId },
    });

    if (!template) {
      console.warn(`[API /files] Template not found or user mismatch: ${templateId}`);
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Determine the base directory path
    let storagePath = template.storagePath; // Prioritize dedicated field

    // If storagePath is missing, try parsing metadata JSON
    if (!storagePath && template.metadata) {
      try {
        const metadata = JSON.parse(template.metadata);
        // Check for 'storagePath' key within the metadata JSON
        if (metadata && typeof metadata.storagePath === 'string') {
          storagePath = metadata.storagePath;
          console.log(`[API /files] Using storagePath from metadata for template ${templateId}: ${storagePath}`);
        } else {
          console.log(`[API /files] Metadata for template ${templateId} does not contain a valid 'storagePath' string.`);
        }
      } catch (parseError) {
        console.error(`[API /files] Failed to parse metadata JSON for template ${templateId}:`, parseError);
        // Proceed without metadata path if parsing fails
      }
    }

    // If still no path after checking metadata, return error
    if (!storagePath) {
      console.error(`[API /files] Template ${templateId} is missing storagePath and valid metadata path.`);
      return NextResponse.json({ error: 'Template configuration error (missing path)' }, { status: 500 });
    }

    // Prepend 'storage' directory to the path from DB/metadata
    const baseTemplateDir = path.resolve(process.cwd(), 'storage', storagePath);
    console.log(`[API /files] Using base directory: ${baseTemplateDir}`);

    // Check if base directory exists
    try {
      await fs.access(baseTemplateDir, fsConstants.R_OK);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.warn(`[API /files] Base directory not found: ${baseTemplateDir}`);
        // Return empty list if base directory doesn't exist
        return NextResponse.json({ files: [] }); 
      }
      console.error(`[API /files] Error accessing base directory ${baseTemplateDir}:`, error);
      return NextResponse.json({ error: 'Error accessing template storage', details: error.message }, { status: 500 });
    }

    // List files recursively
    const files = await listFilesRecursive(baseTemplateDir, baseTemplateDir);
    console.log(`[API /files] Found ${files.length} files.`);

    return NextResponse.json({ files });

  } catch (error: any) {
    console.error('[API /files] General error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}