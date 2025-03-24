import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import fs from 'fs';
import path from 'path';
import fileSystemService from '@/lib/filesystem/filesystem-service';

// Get the storage path from environment variables or use default
const STORAGE_PATH = process.env.FILE_STORAGE_PATH || './storage';

// Binary file extensions to handle differently
const BINARY_EXTENSIONS = [
  '.exe', '.dll', '.bin', '.obj', '.png', '.jpg', '.jpeg', '.gif', '.ico', 
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.zip', '.rar'
];

/**
 * Helper function to get the template's storage path from the database
 */
async function getTemplateStoragePath(id: string): Promise<string | null> {
  try {
    const template = await prisma.template.findUnique({
      where: { id },
      select: { storagePath: true, metadata: true }
    });
    
    if (!template) {
      return null;
    }
    
    // Try to get storagePath from different sources
    if (template.storagePath) {
      return template.storagePath;
    } else if (template.metadata) {
      // Try to extract from metadata JSON
      try {
        const metadataObj = JSON.parse(template.metadata);
        if (metadataObj && metadataObj.storagePath) {
          console.log(`[GET FILE] Found storagePath in metadata: ${metadataObj.storagePath}`);
          return metadataObj.storagePath;
        }
      } catch (error) {
        console.error(`[GET FILE] Error parsing metadata JSON:`, error);
      }
    }
    
    // Fall back to just using the ID
    return id;
  } catch (error) {
    console.error(`Error getting template storage path for ${id}:`, error);
    return null;
  }
}

/**
 * GET - Retrieve a specific file's content from a template
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
): Promise<NextResponse> {
  // Await the params to get the ID in Next.js 15
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const filepath = request.nextUrl.searchParams.get('filepath');
  
  if (!filepath) {
    return NextResponse.json(
      { error: 'File path is required' },
      { status: 400 }
    );
  }

  try {
    // Get the template storage path from the database
    const templatePath = await getTemplateStoragePath(id);
    if (!templatePath) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }
    
    console.log(`Using template path from database for file content: ${templatePath}`);
    
    // Check if the file exists
    const exists = await fileSystemService.exists(templatePath, filepath);
    if (!exists) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }
    
    // Get file stats to check if it's a directory
    const stats = await fileSystemService.stat(templatePath, filepath);
    
    // Handle directory differently
    if (stats.type === 'directory') {
      console.log(`[GET FILE] Path ${filepath} is a directory, returning directory info`);
      
      // List files in the directory
      const directoryContents = await fileSystemService.readDirectory(templatePath, filepath);
      
      return NextResponse.json({
        path: filepath,
        isDirectory: true,
        content: null,
        type: 'directory',
        children: directoryContents.map(item => ({
          name: item.name,
          path: item.path,
          type: item.type
        }))
      });
    }
    
    // Continue with file handling...
    // Check if this is a binary file based on extension
    const extension = filepath.substring(filepath.lastIndexOf('.')).toLowerCase();
    const isBinary = BINARY_EXTENSIONS.includes(extension);
    
    if (isBinary) {
      // For binary files, return info but not content
      const stats = await fileSystemService.stat(templatePath, filepath);
      return NextResponse.json({
        path: filepath,
        size: stats.size,
        isBinary: true,
        content: null,
        message: 'Binary file detected - content not loaded'
      });
    }
    
    // Read text file content
    const content = await fileSystemService.readTextFile(templatePath, filepath);
    
    // Return the file content
    return NextResponse.json({
      path: filepath,
      content,
      isBinary: false
    });
  } catch (error) {
    console.error('Error reading file:', error);
    return NextResponse.json(
      { error: 'Failed to read file' },
      { status: 500 }
    );
  }
}

/**
 * POST - Save changes to a file in a template
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
): Promise<NextResponse> {
  // Await the params to get the ID in Next.js 15
  const resolvedParams = await params;
  const id = resolvedParams.id;
  
  try {
    // Get the template storage path from the database
    const templatePath = await getTemplateStoragePath(id);
    if (!templatePath) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }
    
    const body = await request.json();
    const { path: filepath, content = '' } = body;
    
    if (!filepath) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      );
    }
    
    // Check if file already exists
    const exists = await fileSystemService.exists(templatePath, filepath);
    if (exists) {
      return NextResponse.json(
        { error: 'File already exists' },
        { status: 409 }
      );
    }
    
    // Create the file
    await fileSystemService.writeTextFile(templatePath, filepath, content);
    
    return NextResponse.json({
      path: filepath,
      success: true,
      message: 'File created successfully'
    });
  } catch (error) {
    console.error('Error creating file:', error);
    return NextResponse.json(
      { error: 'Failed to create file' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update a file in a template
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
): Promise<NextResponse> {
  // Await the params to get the ID in Next.js 15
  const resolvedParams = await params;
  const id = resolvedParams.id;
  
  try {
    // Get the template storage path from the database
    const templatePath = await getTemplateStoragePath(id);
    if (!templatePath) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }
    
    const body = await request.json();
    const { path: filepath, content } = body;
    
    if (!filepath) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      );
    }
    
    if (content === undefined || content === null) {
      return NextResponse.json(
        { error: 'File content is required' },
        { status: 400 }
      );
    }
    
    // Write the file
    await fileSystemService.writeTextFile(templatePath, filepath, content);
    
    return NextResponse.json({
      path: filepath,
      success: true,
      message: 'File updated successfully'
    });
  } catch (error) {
    console.error('Error writing file:', error);
    return NextResponse.json(
      { error: 'Failed to write file' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete a file from a template
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
): Promise<NextResponse> {
  // Await the params to get the ID in Next.js 15
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const filepath = request.nextUrl.searchParams.get('path');
  
  if (!filepath) {
    return NextResponse.json(
      { error: 'File path is required' },
      { status: 400 }
    );
  }

  try {
    // Get the template storage path from the database
    const templatePath = await getTemplateStoragePath(id);
    if (!templatePath) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }
    
    // Check if the file exists
    const exists = await fileSystemService.exists(templatePath, filepath);
    if (!exists) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }
    
    // Delete the file
    await fileSystemService.delete(templatePath, filepath);
    
    return NextResponse.json({
      path: filepath,
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to determine if a file is binary based on extension
 */
function isBinaryFile(filePath: string): boolean {
  const extension = path.extname(filePath).toLowerCase();
  const binaryExtensions = [
    '.exe', '.dll', '.pdb', '.zip', '.rar', '.7z', '.gz', '.tar',
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.svg', '.webp',
    '.mp3', '.mp4', '.wav', '.avi', '.mov', '.pdf', '.doc', '.docx',
    '.xls', '.xlsx', '.ppt', '.pptx', '.bin', '.iso', '.msi'
  ];
  
  return binaryExtensions.includes(extension);
} 