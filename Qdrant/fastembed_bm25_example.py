
#!/usr/bin/env python3

import sys
from fastembed.sparse import SparseTextEmbedding

def main():
    print("FastEmbed BM25 Example")
    print("----------------------")
    
    # Sample documents for demonstration
    documents = [
        "FastEmbed is a lightweight, fast, Python library built for embedding generation.",
        "The default text embedding model is Flag Embedding, presented in the MTEB leaderboard.",
        "Qdrant is a vector similarity search engine that provides a production-ready service.",
        "BM25 is a classic IR scoring function used to estimate the relevance of documents.",
        "Vector search combines traditional keyword matching with semantic understanding.",
    ]
    
    print("Loading BM25 model...")
    try:
        # Initialize the BM25 sparse embedding model
        model = SparseTextEmbedding(model_name="Qdrant/bm25")
        print("Model loaded successfully!")
        
        # Generate sparse embeddings for documents
        print("\nGenerating sparse embeddings for sample documents...")
        embeddings = list(model.embed(documents))
        
        # Display information about the embeddings
        print(f"Generated {len(embeddings)} sparse embeddings")
        
        for i, emb in enumerate(embeddings):
            print(f"\nDocument {i+1}:")
            print(f"  Text: {documents[i]}")
            print(f"  Number of non-zero dimensions: {len(emb.indices)}")
            
            # Display the first few indices and their values
            preview_count = min(5, len(emb.indices))
            print(f"  First {preview_count} token indices and their weights:")
            for j in range(preview_count):
                print(f"    Token ID: {emb.indices[j]}, Weight: {emb.values[j]:.4f}")
        
        # Try a search query
        query = "vector similarity search"
        print(f"\nGenerating embedding for query: '{query}'")
        query_embedding = list(model.query_embed(query))[0]
        
        print(f"Query embedding has {len(query_embedding.indices)} non-zero dimensions")
        print("Query token indices:", query_embedding.indices)
        
        print("\nIn a real application, you would use these sparse embeddings with")
        print("a vector database like Qdrant to perform efficient similarity search.")
        
    except Exception as e:
        print(f"Error: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
