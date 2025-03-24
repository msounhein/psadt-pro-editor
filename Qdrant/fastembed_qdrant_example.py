
#!/usr/bin/env python3

import sys
from fastembed import TextEmbedding
from fastembed.sparse import SparseTextEmbedding

def main():
    print("FastEmbed with Qdrant Example")
    print("-----------------------------")
    print("This script demonstrates how to use FastEmbed models with Qdrant")
    print("Note: You need to have Qdrant running or install qdrant-client with")
    print("      pip install 'qdrant-client[fastembed]'")
    print("\n")
    
    try:
        # Try to import qdrant_client
        print("Checking if qdrant-client is installed...")
        try:
            from qdrant_client import QdrantClient
            from qdrant_client.http.models import Distance, VectorParams, PointStruct
            print("✓ qdrant-client is installed")
        except ImportError:
            print("✗ qdrant-client is not installed")
            print("  Please install with: pip install 'qdrant-client[fastembed]'")
            return 1
        
        # Sample documents for demonstration
        documents = [
            "FastEmbed is a lightweight, fast, Python library built for embedding generation.",
            "The default text embedding model is Flag Embedding, presented in the MTEB leaderboard.",
            "Qdrant is a vector similarity search engine that provides a production-ready service.",
            "BM25 is a classic IR scoring function used to estimate the relevance of documents.",
            "Vector search combines traditional keyword matching with semantic understanding.",
        ]
        
        # PART 1: Dense Embeddings
        print("\n--- DENSE EMBEDDINGS EXAMPLE ---")
        print("Loading TextEmbedding model (BAAI/bge-small-en-v1.5)...")
        dense_model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
        print("Model loaded successfully!")
        
        # Generate dense embeddings
        print("Generating dense embeddings...")
        dense_embeddings = list(dense_model.embed(documents))
        print(f"Generated {len(dense_embeddings)} dense embeddings, each with dimension {len(dense_embeddings[0])}")
        
        # PART 2: Sparse Embeddings (BM25)
        print("\n--- SPARSE EMBEDDINGS EXAMPLE (BM25) ---")
        print("Loading SparseTextEmbedding model (Qdrant/bm25)...")
        sparse_model = SparseTextEmbedding(model_name="Qdrant/bm25")
        print("Model loaded successfully!")
        
        # Generate sparse embeddings
        print("Generating sparse embeddings...")
        sparse_embeddings = list(sparse_model.embed(documents))
        print(f"Generated {len(sparse_embeddings)} sparse embeddings")
        
        for i, emb in enumerate(sparse_embeddings):
            print(f"\nDocument {i+1} sparse embedding:")
            print(f"  Number of non-zero dimensions: {len(emb.indices)}")
            preview_count = min(3, len(emb.indices))
            print(f"  Sample token indices: {emb.indices[:preview_count]}")
            print(f"  Sample token weights: {[f'{v:.4f}' for v in emb.values[:preview_count]]}")
        
        # PART 3: Using with Qdrant
        print("\n--- QDRANT INTEGRATION EXAMPLE ---")
        try:
            # Initialize in-memory Qdrant client
            print("Initializing in-memory Qdrant client...")
            client = QdrantClient(":memory:")
            print("Client initialized")
            
            # Create a collection for dense vectors
            collection_name = "sample_collection"
            print(f"Creating collection '{collection_name}' for dense vectors...")
            
            # Get vector size from our embeddings
            vector_size = len(dense_embeddings[0])
            
            client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
            )
            print("Collection created successfully")
            
            # Upload vectors to the collection
            print("Uploading vectors to the collection...")
            client.upsert(
                collection_name=collection_name,
                points=[
                    PointStruct(
                        id=i,
                        vector=dense_embeddings[i].tolist(),
                        payload={"text": documents[i]}
                    ) for i in range(len(documents))
                ]
            )
            print(f"Uploaded {len(documents)} vectors to the collection")
            
            # Search example
            print("\nPerforming vector search...")
            query = "vector search technology"
            print(f"Query: '{query}'")
            
            # Generate embedding for the query
            query_embedding = next(dense_model.embed(query))
            
            # Search in the collection
            search_results = client.search(
                collection_name=collection_name,
                query_vector=query_embedding.tolist(),
                limit=3
            )
            
            print("\nSearch Results:")
            for i, result in enumerate(search_results):
                print(f"Result {i+1}: Score={result.score:.4f}")
                print(f"  Document: {result.payload['text']}")
            
        except Exception as e:
            print(f"Error during Qdrant integration: {e}")
            print("Note: This example is simplified and may require Qdrant server running")
            print("      or proper installation of qdrant-client.")
        
    except Exception as e:
        print(f"Error: {e}")
        return 1
    
    print("\nExample completed successfully")
    return 0

if __name__ == "__main__":
    sys.exit(main())
