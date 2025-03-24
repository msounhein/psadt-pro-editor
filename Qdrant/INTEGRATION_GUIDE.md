# FastEmbed and BM25 Integration Guide for PSADT Pro UI

This guide walks you through integrating FastEmbed and Qdrant with your PSADT Pro UI project to enhance your documentation search capabilities using vector search technology.

## Overview

This integration adds:

1. Vector search capabilities using both sparse (BM25) and dense embeddings
2. An admin interface to manage the vector database
3. A search component for finding PSADT commands semantically
4. Backend API endpoints to handle search and synchronization

## Prerequisites

- Python 3.8+ for FastEmbed
- Node.js and npm/yarn for your Next.js project
- Qdrant server (local or cloud)

## Installation Steps

### 1. Install Python Dependencies

```bash
# Create a virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install required packages
pip install fastembed 'qdrant-client[fastembed]'
```

### 2. Install JavaScript Dependencies

```bash
# Navigate to your PSADT Pro UI project
cd C:\Users\msoun\OneDrive\Documents\Code\Web\psadt-pro-ui

# Install required packages
npm install @qdrant/js-client-rest
```

### 3. Copy Project Files

Copy the following files to your project:

- Python Scripts:
  - `scripts/generate_embeddings.py` → `scripts/`
  - `scripts/generate_query_embedding.py` → `scripts/`

- JavaScript Components:
  - `src/lib/psadt-qdrant-db.js` → `src/lib/`
  - `src/components/Search/CommandSearch.jsx` → `src/components/Search/`
  - `src/components/Admin/QdrantManager.jsx` → `src/components/Admin/`

- API Routes:
  - `src/app/api/psadt-qdrant/search/route.js` → `src/app/api/psadt-qdrant/search/`
  - `src/app/api/psadt-qdrant/sync/route.js` → `src/app/api/psadt-qdrant/sync/`
  - `src/app/api/psadt-qdrant/stats/route.js` → `src/app/api/psadt-qdrant/stats/`

- Pages:
  - `src/app/admin/qdrant/page.jsx` → `src/app/admin/qdrant/`

### 4. Configure Environment Variables

1. Copy `.env.example` to `.env` in your project root
2. Fill in the required variables:
   - `QDRANT_URL`: URL of your Qdrant server (default: http://localhost:6333)
   - `QDRANT_API_KEY`: API key for Qdrant (if applicable)
   - `HUGGINGFACE_API_KEY`: API key for Hugging Face (optional)

### 5. Set Up Qdrant

#### Option 1: Use Docker (Recommended)

```bash
docker run -p 6333:6333 -p 6334:6334 \
    -v $(pwd)/qdrant_storage:/qdrant/storage \
    qdrant/qdrant
```

#### Option 2: Use Qdrant Cloud

1. Create an account at [Qdrant Cloud](https://qdrant.tech/cloud/)
2. Create a new cluster
3. Update your `.env` file with the cloud URL and API key

### 6. Initialize Collections

1. Navigate to your admin interface (e.g., http://localhost:3000/admin/qdrant)
2. Click "Reset & Sync All" to create collections and sync data

## Usage

### Search Component

Add the search component to any page:

```jsx
import CommandSearch from '@/components/Search/CommandSearch';

export default function YourPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">PSADT Command Search</h1>
      <CommandSearch />
    </div>
  );
}
```

### Admin Panel

Access the admin panel at `/admin/qdrant` to:
- View database statistics
- Sync commands and documentation
- Reset collections if needed

## How It Works

1. **BM25 Sparse Embeddings**:
   - Creates token-based sparse vectors
   - Good for keyword matching and traditional search
   - Handles rare terms well

2. **Dense Embeddings**:
   - Creates semantic vectors that capture meaning
   - Good for conceptual and fuzzy search
   - Handles synonyms and related concepts

3. **Synchronization**:
   - Python scripts generate embeddings for your data
   - Embeddings are stored in Qdrant collections
   - JavaScript API endpoints provide search capabilities

## Customization

### Modifying Search UI

Edit `src/components/Search/CommandSearch.jsx` to:
- Change the UI appearance
- Add additional filters
- Modify result display format

### Changing Embedding Models

Edit `scripts/generate_embeddings.py` to:
- Use different embedding models
- Adjust batch sizes and parameters
- Customize text representation

## Troubleshooting

### Python Script Errors

If you encounter errors with Python scripts:

1. Ensure Python 3.8+ is installed and in your PATH
2. Check that all requirements are installed
3. Verify that file paths in the scripts are correct

### Qdrant Connection Issues

If you can't connect to Qdrant:

1. Check that Qdrant is running (`docker ps` if using Docker)
2. Verify your QDRANT_URL in .env
3. Check firewall settings if using a remote server

### Search Not Working

If search isn't returning expected results:

1. Check that collections are properly synced (Admin panel)
2. Verify that commands and documentation exist in your database
3. Try different search queries and embedding types

## Next Steps

1. **Fine-tune embedding models** for PSADT-specific terminology
2. **Implement hybrid search** combining both BM25 and dense results
3. **Add user feedback mechanisms** to improve search quality over time

## Resources

- [FastEmbed Documentation](https://qdrant.github.io/fastembed/)
- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [BM25 Model on HuggingFace](https://huggingface.co/Qdrant/bm25)
