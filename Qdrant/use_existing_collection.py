#!/usr/bin/env python3
"""
Use Existing Qdrant Collection with BM25

This script uses FastEmbed BM25 with an existing Qdrant collection
without trying to create a new collection.
"""

import os
import sys
from typing import List, Dict, Any

# Import FastEmbed
try:
    from fastembed.sparse import SparseTextEmbedding
except ImportError:
    print("Error: fastembed is not installed. Install with: pip install fastembed")
    sys.exit(1)

# Import Qdrant client
try:
    from qdrant_client import QdrantClient
    from qdrant_client.http import models as qmodels
except ImportError:
    print("Error: qdrant-client is not installed. Install with: pip install 'qdrant-client[fastembed]'")
    sys.exit(1)

def get_psadt_commands_from_db() -> List[Dict[str, Any]]:
    """
    Fetch PSADT commands from the database.
    This is a placeholder with example data.
    """
    print("Preparing example PSADT commands...")
    
    # Example placeholder data
    commands = [
        {
            "id": 1,
            "name": "Show-InstallationWelcome",
            "synopsis": "Shows a welcome dialog prompting the user with information about the installation and actions to take.",
            "syntax": "Show-InstallationWelcome -CloseApps <String[]> [-CloseAppsCountdown <Int32>] [-NoCloseApps] [-CloseAppsForce] [-PersistPrompt] [-AllowDefer] [-AllowDeferCloseApps] [-DeferTimes <Int32>] [-DeferDays <Int32>] [-DeferDeadline <String>] [-MinimizeWindows <Boolean>] [-CustomText] [-ForceCloseAppsCountdown <Int32>] [-PromptToSave] [-TopMost <Boolean>]"
        },
        {
            "id": 2,
            "name": "Close-InstallationProgress",
            "synopsis": "Closes the installation progress dialog.",
            "syntax": "Close-InstallationProgress [-CloseReason <String>]"
        },
        {
            "id": 3,
            "name": "Show-InstallationPrompt",
            "synopsis": "Displays a custom installation prompt with the specified message and buttons.",
            "syntax": "Show-InstallationPrompt [-Message <String>] [-ButtonRightText <String>] [-ButtonLeftText <String>] [-ButtonMiddleText <String>] [-Icon <String>] [-NoWait] [-PersistPrompt] [-MinimizeWindows <Boolean>] [-Timeout <Int32>] [-ExitOnTimeout] [-TopMost <Boolean>]"
        }
    ]
    
    print(f"Prepared {len(commands)} example commands.")
    return commands

def add_to_existing_collection(commands: List[Dict[str, Any]], collection_name: str, server_url: str = None, api_key: str = None) -> None:
    """
    Add embeddings to an existing Qdrant collection
    
    Args:
        commands: List of command dictionaries
        collection_name: Name of the existing collection
        server_url: URL for Qdrant server (default: http://localhost:6333)
        api_key: API key for Qdrant Cloud (None for local)
    """
    print(f"Adding commands to existing collection '{collection_name}'...")
    
    # Initialize BM25 embedding model
    model = SparseTextEmbedding(model_name="Qdrant/bm25")
    print("Using BM25 sparse embedding model")
    
    # Connect to Qdrant
    if server_url:
        print(f"Connecting to Qdrant at {server_url}...")
        client = QdrantClient(url=server_url, api_key=api_key, timeout=30.0)
    else:
        print("Connecting to local Qdrant server...")
        client = QdrantClient(host="localhost", port=6333)
    
    # Verify collection exists
    try:
        collection_info = client.get_collection(collection_name)
        print(f"Successfully connected to collection '{collection_name}'")
    except Exception as e:
        print(f"Error: Collection '{collection_name}' does not exist or cannot be accessed: {e}")
        sys.exit(1)
    
    # Check if collection supports sparse vectors
    has_sparse_vectors = False
    sparse_vector_field = None
    
    if hasattr(collection_info, 'config') and hasattr(collection_info.config, 'params'):
        if hasattr(collection_info.config.params, 'sparse_vectors'):
            sparse_vectors = collection_info.config.params.sparse_vectors
            if sparse_vectors:
                has_sparse_vectors = True
                # Get the first sparse vector field name
                sparse_vector_field = next(iter(sparse_vectors.keys()))
                print(f"Collection supports sparse vectors with field name: {sparse_vector_field}")
    
    if not has_sparse_vectors:
        print("Error: Collection does not support sparse vectors.")
        print("Please use a collection that has been configured with sparse vector support.")
        sys.exit(1)
    
    # Process commands and upload to Qdrant
    points = []
    for command in commands:
        # Create text representation of the command
        command_text = f"{command['name']}: {command['synopsis']}\n{command['syntax']}"
        
        # Generate embeddings
        embeddings = list(model.embed(command_text))
        
        # Convert to format expected by Qdrant
        sparse_vector = {
            "indices": embeddings[0].indices.tolist(),
            "values": embeddings[0].values.tolist()
        }
        
        # Add point
        point = qmodels.PointStruct(
            id=command["id"],
            payload=command,
            vector=None,  # No dense vector
            sparse_vectors={sparse_vector_field: sparse_vector}
        )
        points.append(point)
    
    # Upload points to Qdrant
    if points:
        result = client.upsert(
            collection_name=collection_name,
            points=points
        )
        print(f"Successfully added {len(points)} commands to collection '{collection_name}'")
    else:
        print("No points to add.")

