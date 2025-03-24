// src/app/api/psadt-qdrant/sync/route.js
import { NextResponse } from 'next/server';
import { getPsadtQdrantDb } from '../../../../lib/psadt-qdrant-db';

// Make sure DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL environment variable is not set. Using default SQLite path.');
  process.env.DATABASE_URL = 'file:./psadt-pro.db';
}

export async function POST(request) {
  try {
    const { reset = false } = await request.json();
    
    // Initialize the Qdrant DB service
    const qdrantDb = getPsadtQdrantDb();
    
    // Reset the collection if requested
    if (reset) {
      await qdrantDb.resetCollection();
    }
    
    // Sync commands to Qdrant
    const stats = await qdrantDb.syncCommandsToQdrant();
    
    return NextResponse.json({ 
      message: `Successfully synced commands to Qdrant`,
      stats
    });
  } catch (error) {
    console.error('Error syncing commands to Qdrant:', error);
    return NextResponse.json(
      { error: `Failed to sync commands to Qdrant: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Initialize the Qdrant DB service
    const qdrantDb = getPsadtQdrantDb();
    
    // Get collection stats
    const stats = await qdrantDb.getCollectionStats();
    
    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error getting Qdrant stats:', error);
    return NextResponse.json(
      { error: `Failed to get Qdrant stats: ${error.message}` },
      { status: 500 }
    );
  }
}
