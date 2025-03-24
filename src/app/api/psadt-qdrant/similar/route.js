// src/app/api/psadt-qdrant/similar/route.js
import { NextResponse } from 'next/server';
import { getPsadtQdrantDb } from '../../../../lib/psadt-qdrant-db';

export async function POST(request) {
  try {
    const { commandId, options = {} } = await request.json();
    
    if (!commandId) {
      return NextResponse.json(
        { error: 'Command ID is required' },
        { status: 400 }
      );
    }
    
    // Validate options
    const validOptions = {
      version: options.version,
      limit: options.limit || 5,
      includeExamples: options.includeExamples,
    };
    
    // Initialize the Qdrant DB service
    const qdrantDb = getPsadtQdrantDb();
    
    // Find similar commands
    const results = await qdrantDb.findSimilarCommands(commandId, validOptions);
    
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error finding similar commands:', error);
    return NextResponse.json(
      { error: `Failed to find similar commands: ${error.message}` },
      { status: 500 }
    );
  }
}
