import { NextResponse } from 'next/server';
import { embeddingService } from '@/lib/embedding-service';
import { getPsadtQdrantDb } from '@/lib/psadt-qdrant-db';
import { QdrantClient } from '@qdrant/js-client-rest'; // Keep for type reference if needed
import * as monaco from 'monaco-editor'; // Import monaco types for CompletionItemKind

// Define the structure for Monaco completion items
interface MonacoCompletionItem {
  label: string;
  kind: monaco.languages.CompletionItemKind;
  insertText: string;
  detail?: string;
  documentation?: string | { value: string; isTrusted?: boolean }; // Allow Markdown documentation
  // range will be added on the frontend
}

// Helper to get a value from payload, checking multiple possible keys
function getPayloadValue(payload: Record<string, any> | null | undefined, keys: string[]): string | undefined {
  if (!payload) return undefined;
  for (const key of keys) {
    if (payload[key] !== undefined && payload[key] !== null) {
      return String(payload[key]);
    }
  }
  return undefined;
}

export async function POST(request: Request) {
  try {
    // Limit defaults to 15 for completions
    const { context, language, limit = 15 } = await request.json();

    if (!context || typeof context !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid context' }, { status: 400 });
    }
    
    // Use 'transformer' as the default algorithm for completions
    const algorithm = 'transformer';

    console.log(`Received completion request for language "${language}" with context: "${context}"`);

    // 1. Generate embedding for the 'context'
    // We use the last part of the context for potentially better vector matching
    const queryText = context.split(/[\s\-]+/).pop() || context; // Get last word/part after space or hyphen
    const queryVector = await embeddingService.generateEmbeddingWithAlgorithm(queryText, algorithm);
    
    // 2. Initialize Qdrant DB and perform hybrid search
    // TODO: Potentially select collection based on language or context
    const qdrantDb = getPsadtQdrantDb({ embeddingAlgorithm: algorithm });
    
    // Use hybrid search for better matching on keywords/command names
    const searchResults = await qdrantDb.hybridSearch(queryText, queryVector, {
      limit: limit,
      // filter: ... // Optional: Add filter if needed (e.g., based on language)
    });

    console.log(`Found ${searchResults.length} potential completions`);

    // 3. Format searchResult into MonacoCompletionItem[]
    const suggestions: MonacoCompletionItem[] = searchResults.map((result) => {
      const payload = result.payload as Record<string, any> | null;
      
      // Determine label, insertText, detail, documentation from payload
      const label = getPayloadValue(payload, ['commandName', 'title', 'name', 'parameter']) || `Result ${result.id}`;
      const description = getPayloadValue(payload, ['description', 'summary']);
      const syntax = getPayloadValue(payload, ['syntax']);
      const type = getPayloadValue(payload, ['type', 'kind']) || 'Unknown'; // e.g., 'Function', 'Parameter', 'Snippet'

      // Determine CompletionItemKind based on type
      let kind: monaco.languages.CompletionItemKind;
      switch (type.toLowerCase()) {
        case 'function':
        case 'command':
          kind = monaco.languages.CompletionItemKind.Function;
          break;
        case 'variable':
          kind = monaco.languages.CompletionItemKind.Variable;
          break;
        case 'parameter':
          kind = monaco.languages.CompletionItemKind.Field; // Or Property/Variable
          break;
        case 'snippet':
          kind = monaco.languages.CompletionItemKind.Snippet;
          break;
        case 'keyword':
          kind = monaco.languages.CompletionItemKind.Keyword;
          break;
        default:
          kind = monaco.languages.CompletionItemKind.Text;
      }

      // Construct insertText - potentially use syntax or just label
      // If syntax is available, use it, otherwise just the label. Add space for parameters.
      let insertText = label;
      if (syntax) {
        // Basic check if it looks like a function/command needing parameters
        if (syntax.includes('-') && !context.includes(label)) {
           insertText = syntax.split(' ')[0]; // Use just the command name initially
        } else {
           insertText = syntax; // Use full syntax if available
        }
      } else if (kind === monaco.languages.CompletionItemKind.Function) {
         insertText = label + ' '; // Add space after function name
      }
      
      // Construct documentation (Markdown format)
      let documentation: string | { value: string; isTrusted?: boolean } = '';
      if (description) documentation += description + '\n\n';
      if (syntax) documentation += '```powershell\n' + syntax + '\n```';
      
      return {
        label: label,
        kind: kind,
        insertText: insertText,
        detail: type, // Show type (Function, Parameter, etc.)
        documentation: documentation ? { value: documentation, isTrusted: true } : undefined, // Use Markdown object
      };
    });

    return NextResponse.json({ suggestions });

  } catch (error) {
    console.error('Error processing completion request:', error);
    // Provide more detail in the error response if possible
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal server error', details: errorMessage }, { status: 500 });
  }
}