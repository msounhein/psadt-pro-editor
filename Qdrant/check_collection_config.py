#!/usr/bin/env python3
"""
Check Qdrant Collection Configuration

This script checks the configuration of a specific Qdrant collection
to determine if it supports sparse vectors and what parameters it uses.
"""

import sys
import json

try:
    from qdrant_client import QdrantClient
except ImportError:
    print("Error: qdrant-client is not installed. Install with: pip install 'qdrant-client[fastembed]'")
    sys.exit(1)

def check_collection(collection_name, url=None, api_key=None):
    """
    Check configuration of a specific collection
    
    Args:
        collection_name: Name of the collection to check
        url: URL for Qdrant server (None for in-memory)
        api_key: API key for Qdrant Cloud (None for local)
    """
    try:
        # Connect to Qdrant
        if url:
            print(f"Connecting to Qdrant at {url}...")
            client = QdrantClient(url=url, api_key=api_key, timeout=10.0)
        else:
            print("Using local Qdrant at http://localhost:6333...")
            client = QdrantClient(host="localhost", port=6333)
        
        # Try to get collection info
        print(f"Fetching information for collection '{collection_name}'...")
        collection_info = client.get_collection(collection_name)
        
        # Display basic info
        print("\nCollection Information:")
        print(f"  Name: {collection_name}")
        
        if hasattr(collection_info, 'status'):
            print(f"  Status: {collection_info.status}")
        
        if hasattr(collection_info, 'vectors_count'):
            print(f"  Vector Count: {collection_info.vectors_count}")
        
        if hasattr(collection_info, 'points_count'):
            print(f"  Points Count: {collection_info.points_count}")
        
        if hasattr(collection_info, 'segments_count'):
            print(f"  Segments Count: {collection_info.segments_count}")
        
        # Check vector configuration
        if hasattr(collection_info, 'config') and hasattr(collection_info.config, 'params'):
            config_params = collection_info.config.params
            
            # Check vector params
            if hasattr(config_params, 'vectors'):
                print("\nVector Configuration:")
                vectors_config = config_params.vectors
                print(f"  Size: {vectors_config.size}")
                print(f"  Distance: {vectors_config.distance}")
                if hasattr(vectors_config, 'on_disk'):
                    print(f"  On Disk: {vectors_config.on_disk}")
            
            # Check sparse vector params
            if hasattr(config_params, 'sparse_vectors'):
                print("\nSparse Vector Configuration:")
                sparse_vectors = config_params.sparse_vectors
                if sparse_vectors:
                    for name, config in sparse_vectors.items():
                        print(f"  Field: {name}")
                        if hasattr(config, 'index'):
                            print(f"    Index On Disk: {config.index.on_disk}")
                        
                        # Check for other parameters
                        for key, value in vars(config).items():
                            if key != 'index' and not key.startswith('_'):
                                print(f"    {key}: {value}")
                else:
                    print("  No sparse vector configuration found.")
            else:
                print("\nThis collection does not support sparse vectors.")
        
        # Get collection schema
        try:
            schema = client.get_collection_info(collection_name)
            print("\nRaw Collection Schema:")
            schema_dict = vars(schema)
            # Convert the schema to JSON for better readability
            schema_json = json.dumps(schema_dict, default=lambda o: '<non-serializable>', indent=2)
            print(schema_json)
        except Exception as e:
            print(f"\nError getting collection schema: {e}")
        
        return True
    except Exception as e:
        print(f"Error: {str(e)}")
        return False

def main():
    print("Qdrant Collection Configuration Checker")
    print("=====================================\n")
    
    # Get collection name
    if len(sys.argv) > 1:
        collection_name = sys.argv[1]
    else:
        collection_name = input("Enter collection name to check: ")
    
    # Check if connection type is specified
    if len(sys.argv) > 2 and sys.argv[2] == "cloud":
        # Use Qdrant Cloud
        url = input("Enter Qdrant Cloud URL: ")
        api_key = input("Enter Qdrant API Key: ")
        success = check_collection(collection_name, url, api_key)
    else:
        # Use local Qdrant server
        success = check_collection(collection_name)
    
    if success:
        print("\nOperation completed successfully.")
    else:
        print("\nOperation failed. Please check your connection settings and collection name.")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
