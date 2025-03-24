
#!/usr/bin/env python3
"""
PSADT Pro UI - FastEmbed Integration Script with Qdrant Cloud

This script demonstrates how to integrate FastEmbed and BM25 sparse embeddings
with the PSADT Pro UI project for enhanced documentation search using Qdrant Cloud.
"""

import os
import sys
import json
from pathlib import Path
from typing import List, Dict, Any, Optional, Union

# Import FastEmbed
try:
    from fastembed import TextEmbedding
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

# Constants - Update these with your actual project paths
PSADT_PRO_UI_PATH = "C:\\Users\\msoun\\OneDrive\\Documents\\Code\\Web\\psadt-pro-ui"
PSADT_DOCS_PATH = os.path.join(PSADT_PRO_UI_PATH, "docs")

# Collection names for Qdrant
COMMANDS_COLLECTION = "psadt_commands"
DOCS_COLLECTION = "psadt_commands"

# Qdrant Cloud connection details - UPDATE THESE!
QDRANT_URL = "https://690453a8-203d-4a94-8f18-5572b39a5261.us-east-1-0.aws.cloud.qdrant.io:6333"  # Replace with your Qdrant Cloud URL
QDRANT_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.lYCLdBtLFzh5oXKwooj0gf8J1qaKxrPwTblEYFxMkWc"  # Replace with your Qdrant Cloud API key

def get_psadt_commands_from_db() -> List[Dict[str, Any]]:
    """
    Fetch PSADT commands from the database.
    This is a placeholder - implement the actual database query based on your schema.
    """
    print("Fetching PSADT commands from database...")
    
    # You'll need to implement the actual database query here
    # This might use Prisma, a direct SQL query, or any other method your app uses
    
    # Example placeholder data
    commands = [
        {
            "id": 1,
            "name": "Show-InstallationWelcome",
            "synopsis": "Shows a welcome dialog prompting the user with information about the installation and actions to take.",
            "syntax": "Show-InstallationWelcome -CloseApps <String[]> [-CloseAppsCountdown <Int32>] [-NoCloseApps] [-CloseAppsForce] [-PersistPrompt] [-AllowDefer] [-AllowDeferCloseApps] [-DeferTimes <Int32>] [-DeferDays <Int32>] [-DeferDeadline <String>] [-MinimizeWindows <Boolean>] [-CustomText] [-ForceCloseAppsCountdown <Int32>] [-PromptToSave] [-TopMost <Boolean>]"
        },
        # Add more commands as needed
    ]
    
    print(f"Fetched {len(commands)} commands.")
    return commands

def create_qdrant_client():
    """
    Create and return a Qdrant client connected to Qdrant Cloud
    """
    if not QDRANT_URL or QDRANT_URL == "https://your-cluster-url.qdrant.io":
        print("Please update the QDRANT_URL in the script with your actual Qdrant Cloud URL")
        sys.exit(1)
    
    if not QDRANT_API_KEY or QDRANT_API_KEY == "your-api-key":
        print("Please update the QDRANT_API_KEY in the script with your actual Qdrant Cloud API key")
        sys.exit(1)
    
    return QdrantClient(
        url=QDRANT_URL,
        api_key=QDRANT_API_KEY,
    )

