import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { 
  listFilesAction, 
  createPowerShellScriptAction 
} from '@/lib/filesystem/file-actions';
import { ensureTemplateDirectory } from '@/lib/filesystem/ensure-template-directories';

// Get the storage path from environment variables or use default
const STORAGE_PATH = process.env.FILE_STORAGE_PATH || './storage';

/**
 * GET - Retrieve files for a specific template
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
): Promise<NextResponse> {
  try {
    // Await the params to get the ID in Next.js 15
    const resolvedParams = await params;
    const id = resolvedParams.id;
    console.log(`[FILES API] Request to list files for template ID: ${id}`);
    const relativePath = request.nextUrl.searchParams.get('filepath') || '';
    console.log(`[FILES API] Relative path: "${relativePath}"`);

    try {
      // First, ensure the template directory exists
      console.log(`[FILES API] Ensuring template directory exists for ID: ${id}`);
      const directoryExists = await ensureTemplateDirectory(id);
      
      if (!directoryExists) {
        console.log(`[FILES API] Failed to ensure template directory exists`);
        return NextResponse.json(
          { error: 'Template directory could not be created', message: 'Please check server logs for details' },
          { status: 500 }
        );
      }
      
      // Now fetch the template from the database to get the storagePath
      console.log(`[FILES API] Fetching template from database with ID: ${id}`);
      const template = await prisma.template.findUnique({
        where: { id },
        select: { storagePath: true, name: true, metadata: true }
      });
      
      console.log(`[FILES API] Template data:`, JSON.stringify(template, null, 2));
      
      if (!template) {
        console.log(`[FILES API] Template not found with ID: ${id}`);
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }
      
      // Use the storagePath from the database if available, otherwise fall back to just the ID
      const templatePath = template.storagePath || 
                           // Extract value from metadata if it exists as a JSON field
                           (template.metadata ? 
                            extractStoragePathFromMetadata(template.metadata) : 
                            id);
      console.log(`[FILES API] Using template path from database: ${templatePath}`);
      
      // List files using our server action with the correct template path
      console.log(`[FILES API] Calling listFilesAction with path: ${templatePath}`);
      const files = await listFilesAction(templatePath, relativePath);
      console.log(`[FILES API] Files found: ${files ? files.length : 0}`);
      if (files) {
        console.log(`[FILES API] File list:`, JSON.stringify(files, null, 2));
      }
      
      // If no files exist, create a default PowerShell script file
      if (!files || files.length === 0) {
        console.log(`[FILES API] No files found. Creating default script file.`);
        
        try {
          // Create a default PowerShell script using server action
          const success = await createPowerShellScriptAction(templatePath, 'script.ps1');
          console.log(`[FILES API] Create script result: ${success}`);
          
          if (success) {
            // Re-read the directory
            console.log(`[FILES API] Re-reading directory after creating file`);
            const updatedFiles = await listFilesAction(templatePath, relativePath);
            console.log(`[FILES API] Updated files count: ${updatedFiles?.length || 0}`);
            if (updatedFiles) {
              console.log(`[FILES API] Updated file list:`, JSON.stringify(updatedFiles, null, 2));
            }
            
            return NextResponse.json({ files: updatedFiles || [] });
          } else {
            console.log(`[FILES API] Failed to create default script file`);
            return NextResponse.json({ files: [] });
          }
        } catch (createError) {
          console.error(`[FILES API] Error creating default file:`, createError);
          // Return empty array instead of error to avoid breaking the UI
          return NextResponse.json({ files: [] });
        }
      }
      
      console.log(`[FILES API] Returning ${files?.length || 0} files`);
      return NextResponse.json({ files: files || [] });
    } catch (dbError) {
      console.error('[FILES API] Database error:', dbError);
      // Return a formatted error response
      return NextResponse.json(
        { error: 'Database error', message: String(dbError) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[FILES API] Unhandled error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: String(error) },
      { status: 500 }
    );
  }
}

// Helper function to extract storagePath from metadata JSON
function extractStoragePathFromMetadata(metadata: string): string | null {
  try {
    // Parse the metadata JSON
    const metadataObj = JSON.parse(metadata);
    
    // Check if storagePath exists in the metadata
    if (metadataObj && metadataObj.storagePath) {
      console.log(`[FILES API] Found storagePath in metadata: ${metadataObj.storagePath}`);
      return metadataObj.storagePath;
    }
    
    return null;
  } catch (error) {
    console.error(`[FILES API] Error extracting storagePath from metadata:`, error);
    return null;
  }
} 