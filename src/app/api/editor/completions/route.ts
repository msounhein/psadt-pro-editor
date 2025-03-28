import { NextResponse, NextRequest } from 'next/server';
// import { embeddingService } from '@/lib/embedding-service'; // Not needed for this test
// import { getPsadtQdrantDb } from '@/lib/psadt-qdrant-db'; // Bypass helper for direct test
import { QdrantClient } from '@qdrant/js-client-rest'; // Use raw client

// Define the structure for Monaco completion items
interface MonacoCompletionItem {
  label: string;
  kind: number; // Use numeric kind values
  insertText: string;
  detail?: string;
  documentation?: string | { value: string; isTrusted?: boolean };
  sortText?: string; // Optional: For custom sorting
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

// Function to map Qdrant result type to Monaco CompletionItemKind numeric values
// Reference: https://microsoft.github.io/monaco-editor/api/enums/monaco.languages.CompletionItemKind.html
function mapTypeToKind(type: string | undefined): number {
    switch (type?.toLowerCase()) {
        case 'function':
        case 'command':
          return 2; // Function
        case 'variable':
          return 5; // Variable
        case 'parameter':
          return 4; // Field
        case 'snippet':
        case 'example': // Treat examples as snippets
          return 27; // Snippet (using newer value)
        case 'keyword':
          return 14; // Keyword (using older value, often 14 or 13)
        case 'section': // For documentation sections
          return 0; // Text
        default:
          return 0; // Text
      }
}

// Function to format a single Qdrant search result into a Monaco completion item
// NOTE: Assumes 'result' is the *formatted* object returned by hybridSearch,
//       where payload fields are at the top level.
function formatSuggestion(result: any, queryText: string): MonacoCompletionItem | null {
    console.log("  [formatSuggestion] Processing result ID:", result?.id); // Log incoming result ID
    
    // Check if result itself exists
    if (!result) {
        console.error("  [formatSuggestion] Received null/undefined result object.");
        return null;
    }
    
    // Payload fields are directly on the result object now
    const payload = result; // Use the result object directly as the payload source
    console.log("  [formatSuggestion] Processing result object (payload is top-level):", !!payload);

    // Determine label, insertText, detail, documentation from the result object
    // Use result.id if available, otherwise fallback needed if id isn't guaranteed top-level
    const fallbackId = result.id || 'unknown-id';
    const type = getPayloadValue(payload, ['type', 'kind']) || 'Unknown'; // Get type first
    
    // Derive label based on type
    let label = fallbackId; // Default to ID
    if (type === 'parameter' && payload.section) {
        // Extract parameter name from section like "Parameter: ProductCode"
        label = payload.section.replace(/^Parameter:\s*/, '').trim();
    } else {
        // Fallback for commands, examples, docs, etc.
        label = getPayloadValue(payload, ['commandName', 'title', 'name', 'section']) || `Result ${fallbackId}`;
    }

    // Log the derived label immediately
    console.log(`  [formatSuggestion] Attempting to derive label. Result: "${label}" (Type: ${typeof label})`);
    const description = getPayloadValue(payload, ['description', 'summary', 'content']); // Use 'content' for docs
    const syntax = getPayloadValue(payload, ['syntax']);
    // const type = getPayloadValue(payload, ['type', 'kind']) || 'Unknown'; // Type is already derived
    const code = getPayloadValue(payload, ['code']); // For examples

    const kind = mapTypeToKind(type); // Get the numeric kind

    // Construct insertText
    let insertText = label;
    // Use numeric kind values for comparison
    if (kind === 2 /* Function */ && syntax) {
        // Extract just the command name if syntax is complex
        insertText = syntax.split(' ')[0];
    } else if (kind === 27 /* Snippet */ && code) {
        insertText = code; // Use the actual code for snippets/examples
    } else if (kind === 2 /* Function */) {
        insertText = label + ' '; // Add space after function name if no syntax
    } else if (kind === 4 /* Field */) {
        insertText = '-' + label + ' '; // Prepend hyphen for parameters
    }

    // Construct documentation (Markdown format)
    let documentationValue = '';
    if (description) documentationValue += description + '\n\n';
    if (syntax) documentationValue += '```powershell\n' + syntax + '\n```\n\n';
    if (code && kind !== 27 /* Snippet */) { // Don't repeat code if it's the insert text
        documentationValue += '**Example:**\n```powershell\n' + code + '\n```';
    }
    const documentation = documentationValue ? { value: documentationValue.trim(), isTrusted: true } : undefined;

    // Custom sorting: prioritize type, then exact matches, then startsWith, then score
    let typePriority = '9'; // Default lowest priority (e.g., docs)
    switch (type?.toLowerCase()) {
        case 'function':
        case 'command':
            typePriority = '0'; break;
        case 'parameter':
            typePriority = '1'; break;
        case 'variable':
            typePriority = '2'; break;
        case 'keyword':
            typePriority = '3'; break;
        case 'snippet':
        case 'example':
            typePriority = '4'; break;
        // Keep 'section' and others at '9'
    }

    let matchPriority = 'z'; // Default low priority for label matching
    const lowerLabel = label.toLowerCase();
    const lowerQuery = queryText.toLowerCase();
    if (lowerLabel === lowerQuery) {
        matchPriority = 'a'; // Highest label match priority
    } else if (lowerLabel.startsWith(lowerQuery)) {
        matchPriority = 'b'; // Second label match priority
    }
    
    // Combine priorities: Type -> Label Match -> Score
    // Lower score means higher relevance, so use (1 - score)
    const sortText = `${typePriority}${matchPriority}${(1 - result.score).toFixed(4)}`;

    // Log derived values before returning
    console.log(`  [formatSuggestion] Derived Label: "${label}", Type: "${type}", Kind: ${kind}`);

    // Ensure label is actually a string before returning
    if (typeof label !== 'string' || label.trim() === '') {
        console.error("  [formatSuggestion] Derived label is not a valid string:", label);
        return null; // Return null if label is invalid
    }

    const suggestionObject = {
        label: label,
        kind: kind,
        insertText: insertText,
        detail: type,
        documentation: documentation,
        sortText: sortText,
    };
    // Log the complete object before returning
    console.log("  [formatSuggestion] Returning suggestion object:", JSON.stringify(suggestionObject));
    return suggestionObject;
}


export async function POST(request: NextRequest) {
  try {
    const { context, language, limit = 15 } = await request.json();

    if (!context || typeof context !== 'string' || !language) {
      return NextResponse.json({ error: 'Missing or invalid context/language' }, { status: 400 });
    }

    // Only provide completions for PowerShell for now
    if (language !== 'powershell') {
        return NextResponse.json({ suggestions: [] });
    }

    // const algorithm = 'transformer'; // Algorithm is set below
    // Use the full context for the search query, not just the last part
    const queryText = context;

    console.log(`[API Completions] Context/QueryText: "${queryText}"`);

    // Generate embedding
    // Re-import necessary functions
    const { embeddingService } = await import('@/lib/embedding-service');
    const { getPsadtQdrantDb } = await import('@/lib/psadt-qdrant-db');

    // --- Mimic Working Search Logic ---
    
    // 1. Determine Collections and Algorithm
    // For completions, search commands, examples, and docs
    const collectionsToSearch = [
        'psadt_commands_v4'
        
    ];
    // Explicitly use 'dense' to match the working search API default
    const algorithm = 'dense';
    
    console.log(`[API Completions] Target Collections: ${collectionsToSearch.join(', ')}, Algorithm: ${algorithm}`);

    // 2. Generate Embedding (Using full context as queryText)
    const embedding = await embeddingService.generateEmbeddingWithAlgorithm(queryText, algorithm);
    console.log(`[API Completions] Generated embedding for "${queryText}"`);

    // 3. Perform Hybrid Search across collections in parallel
    let allResults: any[] = [];
    const searchPromises = collectionsToSearch.map(async (collectionName) => {
        try {
             const qdrantDb = getPsadtQdrantDb({
                collectionName: collectionName,
                embeddingAlgorithm: algorithm
            });
            await qdrantDb.initialize();
            console.log(`[API Completions] Performing VECTOR search in ${collectionName}`);
            // Use searchWithEmbedding only
            const searchOptions = { limit: limit }; // Only need limit for vector search
            const results = await qdrantDb.searchWithEmbedding(embedding, searchOptions);
            console.log(`[API Completions] Found ${results.length} vector results in ${collectionName}.`);
            return results;
        } catch (searchError) {
             console.error(`[API Completions] Error searching ${collectionName}:`, searchError);
             return []; // Return empty array for this collection on error
        }
    });
    
    const resultsArrays = await Promise.all(searchPromises);
    allResults.push(...resultsArrays.flat()); // Combine results
    console.log(`[API Completions] Total results from all collections: ${allResults.length}`);
    
    // --- End Mimic Working Search Logic ---


    // 4. Combine, format, and deduplicate results
    const allSuggestions: MonacoCompletionItem[] = [];
    const seenLabels = new Set<string>();

    // Process the combined results (add type annotation for result)
    console.log(`[API Completions] Formatting ${allResults.length} raw results...`);
    allResults.forEach((result: any, index: number) => {
        console.log(`\n[API Completions] Processing raw result ${index + 1}: ID=${result.id}, Score=${result.score}`);
        // console.log("[API Completions] Raw Payload:", JSON.stringify(result.payload, null, 2)); // Uncomment for very detailed payload logging
        
        const suggestion = formatSuggestion(result, queryText);
        
        if (!suggestion) {
            console.log("  -> formatSuggestion returned null/falsy.");
            return; // Skip to next iteration
        }

        console.log(`  -> Formatted: Label="${suggestion.label}", Kind=${suggestion.kind}, Sort="${suggestion.sortText}"`);

        if (seenLabels.has(suggestion.label)) {
            console.log(`  -> Label "${suggestion.label}" already seen. Skipping.`);
        } else {
            console.log(`  -> Adding suggestion.`);
            allSuggestions.push(suggestion);
            seenLabels.add(suggestion.label);
        }
    });

    // Sort suggestions based on the custom sortText
    allSuggestions.sort((a, b) => (a.sortText || 'z').localeCompare(b.sortText || 'z'));

    console.log(`[API Completions] Found ${allSuggestions.length} unique suggestions for "${queryText}"`);

    // Return only the top 'limit' suggestions after sorting and deduplication
    return NextResponse.json({ suggestions: allSuggestions.slice(0, limit) });

  } catch (error) {
    console.error('[API Completions] General error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal server error', details: errorMessage }, { status: 500 });
  }
}