def create_embeddings_for_commands(commands: List[Dict[str, Any]], use_sparse: bool = True) -> None:
    """
    Create embeddings for PSADT commands and store them in Qdrant
    
    Args:
        commands: List of command dictionaries
        use_sparse: Whether to use sparse BM25 embeddings (True) or dense embeddings (False)
    """
    print(f"Creating {'sparse' if use_sparse else 'dense'} embeddings for {len(commands)} commands...")
    
    # Initialize embedding model
    if use_sparse:
        model = SparseTextEmbedding(model_name="Qdrant/bm25")
        print("Using BM25 sparse embedding model")
    else:
        model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
        print("Using bge-small-en-v1.5 dense embedding model")
    
    # Connect to Qdrant Cloud
    client = create_qdrant_client()
    
    # Prepare collection
    collection_name = COMMANDS_COLLECTION
    
    # Check if collection exists and recreate if needed
    try:
        collection_info = client.get_collection(collection_name=collection_name)
        print(f"Collection '{collection_name}' already exists. Recreating...")
        client.delete_collection(collection_name=collection_name)
    except Exception:
        print(f"Collection '{collection_name}' does not exist. Creating new collection...")
    
    # Create collection - the setup differs between sparse and dense vectors
    if use_sparse:
        # Sparse vectors need special configuration
        client.create_collection(
            collection_name=collection_name,
            vectors_config=qmodels.VectorParams(
                size=1,  # Placeholder, not used for sparse vectors
                distance=qmodels.Distance.DOT,
            ),
            sparse_vectors_config={
                "text": qmodels.SparseVectorParams(
                    index=qmodels.SparseIndexParams(
                        on_disk=True,
                    ),
                    # No dimensions parameter as it's not supported in this version
                )
            }
        )
    else:
        # For dense vectors
        vector_size = 384  # Size for bge-small-en-v1.5
        client.create_collection(
            collection_name=collection_name,
            vectors_config=qmodels.VectorParams(
                size=vector_size,
                distance=qmodels.Distance.COSINE,
            )
        )
    
    # Process commands and upload to Qdrant
    for i, command in enumerate(commands):
        # Create text representation of the command
        command_text = f"{command['name']}: {command['synopsis']}\n{command['syntax']}"
        
        # Generate embeddings
        if use_sparse:
            # For sparse embeddings
            embeddings = list(model.embed(command_text))
            
            # Convert to format expected by Qdrant
            sparse_vector = {
                "indices": embeddings[0].indices.tolist(),
                "values": embeddings[0].values.tolist()
            }
            
            # Add point with sparse vector
            client.upsert(
                collection_name=collection_name,
                points=[
                    qmodels.PointStruct(
                        id=command["id"],
                        payload=command,
                        vector=None,  # No dense vector
                        sparse_vectors={"text": sparse_vector}
                    )
                ]
            )
        else:
            # For dense embeddings
            embeddings = list(model.embed(command_text))
            dense_vector = embeddings[0].tolist()
            
            # Add point with dense vector
            client.upsert(
                collection_name=collection_name,
                points=[
                    qmodels.PointStruct(
                        id=command["id"],
                        payload=command,
                        vector=dense_vector
                    )
                ]
            )
    
    print(f"Successfully created embeddings and added {len(commands)} commands to Qdrant collection '{collection_name}'")

def search_psadt_commands(query: str, use_sparse: bool = True, limit: int = 5) -> List[Dict[str, Any]]:
    """
    Search for PSADT commands using embeddings
    
    Args:
        query: The search query
        use_sparse: Whether to use sparse BM25 embeddings (True) or dense embeddings (False)
        limit: Maximum number of results to return
        
    Returns:
        List of matching command dictionaries with scores
    """
    print(f"Searching for: '{query}' using {'sparse' if use_sparse else 'dense'} embeddings...")
    
    # Initialize embedding model
    if use_sparse:
        model = SparseTextEmbedding(model_name="Qdrant/bm25")
    else:
        model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
    
    # Generate embedding for query
    query_embedding = list(model.query_embed(query) if use_sparse else model.embed(query))[0]
    
    # Connect to Qdrant Cloud
    client = create_qdrant_client()
    
    # Perform search
    if use_sparse:
        # For sparse embeddings
        sparse_vector = {
            "indices": query_embedding.indices.tolist(),
            "values": query_embedding.values.tolist()
        }
        
        search_results = client.search(
            collection_name=COMMANDS_COLLECTION,
            query_vector=None,  # No dense vector
            query_sparse_vector={"text": sparse_vector},
            limit=limit
        )
    else:
        # For dense embeddings
        search_results = client.search(
            collection_name=COMMANDS_COLLECTION,
            query_vector=query_embedding.tolist(),
            limit=limit
        )
    
    # Process and return results
    results = []
    for result in search_results:
        command = result.payload
        command["score"] = result.score
        results.append(command)
    
    print(f"Found {len(results)} matching commands")
    return results

def main():
    print("PSADT Pro UI - FastEmbed Integration with Qdrant Cloud")
    print("-----------------------------------------------------")
    
    # Check if PSADT Pro UI path exists
    if not os.path.exists(PSADT_PRO_UI_PATH):
        print(f"Error: PSADT Pro UI path not found: {PSADT_PRO_UI_PATH}")
        print("Please update the PSADT_PRO_UI_PATH constant in this script")
        return 1
    
    # Example workflow
    try:
        # 1. Fetch commands from database
        commands = get_psadt_commands_from_db()
        
        # 2. Create embeddings (sparse BM25 by default)
        create_embeddings_for_commands(commands, use_sparse=True)
        
        # 3. Demo search
        search_query = "close applications installer"
        results = search_psadt_commands(search_query, use_sparse=True, limit=3)
        
        # Display results
        print("\nSearch Results:")
        for i, result in enumerate(results):
            print(f"{i+1}. {result['name']} (Score: {result['score']:.4f})")
            print(f"   {result['synopsis'][:100]}...")
        
        print("\nTo fully integrate with your PSADT Pro UI project:")
        print("1. Create a service class to interact with Qdrant Cloud")
        print("2. Implement the API endpoints for search")
        print("3. Add UI components to display and interact with search results")
        
    except Exception as e:
        print(f"Error: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
