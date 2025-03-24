import { NextRequest, NextResponse } from 'next/server';
import fileSystemService from '@/lib/filesystem/filesystem-service';

// POST: Create a new directory
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
): Promise<NextResponse> {
  // Await the params to get the ID in Next.js 15
  const resolvedParams = await params;
  const id = resolvedParams.id;
  
  try {
    const body = await request.json();
    const { path: dirPath } = body;
    
    if (!dirPath) {
      return NextResponse.json(
        { error: 'Directory path is required' },
        { status: 400 }
      );
    }
    
    // Check if directory already exists
    const exists = await fileSystemService.exists(id, dirPath);
    if (exists) {
      return NextResponse.json(
        { error: 'Directory already exists' },
        { status: 409 }
      );
    }
    
    // Create directory
    await fileSystemService.createDirectory(id, dirPath);
    
    return NextResponse.json({
      path: dirPath,
      success: true,
      message: `Directory ${dirPath} created successfully`
    });
  } catch (error) {
    console.error('Error creating directory:', error);
    return NextResponse.json(
      { error: 'Failed to create directory' },
      { status: 500 }
    );
  }
}

// PUT: Rename a directory
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
): Promise<NextResponse> {
  // Await the params to get the ID in Next.js 15
  const resolvedParams = await params;
  const id = resolvedParams.id;
  
  try {
    const body = await request.json();
    const { oldPath, newPath } = body;
    
    if (!oldPath || !newPath) {
      return NextResponse.json(
        { error: 'Both old and new directory paths are required' },
        { status: 400 }
      );
    }
    
    // Check if source exists
    const sourceExists = await fileSystemService.exists(id, oldPath);
    if (!sourceExists) {
      return NextResponse.json(
        { error: 'Source directory does not exist' },
        { status: 404 }
      );
    }
    
    // Check if source is a directory
    const sourceStat = await fileSystemService.stat(id, oldPath);
    if (sourceStat.type !== 'directory') {
      return NextResponse.json(
        { error: 'Source is not a directory' },
        { status: 400 }
      );
    }
    
    // Check if destination already exists
    const destExists = await fileSystemService.exists(id, newPath);
    if (destExists) {
      return NextResponse.json(
        { error: 'Destination directory already exists' },
        { status: 409 }
      );
    }
    
    // Rename directory
    await fileSystemService.rename(id, oldPath, newPath);
    
    return NextResponse.json({
      oldPath,
      newPath,
      success: true,
      message: `Directory renamed from ${oldPath} to ${newPath}`
    });
  } catch (error) {
    console.error('Error renaming directory:', error);
    return NextResponse.json(
      { error: 'Failed to rename directory' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a directory
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
): Promise<NextResponse> {
  // Await the params to get the ID in Next.js 15
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const dirPath = request.nextUrl.searchParams.get('path');
  
  if (!dirPath) {
    return NextResponse.json(
      { error: 'Directory path is required' },
      { status: 400 }
    );
  }

  try {
    // Check if directory exists
    const exists = await fileSystemService.exists(id, dirPath);
    if (!exists) {
      return NextResponse.json(
        { error: 'Directory does not exist' },
        { status: 404 }
      );
    }
    
    // Check if it's a directory
    const stat = await fileSystemService.stat(id, dirPath);
    if (stat.type !== 'directory') {
      return NextResponse.json(
        { error: 'Path is not a directory' },
        { status: 400 }
      );
    }
    
    // Delete directory recursively
    await fileSystemService.delete(id, dirPath, { recursive: true });
    
    return NextResponse.json({
      path: dirPath,
      success: true,
      message: `Directory ${dirPath} deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting directory:', error);
    return NextResponse.json(
      { error: 'Failed to delete directory' },
      { status: 500 }
    );
  }
} 