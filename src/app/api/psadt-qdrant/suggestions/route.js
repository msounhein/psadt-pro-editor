// src/app/api/psadt-qdrant/suggestions/route.js
import { NextResponse } from 'next/server';
import { getPsadtQdrantDb } from '../../../../lib/psadt-qdrant-db';

export async function POST(request) {
  try {
    const { codeContext, options = {} } = await request.json();
    
    if (!codeContext) {
      return NextResponse.json(
        { error: 'Code context is required' },
        { status: 400 }
      );
    }
    
    // Validate options
    const validOptions = {
      version: options.version,
      limit: options.limit || 5,
      includeDeprecated: options.includeDeprecated,
    };
    
    // Initialize the Qdrant DB service
    const qdrantDb = getPsadtQdrantDb();
    
    // Get contextual suggestions
    const results = await qdrantDb.getContextualSuggestions(codeContext, validOptions);
    
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error getting contextual suggestions:', error);
    return NextResponse.json(
      { error: `Failed to get contextual suggestions: ${error.message}` },
      { status: 500 }
    );
  }
}
