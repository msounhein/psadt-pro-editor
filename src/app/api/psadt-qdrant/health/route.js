import { NextResponse } from 'next/server';
import { PsadtQdrantDb } from '@/lib/psadt-qdrant-db';

/**
 * Health check endpoint for PSADT Qdrant integration
 * Returns basic status information and environment configuration for debugging
 */
export async function GET(request) {
  const healthInfo = {
    status: 'initializing',
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      qdrantUrlConfigured: !!process.env.QDRANT_URL,
      qdrantApiKeyConfigured: !!process.env.QDRANT_API_KEY,
      embeddingApiUrlConfigured: !!process.env.EMBEDDING_API_URL,
      embeddingApiKeyConfigured: !!process.env.EMBEDDING_API_KEY,
      usingLocalEmbeddings: true, // Now using the local embedding service
    },
    services: {
      qdrant: {
        status: 'unknown',
        error: null
      },
      embedding: {
        status: 'unknown',
        error: null,
        service: 'local', // Now using local embedding service
        modelName: 'sentence-transformers/all-MiniLM-L6-v2'
      }
    },
    collection: {
      name: null,
      vectorCount: 0,
      stats: null
    },
    testFunctionality: {
      embedding: false,
      search: false,
      contextSuggestions: false
    }
  };
  
  try {
    // Initialize Qdrant client
    const qdrantDb = new PsadtQdrantDb();
    
    // Test Qdrant connection
    try {
      healthInfo.status = 'testing_qdrant_connection';
      await qdrantDb.initialize();
      healthInfo.services.qdrant.status = 'connected';
      
      // Get collection info
      healthInfo.collection.name = qdrantDb.collectionName;
      
      const collectionStats = await qdrantDb.getCollectionStats();
      healthInfo.collection.stats = collectionStats;
      healthInfo.collection.vectorCount = collectionStats.vectorCount;
    } catch (qdrantError) {
      healthInfo.services.qdrant.status = 'error';
      healthInfo.services.qdrant.error = qdrantError.message;
    }
    
    // Test embedding generation
    try {
      healthInfo.status = 'testing_embedding';
      const testText = 'Show-InstallationWelcome -CloseApps "notepad,chrome" -AllowDefer';
      const embedding = await qdrantDb.generateEmbedding(testText);
      
      healthInfo.services.embedding.status = 'working';
      
      // Determine if using local embedding service or fallback
      try {
        const { getLocalEmbeddingService } = await import('@/lib/local-embedding-service.js');
        const embeddingService = getLocalEmbeddingService();
        
        if (embeddingService.initialized) {
          healthInfo.services.embedding.service = 'local';
          healthInfo.services.embedding.modelName = embeddingService.modelName;
        } else {
          healthInfo.services.embedding.service = 'fallback';
          healthInfo.services.embedding.modelName = 'deterministic-random';
        }
      } catch (serviceError) {
        healthInfo.services.embedding.service = 'fallback';
        healthInfo.services.embedding.modelName = 'deterministic-random';
      }
      
      healthInfo.testFunctionality.embedding = true;
    } catch (embeddingError) {
      healthInfo.services.embedding.status = 'error';
      healthInfo.services.embedding.error = embeddingError.message;
    }
    
    // Test search functionality if other tests passed
    if (healthInfo.services.qdrant.status === 'connected' && 
        healthInfo.services.embedding.status === 'working') {
      try {
        healthInfo.status = 'testing_search';
        const searchQuery = 'Show-InstallationWelcome';
        const searchResults = await qdrantDb.searchCommands(searchQuery, { limit: 1 });
        
        healthInfo.testFunctionality.search = searchResults && searchResults.length > 0;
      } catch (searchError) {
        // Don't fail health check due to search error
        console.error('Search functionality test failed:', searchError);
      }
      
      // Test context suggestions functionality
      try {
        healthInfo.status = 'testing_context_suggestions';
        const context = 'Show-InstallationWelcome -CloseApps "notepad,chrome" -AllowDefer';
        const suggestions = await qdrantDb.getContextualSuggestions(context, { limit: 1 });
        
        healthInfo.testFunctionality.contextSuggestions = suggestions && suggestions.length > 0;
      } catch (contextError) {
        // Don't fail health check due to context suggestions error
        console.error('Context suggestions test failed:', contextError);
      }
    }
    
    // Calculate overall status
    if (healthInfo.services.qdrant.status === 'connected' && 
        healthInfo.services.embedding.status === 'working') {
      if (healthInfo.testFunctionality.search && 
          healthInfo.testFunctionality.contextSuggestions) {
        healthInfo.status = 'healthy';
      } else if (healthInfo.collection.vectorCount === 0) {
        healthInfo.status = 'warning_empty_collection';
      } else {
        healthInfo.status = 'warning_partial_functionality';
      }
    } else {
      healthInfo.status = 'error';
    }
    
    return NextResponse.json(healthInfo);
  } catch (error) {
    healthInfo.status = 'fatal_error';
    
    return NextResponse.json({
      ...healthInfo,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : null
    }, {
      status: 500
    });
  }
}
