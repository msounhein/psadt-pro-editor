/**
 * API Route: /api/search
 * 
 * Handles semantic search requests using Qdrant and embeddings.
 */

import { NextResponse, NextRequest } from 'next/server';
import { embeddingService, EmbeddingAlgorithm } from '@/lib/embedding-service';
import { getPsadtQdrantDb, PsadtQdrantDb } from '@/lib/psadt-qdrant-db';
// Qdrant types are not directly exported easily, define custom interfaces

// Expected structure for a point from Qdrant
interface QdrantPoint {
  id: string | number; // ID can be string or number
  vector?: number[] | Record<string, number[]>; // Optional vector
  payload?: Record<string, any>; // Arbitrary payload
}

// Expected structure for a scored point (from search results)
interface QdrantScoredPoint extends QdrantPoint {
  score: number;
  version?: number; // Often included
}

// Define expected payload structure from Qdrant results
interface SearchResultPayload {
  commandName?: string;
  command_name?: string; // Handle potential snake_case from older data
  title?: string;
  description?: string;
  summary?: string;
  syntax?: string;
  type?: string;
  kind?: string;
  parameter?: string;
  [key: string]: any; // Allow other fields
}

// Define the structure of the formatted result we send back
// Explicitly define fields instead of extending due to payload type conflict
interface FormattedSearchResult {
  id: string | number;
  score: number;
  version?: number; // From QdrantScoredPoint
  vector?: number[] | Record<string, number[]>; // From QdrantPoint
  payload: SearchResultPayload | null; // Use our specific payload type
  commandName: string; // Custom added field
  scoreDisplay: string; // Custom added field
}

/**
 * Search for PSADT commands or documentation using semantic search
 */
export async function POST(request: NextRequest) {
  try {
    // Define expected request body structure
    interface SearchRequestBody {
      query: string;
      algorithm?: EmbeddingAlgorithm;
      limit?: number;
    }

    const { 
      query, 
      algorithm = 'transformer', // Default to transformer
      limit = 10 // Default limit
    }: SearchRequestBody = await request.json();
    
    if (!query) {
      return NextResponse.json({ error: "Query parameter is required" }, { status: 400 });
    }

    console.log(`Performing search with query: "${query}", algorithm: ${algorithm}, limit: ${limit}`);
    
    // Generate embedding for the query
    const embedding = await embeddingService.generateEmbeddingWithAlgorithm(query, algorithm);
    
    // Initialize the Qdrant DB with the appropriate collection based on algorithm
    const qdrantDb: PsadtQdrantDb = getPsadtQdrantDb({
      embeddingAlgorithm: algorithm
    });
    
    // Use hybrid search to get better results for command name matches
    // Assuming hybridSearch returns an array matching our QdrantScoredPoint interface
    const results: QdrantScoredPoint[] = await qdrantDb.hybridSearch(query, embedding, {
      limit: limit
    });
    
    console.log(`Found ${results.length} results`);
    
    // Format results for display, ensuring commandName is always present
    const formattedResults: FormattedSearchResult[] = results.map((result): FormattedSearchResult => {
      const payload = result.payload as SearchResultPayload | null;
      
      // Ensure commandName is set
      let commandName = 'Command'; // Default
      if (payload) {
        if (payload.commandName) {
          commandName = payload.commandName;
        } else if (payload.command_name) {
          commandName = payload.command_name;
        } else if (payload.title) {
          commandName = `Example: ${payload.title}`;
        } else if (result.id) {
          commandName = `Result ID: ${result.id}`;
        }
      }
      
      // Add percentage display for score
      const scoreDisplay = (result.score * 100).toFixed(1) + '%';
      
      // Return the formatted structure, explicitly casting payload type
      return {
        ...result,
        payload: payload, // Keep original payload structure
        score: result.score,
        commandName: commandName,
        scoreDisplay: scoreDisplay,
      };
    });
    
    return NextResponse.json({ 
      results: formattedResults,
      metadata: {
        query,
        algorithm,
        resultCount: formattedResults.length
      }
    });
  } catch (error) {
    console.error('Error searching documents:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'POST method required with query in request body' },
    { status: 405 }
  );
}