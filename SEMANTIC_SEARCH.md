# Semantic Search Integration for PSADT Pro UI

This implementation adds semantic search capabilities to the PSADT Pro UI project using the `fastembed` NPM package for generating embeddings directly in JavaScript.

## Features

- **Semantic search** for both commands and documentation
- **Natural language queries** that understand meaning, not just keywords
- **Fast local embedding generation** using fastembed
- **No Python dependencies** required - everything runs in JavaScript

## How It Works

1. The system uses the `fastembed` NPM package to generate vector embeddings
2. Text is converted to high-dimensional vectors that capture semantic meaning
3. Similarity is calculated using cosine similarity between query and document vectors
4. Results are ranked by similarity score

## Files Added

- **`src/lib/embedding-service.js`**: Core service for embedding generation
- **`src/app/api/search/route.js`**: API endpoint for search functionality
- **`src/components/Search/SemanticSearch.jsx`**: React component for search UI
- **`src/app/search/page.jsx`**: Page for search interface
- **`src/hooks/useEmbeddings.js`**: Custom hook for using embeddings in components
- **`src/lib/embeddings/index.js`**: Export file for easy importing

## Getting Started

1. Install the dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Navigate to http://localhost:3000/search to use the search interface

## Usage Examples

### Basic Search Page

The `/search` page provides a complete UI for searching commands and documentation.

### Using the Search Hook in Components

You can use the custom hook in any component:

```jsx
import { useEmbeddings } from '@/hooks/useEmbeddings';

function MyComponent() {
  const { search, loading, results } = useEmbeddings();

  const handleSearch = async () => {
    await search('close applications installer', 'commands', 5);
  };

  return (
    <div>
      <button onClick={handleSearch}>Search</button>
      {loading && <p>Loading...</p>}
      {results.map(result => (
        <div key={result.id}>{result.name}</div>
      ))}
    </div>
  );
}
```

### Direct API Usage

You can call the API endpoint directly:

```javascript
const response = await fetch('/api/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: 'how to display a dialog',
    type: 'commands',
    limit: 5
  }),
});

const data = await response.json();
const results = data.results;
```

## Customization

You can modify the embedding model in `embedding-service.js`:

```javascript
initializationPromise = FlagEmbedding.init({
  model: EmbeddingModel.BGEBaseEN, // Change model here
});
```

Available models include:
- `EmbeddingModel.BGEBaseEN` (default)
- `EmbeddingModel.BGESmallEN`
- `EmbeddingModel.BGEBaseCNL3`
- `EmbeddingModel.BGESmallCNL3`

## Performance Considerations

- The first search may take longer as the model loads
- Subsequent searches will be faster
- Consider pre-generating embeddings for static content
