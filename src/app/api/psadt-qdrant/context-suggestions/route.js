import { NextResponse } from 'next/server';
import { PsadtQdrantDb } from '@/lib/psadt-qdrant-db';

/**
 * API endpoint for getting contextual code suggestions based on the current code context
 * Uses the Qdrant vector database to find semantically similar commands
 */
export async function POST(request) {
  try {
    const { context, limit = 5, version, includeDeprecated = false } = await request.json();
    
    if (!context) {
      return NextResponse.json(
        { error: 'Missing required parameter: context' }, 
        { status: 400 }
      );
    }

    // Initialize the Qdrant DB service
    const qdrantDb = new PsadtQdrantDb();
    
    // Generate embedding for the code context
    const embedding = await qdrantDb.generateEmbedding(context);
    
    if (!embedding) {
      return NextResponse.json(
        { error: 'Failed to generate embedding for context' }, 
        { status: 500 }
      );
    }

    // Build filter based on parameters
    const filter = {};
    
    if (version) {
      filter.version = { $eq: parseInt(version, 10) };
    }
    
    if (!includeDeprecated) {
      filter.isDeprecated = { $eq: false };
    }

    // Default to commands, not examples
    filter.isExample = { $eq: false };

    // Search for relevant commands based on the embedding
    const searchResults = await qdrantDb.searchByVector({
      vector: embedding,
      limit: parseInt(limit, 10),
      filter: Object.keys(filter).length > 0 ? filter : undefined,
      with_payload: true,
      with_vectors: false
    });
    
    // Process and format the results for the Monaco editor
    const suggestions = searchResults.map(result => {
      const { commandName, description, syntax, parameters = [] } = result.payload;
      
      return {
        commandName,
        description,
        syntax,
        score: result.score,
        parameters: parameters.map(param => ({
          name: param.paramName,
          description: param.description,
          isRequired: param.isRequired,
          isCritical: param.isCritical,
          defaultValue: param.defaultValue
        }))
      };
    });

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Error getting context suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to get suggestions', details: error.message }, 
      { status: 500 }
    );
  }
}
