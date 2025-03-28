import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma'; // Import Prisma client
import path from 'path';
import fs from 'fs/promises'; // Use promises API
import { constants as fsConstants } from 'fs'; // For access check

// Helper function to safely join paths and prevent traversal
function safeJoin(base: string, target: string): string | null {
  const targetPath = path.join(base, target);
  // Check if the resolved path is still within the base directory
  if (targetPath.startsWith(base)) {
    return targetPath;
  }
  return null; // Path traversal detected or invalid path
}

// Basic check for binary files (looks for null bytes in the first chunk)
function isLikelyBinary(buffer: Buffer): boolean {
  // Check the first few bytes for null characters, common in binary files
  const sample = buffer.slice(0, Math.min(buffer.length, 512));
  return sample.includes(0);
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

    const searchParams = request.nextUrl.searchParams;
    const filePathQuery = searchParams.get('filepath');

    if (!templateId) {
      return NextResponse.json({ error: 'Missing templateId' }, { status: 400 });
    }
    if (filePathQuery === null || filePathQuery === undefined) {
      return NextResponse.json({ error: 'Missing filepath query parameter' }, { status: 400 });
    }

    // Decode and normalize the filepath
    const requestedPath = decodeURIComponent(filePathQuery).replace(/\\/g, '/'); // Normalize slashes

    console.log(`[API /files/content] User: ${userId}, Template: ${templateId}, Path: ${requestedPath}`);

    // Fetch template from database to get storagePath
    const template = await prisma.template.findUnique({
      where: { id: templateId, userId: userId }, // Ensure user owns the template
    });

    if (!template) {
      console.warn(`[API /files/content] Template not found or user mismatch: ${templateId}`);
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
          console.log(`[API /files/content] Using storagePath from metadata for template ${templateId}: ${storagePath}`);
        } else {
           console.log(`[API /files/content] Metadata for template ${templateId} does not contain a valid 'storagePath' string.`);
        }
      } catch (parseError) {
        console.error(`[API /files/content] Failed to parse metadata JSON for template ${templateId}:`, parseError);
        // Proceed without metadata path if parsing fails
      }
    }

    // If still no path after checking metadata, return error
    if (!storagePath) {
      console.error(`[API /files/content] Template ${templateId} is missing storagePath and valid metadata path.`);
      return NextResponse.json({ error: 'Template configuration error (missing path)' }, { status: 500 });
    }

    // Prepend 'storage' directory to the path from DB/metadata
    const baseTemplateDir = path.resolve(process.cwd(), 'storage', storagePath);
    console.log(`[API /files/content] Using base directory: ${baseTemplateDir}`);

    // Construct the full, safe path to the target file/directory
    const targetPath = safeJoin(baseTemplateDir, requestedPath);

    if (!targetPath) {
      console.error(`[API /files/content] Invalid path or traversal attempt: ${requestedPath}`);
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    // Check if the path exists and get stats
    let stats;
    try {
      await fs.access(targetPath, fsConstants.R_OK); // Check read access first
      stats = await fs.stat(targetPath);
    } catch (statError: any) {
      if (statError.code === 'ENOENT') {
        console.warn(`[API /files/content] Path not found: ${targetPath}`);
        return NextResponse.json({ error: 'File or directory not found' }, { status: 404 });
      }
      console.error(`[API /files/content] Error accessing path ${targetPath}:`, statError);
      return NextResponse.json({ error: 'Error accessing file system', details: statError.message }, { status: 500 });
    }

    // Handle Directory
    if (stats.isDirectory()) {
      console.log(`[API /files/content] Path is a directory: ${targetPath}`);
      const dirents = await fs.readdir(targetPath, { withFileTypes: true });
      const items = dirents.map(dirent => ({
        name: dirent.name,
        // Path relative to the *requested* directory for consistency with frontend expectations
        path: path.join(requestedPath, dirent.name).replace(/\\/g, '/'), 
        type: dirent.isDirectory() ? 'directory' : 'file',
      }));
      return NextResponse.json({ type: 'directory', items });
    }
    // Handle File
    else if (stats.isFile()) {
      console.log(`[API /files/content] Path is a file: ${targetPath}`);
      const fileBuffer = await fs.readFile(targetPath);
      const isBinary = isLikelyBinary(fileBuffer);
      const content = isBinary ? fileBuffer.toString('base64') : fileBuffer.toString('utf8');
      
      console.log(`[API /files/content] Read file, binary: ${isBinary}, size: ${fileBuffer.length}`);
      
      return NextResponse.json({
        type: 'file',
        content: content,
        binary: isBinary,
        size: fileBuffer.length,
      });
    }
    // Handle Other (shouldn't happen with stat check)
    else {
      console.error(`[API /files/content] Path is not a file or directory: ${targetPath}`);
      return NextResponse.json({ error: 'Invalid path type' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('[API /files/content] General error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}