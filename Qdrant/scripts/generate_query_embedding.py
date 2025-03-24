#!/usr/bin/env python3
"""
Generate Query Embedding Script

This script generates an embedding for a query using FastEmbed and outputs the result as JSON.
"""

import sys
import json
import argparse
import numpy as np

try:
    from fastembed import TextEmbedding
    from fastembed.sparse import SparseTextEmbedding
except ImportError:
    print("Error: fastembed is not installed. Install with: pip install fastembed")
    sys.exit(1)

class NumpyEncoder(json.JSONEncoder):
    """JSON encoder that handles NumPy types"""
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super().default(obj)

def main():
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Generate embedding for a query")
    parser.add_argument("--query", required=True, help="The search query")
    parser.add_argument("--sparse", action="store_true", help="Use sparse embeddings (BM25)")
    args = parser.parse_args()
    
    try:
        # Initialize embedding model
        if args.sparse:
            model = SparseTextEmbedding(model_name="Qdrant/bm25")
            
            # Generate embedding
            embedding = list(model.query_embed(args.query))[0]
            
            # Output as JSON
            result = {
                "indices": embedding.indices,
                "values": embedding.values
            }
            
            print(json.dumps(result, cls=NumpyEncoder))
            
        else:
            model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
            
            # Generate embedding
            embedding = list(model.embed(args.query))[0]
            
            # Output as JSON
            print(json.dumps(embedding, cls=NumpyEncoder))
            
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
