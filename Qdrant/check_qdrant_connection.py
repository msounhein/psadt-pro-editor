#!/usr/bin/env python3
"""
Qdrant Cloud Connection Check

This script verifies connectivity to Qdrant Cloud and displays information
about existing collections.
"""

import sys
import json

try:
    from qdrant_client import QdrantClient
    from qdrant_client.http import models as qmodels
except ImportError:
    print("Error: qdrant-client is not installed. Install with: pip install 'qdrant-client[fastembed]'")
    sys.exit(1)

# Qdrant Cloud connection details - UPDATE THESE!
QDRANT_URL = "https://your-cluster-url.qdrant.io"  # Replace with your Qdrant Cloud URL
QDRANT_API_KEY = "your-api-key"  # Replace with your Qdrant Cloud API key

def check_connection():
    """
    Check the connection to Qdrant Cloud
    """
    print("Checking connection to Qdrant Cloud...")
    
    if QDRANT_URL == "https://your-cluster-url.qdrant.io":
        print("ERROR: Please update the QDRANT_URL in the script with your actual Qdrant Cloud URL")
        return False
    
    if QDRANT_API_KEY == "your-api-key":
        print("ERROR: Please update the QDRANT_API_KEY in the script with your actual Qdrant Cloud API key")
        return False
    
    try:
        client = QdrantClient(
            url=QDRANT_URL,
            api_key=QDRANT_API_KEY,
        )
        
        # Try to get cluster info
        cluster_info = client.get_cluster_info()
        print("\n✅ Successfully connected to Qdrant Cloud!")
        print(f"Status: {cluster_info.status}")
        print(f"Number of peers: {len(cluster_info.peers)}")
        
        # Get collections
        collections = client.get_collections().collections
        print(f"\nNumber of collections: {len(collections)}")
        
        if collections:
            print("\nAvailable collections:")
            for collection in collections:
                print(f"  - {collection.name}")
                # Try to get more details
                try:
                    details = client.get_collection(collection.name)
                    vectors_count = details.vectors_count
                    config = details.config
                    
                    print(f"    Vectors: {vectors_count}")
                    if config.params.sparse_vectors:
                        print(f"    Has sparse vectors: Yes")
                        for name in config.params.sparse_vectors:
                            print(f"    Sparse vector field: {name}")
                    else:
                        print(f"    Has sparse vectors: No")
                except Exception as e:
                    print(f"    Error getting details: {e}")
        
        return True
    
    except Exception as e:
        print(f"❌ Error connecting to Qdrant Cloud: {e}")
        return False

def main():
    print("Qdrant Cloud Connection Checker")
    print("==============================\n")
    
    success = check_connection()
    
    if success:
        print("\nConnection successful! Your configuration is correctly set up.")
    else:
        print("\nConnection failed. Please check your configuration and try again.")
        print("Refer to QDRANT_CLOUD_SETUP.md for setup instructions.")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
