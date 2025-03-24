import { NextRequest, NextResponse } from 'next/server';
import fileSystemService from '@/lib/filesystem/filesystem-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
): Promise<NextResponse> {
  // Await the params to get the ID in Next.js 15
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const searchQuery = request.nextUrl.searchParams.get('query');
  
  if (!searchQuery) {
    return NextResponse.json(
      { error: 'Search query is required' },
      { status: 400 }
    );
  }

  try {
    // Search for files using our filesystem service
    const results = await fileSystemService.searchFiles(id, searchQuery);
    
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error searching files:', error);
    return NextResponse.json(
      { error: 'Failed to search files' },
      { status: 500 }
    );
  }
} 