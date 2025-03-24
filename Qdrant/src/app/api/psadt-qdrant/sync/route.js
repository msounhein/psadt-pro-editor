/**
 * API Route: /api/psadt-qdrant/sync
 * 
 * Handles syncing PSADT data from the Prisma database to Qdrant.
 */

import { NextResponse } from 'next/server';
import PsadtQdrantDb from '@/lib/psadt-qdrant-db';

export async function POST(request) {
  try {
    const { reset = false, type = 'all' } = await request.json();
    
    // Initialize the database service
    const qdrantDb = new PsadtQdrantDb();
    
    let result;
    
    if (reset) {
      // Reset and sync all collections
      result = await qdrantDb.resetAndSyncAll();
    } else if (type === 'commands') {
      // Sync only commands
      const commandsCount = await qdrantDb.syncCommands();
      result = { commandsCount };
    } else if (type === 'documentation') {
      // Sync only documentation
      const docsCount = await qdrantDb.syncDocumentation();
      result = { docsCount };
    } else {
      // Sync both without resetting
      const commandsCount = await qdrantDb.syncCommands();
      const docsCount = await qdrantDb.syncDocumentation();
      result = { commandsCount, docsCount };
    }
    
    return NextResponse.json({ 
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error syncing data:', error);
    return NextResponse.json(
      { error: 'Failed to sync data', message: error.message },
      { status: 500 }
    );
  }
}
