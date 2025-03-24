// src/app/api/psadt-qdrant/clear/route.js
import { NextResponse } from 'next/server';
import { getPsadtQdrantDb } from '../../../../lib/psadt-qdrant-db';

export async function POST() {
  try {
    // Initialize the Qdrant DB service
    const qdrantDb = getPsadtQdrantDb();
    
    // Reset the collection but don't sync afterward
    await qdrantDb.resetCollection();
    
    return NextResponse.json({ 
      message: `Successfully cleared Qdrant database collection`
    });
  } catch (error) {
    console.error('Error clearing Qdrant database:', error);
    return NextResponse.json(
      { error: `Failed to clear Qdrant database: ${error.message}` },
      { status: 500 }
    );
  }
}
