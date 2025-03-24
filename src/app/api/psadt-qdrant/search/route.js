// src/app/api/psadt-qdrant/search/route.js
import { NextResponse } from 'next/server';
import { getPsadtQdrantDb } from '../../../../lib/psadt-qdrant-db';

export async function POST(request) {
  try {
    const { query, options = {} } = await request.json();
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }
    
    // Validate options
    const validOptions = {
      version: options.version,
      limit: options.limit || 10,
      offset: options.offset || 0,
      includeDeprecated: options.includeDeprecated,
      includeExamples: options.includeExamples,
      onlyExamples: options.onlyExamples,
    };
    
    // Initialize the Qdrant DB service
    const qdrantDb = getPsadtQdrantDb();
    
    // Perform the search
    const results = await qdrantDb.searchCommands(query, validOptions);
    
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error searching commands:', error);
    return NextResponse.json(
      { error: `Failed to search commands: ${error.message}` },
      { status: 500 }
    );
  }
}
