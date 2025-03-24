import { NextResponse } from 'next/server';
import { PsadtQdrantDb } from '@/lib/psadt-qdrant-db';

/**
 * Debug endpoint for testing Qdrant connection and embedding generation
 */
export async function GET(request) {
  try {
    const debugInfo = {
      status: 'Initializing',
      qdrantConnection: false,
      embeddingGeneration: false,
      collectionInfo: null,
      testEmbedding: null,
      environment: {
        qdrantUrl: process.env.QDRANT_URL ? 'Set' : 'Not set',
        qdrantApiKey: process.env.QDRANT_API_KEY ? 'Set' : 'Not set',
        embeddingApiUrl: process.env.EMBEDDING_API_URL ? 'Set' : 'Not set',
        embeddingApiKey: process.env.EMBEDDING_API_KEY ? 'Set' : 'Not set',
      },
      errors: []
    };

    // Initialize the Qdrant DB service
    debugInfo.status = 'Creating PsadtQdrantDb instance';
    const qdrantDb = new PsadtQdrantDb();
    
    // Test Qdrant connection
    try {
      debugInfo.status = 'Testing Qdrant connection';
      await qdrantDb.initialize();
      debugInfo.qdrantConnection = true;
      
      // Get collection info
      debugInfo.status = 'Getting collection stats';
      const collectionStats = await qdrantDb.getCollectionStats();
      debugInfo.collectionInfo = collectionStats;
    } catch (error) {
      debugInfo.errors.push({
        stage: 'Qdrant Connection',
        message: error.message,
        stack: error.stack
      });
    }
    
    // Test embedding generation
    try {
      debugInfo.status = 'Testing embedding generation';
      const testText = 'Show-InstallationWelcome -CloseApps notepad,chrome -AllowDefer';
      const embedding = await qdrantDb.generateEmbedding(testText);
      
      debugInfo.embeddingGeneration = true;
      debugInfo.testEmbedding = {
        text: testText,
        embedding: embedding ? `Vector with ${embedding.length} dimensions` : null,
        sample: embedding ? embedding.slice(0, 5) : null,
        isRandom: !process.env.EMBEDDING_API_URL || !process.env.EMBEDDING_API_KEY
      };
    } catch (error) {
      debugInfo.errors.push({
        stage: 'Embedding Generation',
        message: error.message,
        stack: error.stack
      });
    }
    
    // Final status
    debugInfo.status = debugInfo.errors.length === 0 ? 'Success' : 'Completed with errors';
    
    return NextResponse.json(debugInfo);
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      status: 'Fatal Error',
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
