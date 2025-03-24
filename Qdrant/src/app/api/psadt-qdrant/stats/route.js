/**
 * API Route: /api/psadt-qdrant/stats
 * 
 * Returns statistics about Qdrant collections.
 */

import { NextResponse } from 'next/server';
import PsadtQdrantDb from '@/lib/psadt-qdrant-db';

export async function GET() {
  try {
    // Initialize the database service
    const qdrantDb = new PsadtQdrantDb();
    
    // Get statistics for all collections
    const stats = await qdrantDb.getStatistics();
    
    return NextResponse.json({
      ...stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics', message: error.message },
      { status: 500 }
    );
  }
}
