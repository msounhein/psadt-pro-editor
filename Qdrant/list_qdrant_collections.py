#!/usr/bin/env python3
"""
List Qdrant Collections

This script connects to Qdrant and lists all available collections.
It can connect to either a local Qdrant server or Qdrant Cloud.
"""

import sys
import time

try:
    from qdrant_client import QdrantClient
except ImportError:
    print("Error: qdrant-client is not installed. Install with: pip install 'qdrant-client[fastembed]'")
    sys.exit(1)

def list_collections(url=None, api_key=None):
    """
    List all collections in Qdrant
    
    Args:
        url: URL for Qdrant server (None for in-memory)
        api_key: API key for Qdrant Cloud (None for local)
    """
    try:
        # Connect to Qdrant
        if url:
            print(f"Connecting to Qdrant at {url}...")
            client = QdrantClient(url=url, api_key=api_key, timeout=10.0)
        else:
            print("Using in-memory Qdrant...")
            client = QdrantClient(":memory:")
        
        # Try to get collections
        print("Fetching collections...")
        collections_response = client.get_collections()
        
        # Display collections
        if collections_response and hasattr(collections_response, 'collections'):
            collections = collections_response.collections
            if collections:
                print(f"\nFound {len(collections)} collections:")
                for i, collection in enumerate(collections):
                    print(f"  {i+1}. {collection.name}")
                    
                    # Try to get more details about each collection
                    try:
                        details = client.get_collection(collection.name)
                        if hasattr(details, 'vectors_count'):
                            print(f"     - Vectors: {details.vectors_count}")
                        if hasattr(details, 'status'):
                            print(f"     - Status: {details.status}")
                    except Exception as e:
                        print(f"     - Error getting details: {str(e)}")
            else:
                print("\nNo collections found.")
        else:
            print("\nUnable to retrieve collections information.")
        
        return True
    except Exception as e:
        print(f"Error: {str(e)}")
        return False

def main():
    print("Qdrant Collections Lister")
    print("========================\n")
    
    # Check if connection type is specified
    if len(sys.argv) > 1 and sys.argv[1] == "cloud":
        # Use Qdrant Cloud
        url = input("https://690453a8-203d-4a94-8f18-5572b39a5261.us-east-1-0.aws.cloud.qdrant.io:6333")
        api_key = input("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.lYCLdBtLFzh5oXKwooj0gf8J1qaKxrPwTblEYFxMkWc")
        success = list_collections(url, api_key)
    elif len(sys.argv) > 1 and sys.argv[1] == "local":
        # Use local Qdrant server
        url = "https://690453a8-203d-4a94-8f18-5572b39a5261.us-east-1-0.aws.cloud.qdrant.io:6333"
        success = list_collections(url)
    else:
        # Try both in sequence
        print("Trying local Qdrant server...")
        success = list_collections("https://690453a8-203d-4a94-8f18-5572b39a5261.us-east-1-0.aws.cloud.qdrant.io:6333")
        
        if not success:
            print("\nLocal server failed. Would you like to try Qdrant Cloud? (y/n)")
            response = input().lower()
            if response == 'y':
                url = input("Enter Qdrant Cloud URL: ")
                api_key = input("Enter Qdrant API Key: ")
                success = list_collections(url, api_key)
    
    if success:
        print("\nOperation completed successfully.")
    else:
        print("\nOperation failed. Please check your connection settings.")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
