// src/app/api/psadt-qdrant/search/route.js
import { NextResponse } from 'next/server';
import { getPsadtQdrantDb } from '../../../../lib/psadt-qdrant-db';
import { embeddingService } from '../../../../lib/embedding-service';
import type { EmbeddingAlgorithm } from '../../../../lib/embedding-service';

// Define request and response types
type SearchOptions = {
  collection?: string;
  algorithm?: EmbeddingAlgorithm;
  examples?: boolean;
  limit?: number;
  categories?: string[];
};

type SearchRequest = {
  query: string;
  options?: SearchOptions;
};

type SearchResponse = {
  results: any[];
  metadata: {
    query: string;
    algorithm: string;
    collection: string;
    resultCount: number;
  };
};

type ErrorResponse = {
  error: string;
  details?: string;
};

export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json() as SearchRequest;
    
    // Extract query and options
    const { query, options = {} } = body;
    console.log(`Received search request: "${query}"`);

    if (!query || query.trim() === '') {
      console.warn('Empty query received');
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Extract and validate options
    const {
      collection = 'psadt_commands_v4',
      algorithm = 'dense',
      examples = false,
      limit = 10,
      categories = []
    } = options;

    // Validate collection name to ensure it's a valid v4 collection if possible
    let validatedCollection = collection;
    const v4Collections = ['psadt_commands_v4', 'psadt_commands_v4_docs', 'psadt_commands_v4_examples'];
    
    // If collection isn't a v4 collection but has a v4 equivalent, use the v4 version
    if (!v4Collections.includes(collection)) {
      // Check if there's a v4 equivalent
      if (collection === 'psadt_commands') {
        validatedCollection = 'psadt_commands_v4';
        console.log(`Upgrading collection from ${collection} to ${validatedCollection}`);
      } else if (collection === 'psadt_commands_docs' || collection === 'sync_test_docs') {
        validatedCollection = 'psadt_commands_v4_docs';
        console.log(`Upgrading collection from ${collection} to ${validatedCollection}`);
      } else if (collection === 'psadt_commands_examples' || collection === 'sync_test_examples') {
        validatedCollection = 'psadt_commands_v4_examples';
        console.log(`Upgrading collection from ${collection} to ${validatedCollection}`);
      }
    }

    console.log(`Search options: collection=${validatedCollection} (original: ${collection}), algorithm=${algorithm}, examples=${examples}, limit=${limit}, categories=${categories.join(',')}`);

    // Initialize the Qdrant DB with the specified collection and algorithm
    const qdrantDb = getPsadtQdrantDb({ 
      collectionName: validatedCollection,
      embeddingAlgorithm: algorithm as EmbeddingAlgorithm
    });

    // Validate collection exists
    try {
      // Check if collection exists by getting collection info from the Qdrant client
      const collectionInfo = await qdrantDb.qdrantClient.getCollection(validatedCollection);
      console.log(`Using collection: ${validatedCollection} with ${collectionInfo.points_count || 0} points`);
    } catch (error) {
      console.error(`Collection ${validatedCollection} not found or inaccessible:`, error);
      return NextResponse.json(
        { error: `Collection ${validatedCollection} not found or inaccessible` } as ErrorResponse,
        { status: 404 }
      );
    }

    // Generate embeddings with our service
    console.log(`Generating embedding for query using algorithm: ${algorithm}`);
    let embedding;
    try {
      // Ensure we're using the transformer model (not n-gram)
      embeddingService.setUseNgramOnly(false);
      
      embedding = await embeddingService.generateEmbeddingWithAlgorithm(query, algorithm as EmbeddingAlgorithm);
      
      console.log(`Successfully generated embedding with length: ${embedding.length}`);
    } catch (embeddingError) {
      console.error('Error generating embedding:', embeddingError);
      return NextResponse.json(
        { 
          error: 'Failed to generate embedding for search query', 
          details: embeddingError instanceof Error ? embeddingError.message : String(embeddingError)
        } as ErrorResponse,
        { status: 500 }
      );
    }

    // Search using the pre-generated embedding
    console.log(`Searching with pre-generated embedding`);
    const searchResults = await qdrantDb.searchWithEmbedding(embedding, {
      includeExamples: examples,
      limit,
      categories
    });

    console.log(`Found ${searchResults.length} results`);

    // Map the results to the expected format for the client
    const formattedResults = searchResults.map((result: { payload: any; score: number; id?: string }) => {
      // Make sure we don't lose any payload properties
      const payload = result.payload || {};
      
      // Extract command name and other fields
      const commandName = payload.commandName || payload.name;
      
      return {
        ...payload,
        commandName,
        name: payload.name,
        id: result.id || payload.id, // Ensure ID is preserved
        score: result.score,
        scoreDisplay: (result.score * 100).toFixed(2) + '%'
      };
    });

    console.log(`First formatted result:`, JSON.stringify(formattedResults[0] || {}, null, 2));

    return NextResponse.json({
      results: formattedResults,
      metadata: {
        query,
        algorithm,
        collection: validatedCollection,
        resultCount: formattedResults.length
      }
    } as SearchResponse);
  } catch (error) {
    console.error('Error performing search:', error);
    return NextResponse.json(
      { error: `Failed to perform search: ${error instanceof Error ? error.message : 'Unknown error'}` } as ErrorResponse,
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'POST method required with query in request body' } as ErrorResponse,
    { status: 405 }
  );
}
