#!/usr/bin/env python3
"""
Generate Embeddings Script

This script reads JSON data from a file and generates embeddings using FastEmbed,
then uploads them to Qdrant.
"""

import os
import sys
import json
import argparse
from typing import List, Dict, Any, Union

try:
    from fastembed import TextEmbedding
    from fastembed.sparse import SparseTextEmbedding
except ImportError:
    print("Error: fastembed is not installed. Install with: pip install fastembed")
    sys.exit(1)

try:
    from qdrant_client import QdrantClient
    from qdrant_client.http import models as qmodels
except ImportError:
    print("Error: qdrant-client is not installed. Install with: pip install 'qdrant-client[fastembed]'")
    sys.exit(1)

def get_env_var(name: str, default: str = None) -> str:
    """Get environment variable or default value"""
    return os.environ.get(name, default)

def create_text_representation(item: Dict[str, Any]) -> str:
    """Create a textual representation of an item for embedding"""
    
    # Handle command objects
    if 'name' in item and 'synopsis' in item:
        # This is a command
        text = f"{item['name']}: {item['synopsis']}\n"
        
        if 'syntax' in item:
            text += f"{item['syntax']}\n"
            
        # Add parameters if available
        if 'parameters' in item and item['parameters']:
            text += "Parameters:\n"
            for param in item['parameters']:
                text += f"- {param['name']}: {param['description']}\n"
        
        # Add examples if available
        if 'examples' in item and item['examples']:
            text += "Examples:\n"
            for example in item['examples']:
                text += f"- {example['title']}: {example['code']}\n"
                
        return text
        
    # Handle documentation objects
    if 'title' in item and 'content' in item:
        # This is a documentation entry
        return f"{item['title']}\n{item['content']}"
    
    # Generic fallback - convert all fields to text
    return "\n".join([f"{k}: {v}" for k, v in item.items() if isinstance(v, (str, int, float, bool))])

def main():
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Generate embeddings and upload to Qdrant")
    parser.add_argument("--input", required=True, help="Path to JSON file containing items")
    parser.add_argument("--collection", required=True, help="Qdrant collection name")
    parser.add_argument("--sparse", action="store_true", help="Use sparse embeddings (BM25)")
    parser.add_argument("--batch-size", type=int, default=32, help="Batch size for processing")
    args = parser.parse_args()
    
    # Load JSON data
    print(f"Loading data from {args.input}...")
    with open(args.input, 'r', encoding='utf-8') as f:
        items = json.load(f)
    
    print(f"Loaded {len(items)} items")
    
    # Initialize Qdrant client
    qdrant_url = get_env_var("QDRANT_URL", "http://localhost:6333")
    qdrant_api_key = get_env_var("QDRANT_API_KEY")
    
    client = QdrantClient(
        url=qdrant_url,
        api_key=qdrant_api_key
    )
    
    # Initialize embedding model
    if args.sparse:
        print("Using BM25 sparse embedding model")
        model = SparseTextEmbedding(model_name="Qdrant/bm25")
    else:
        print("Using bge-small-en-v1.5 dense embedding model")
        model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
    
    # Process items in batches
    batch_size = args.batch_size
    for i in range(0, len(items), batch_size):
        batch = items[i:i+batch_size]
        print(f"Processing batch {i//batch_size + 1}/{(len(items) + batch_size - 1)//batch_size}...")
        
        batch_texts = [create_text_representation(item) for item in batch]
        
        # Generate embeddings
        batch_embeddings = list(model.embed(batch_texts))
        
        # Prepare points for Qdrant
        points = []
        for j, (item, embedding) in enumerate(zip(batch, batch_embeddings)):
            # Generate an ID if not present
            item_id = item.get('id', i + j)
            
            if args.sparse:
                # For sparse embeddings
                sparse_vector = {
                    "indices": embedding.indices.tolist(),
                    "values": embedding.values.tolist()
                }
                
                points.append(
                    qmodels.PointStruct(
                        id=item_id,
                        payload=item,
                        vector=None,  # No dense vector
                        sparse_vectors={"text": sparse_vector}
                    )
                )
            else:
                # For dense embeddings
                dense_vector = embedding.tolist()
                
                points.append(
                    qmodels.PointStruct(
                        id=item_id,
                        payload=item,
                        vector=dense_vector
                    )
                )
        
        # Upload to Qdrant
        client.upsert(
            collection_name=args.collection,
            points=points
        )
        
        print(f"Uploaded {len(points)} points to collection {args.collection}")
    
    print(f"Successfully processed and uploaded {len(items)} items")

if __name__ == "__main__":
    main()