def search_commands(query: str, collection_name: str, server_url: str = None, api_key: str = None, limit: int = 3) -> List[Dict[str, Any]]:
    """
    Search for commands using BM25 and an existing collection
    
    Args:
        query: The search query
        collection_name: Name of the existing collection
        server_url: URL for Qdrant server (default: http://localhost:6333)
        api_key: API key for Qdrant Cloud (None for local)
        limit: Maximum number of results to return
        
    Returns:
        List of matching commands with scores
    """
    print(f"Searching for '{query}' in collection '{collection_name}'...")
    
    # Initialize BM25 embedding model
    model = SparseTextEmbedding(model_name="Qdrant/bm25")
    
    # Connect to Qdrant
    if server_url:
        client = QdrantClient(url=server_url, api_key=api_key, timeout=30.0)
    else:
        client = QdrantClient(host="localhost", port=6333)
    
    # Get collection info to find sparse vector field name
    collection_info = client.get_collection(collection_name)
    sparse_vector_field = None
    
    if hasattr(collection_info, 'config') and hasattr(collection_info.config, 'params'):
        if hasattr(collection_info.config.params, 'sparse_vectors'):
            sparse_vectors = collection_info.config.params.sparse_vectors
            if sparse_vectors:
                # Get the first sparse vector field name
                sparse_vector_field = next(iter(sparse_vectors.keys()))
    
    if not sparse_vector_field:
        print("Error: Collection does not support sparse vectors.")
        return []
    
    # Generate query embedding
    query_embedding = list(model.query_embed(query))[0]
    
    # Prepare sparse vector for search
    sparse_vector = {
        "indices": query_embedding.indices.tolist(),
        "values": query_embedding.values.tolist()
    }
    
    # Search in the collection
    try:
        search_results = client.search(
            collection_name=collection_name,
            query_vector=None,  # No dense vector
            query_sparse_vector={sparse_vector_field: sparse_vector},
            limit=limit
        )
        
        # Process results
        results = []
        for result in search_results:
            command = result.payload
            command["score"] = result.score
            results.append(command)
        
        print(f"Found {len(results)} matching commands")
        return results
    except Exception as e:
        print(f"Error during search: {e}")
        return []

def main():
    print("Using Existing Qdrant Collection with BM25")
    print("========================================\n")
    
    # Get collection name
    if len(sys.argv) > 1:
        collection_name = sys.argv[1]
    else:
        collection_name = input("Enter collection name: ")
    
    # Check if connection type is specified
    server_url = None
    api_key = None
    
    if len(sys.argv) > 2 and sys.argv[2] == "cloud":
        # Use Qdrant Cloud
        server_url = input("Enter Qdrant Cloud URL: ")
        api_key = input("Enter Qdrant API Key: ")
    
    # Menu
    while True:
        print("\nOptions:")
        print("1. Add example commands to collection")
        print("2. Search in collection")
        print("3. Exit")
        
        choice = input("\nEnter your choice (1-3): ")
        
        if choice == "1":
            # Add commands
            commands = get_psadt_commands_from_db()
            add_to_existing_collection(commands, collection_name, server_url, api_key)
        
        elif choice == "2":
            # Search
            query = input("Enter search query: ")
            results = search_commands(query, collection_name, server_url, api_key)
            
            # Display results
            if results:
                print("\nSearch Results:")
                for i, result in enumerate(results):
                    print(f"{i+1}. {result['name']} (Score: {result['score']:.4f})")
                    print(f"   {result['synopsis']}")
                    print(f"   Syntax: {result['syntax'][:80]}...")
            else:
                print("No results found.")
        
        elif choice == "3":
            # Exit
            print("Exiting.")
            break
        
        else:
            print("Invalid choice, please try again.")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
