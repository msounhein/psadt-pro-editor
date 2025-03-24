/**
 * API Route: /api/psadt-qdrant/search
 * 
 * Handles search requests using Qdrant for vector similarity search.
 */

import { NextResponse } from 'next/server';
import PsadtQdrantDb from '@/lib/psadt-qdrant-db';

export async function POST(request) {
  try {
    const { query, useSparse = true, limit = 5, type = 'commands' } = await request.json();
    
    if (!query || typeof query !== 'string' || query.trim() === '') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }
    
    // Initialize the database service
    const qdrantDb = new PsadtQdrantDb();
    
    let results;
    if (type === 'documentation') {
      // Search documentation (dense embeddings)
      results = await qdrantDb.searchDocumentation(query, limit);
    } else {
      // Search commands (sparse BM25 embeddings by default)
      results = await qdrantDb.searchCommands(query, limit);
    }
    
    // Process results
    const processed = results.map(result => ({
      ...result.payload,
      score: result.score
    }));
    
    return NextResponse.json({ 
      results: processed,
      query,
      type,
      useSparse,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error searching:', error);
    return NextResponse.json(
      { error: 'Failed to search', message: error.message },
      { status: 500 }
    );
  }
}
