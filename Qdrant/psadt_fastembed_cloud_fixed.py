#!/usr/bin/env python3
"""
PSADT Pro UI - FastEmbed Integration Script with Qdrant Cloud

This script demonstrates how to integrate FastEmbed and BM25 sparse embeddings
with the PSADT Pro UI project for enhanced documentation search using Qdrant Cloud.
"""

import os
import sys
from typing import List, Dict, Any

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
COMMANDS_COLLECTION = "psadt_commands"  # Changed to use a new collection name
DOCS_COLLECTION = "psadt_commands"

# Qdrant Cloud connection details
QDRANT_URL = "https://690453a8-203d-4a94-8f18-5572b39a5261.us-east-1-0.aws.cloud.qdrant.io:6333"  # Update with your URL
QDRANT_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.lYCLdBtLFzh5oXKwooj0gf8J1qaKxrPwTblEYFxMkWc"  # Update with your API key

def get_psadt_commands_from_db() -> List[Dict[str, Any]]:
    """
    Fetch PSADT commands from the database.
    This is a placeholder - implement the actual database query based on your schema.
    """
    print("Fetching PSADT commands from database...")
    
    # Example placeholder data
    commands = [
        {
            "id": 1,
            "name": "Show-InstallationWelcome",
            "synopsis": "Shows a welcome dialog prompting the user with information about the installation and actions to take.",
            "syntax": "Show-InstallationWelcome -CloseApps <String[]> [-CloseAppsCountdown <Int32>] [-NoCloseApps] [-CloseAppsForce] [-PersistPrompt] [-AllowDefer] [-AllowDeferCloseApps] [-DeferTimes <Int32>] [-DeferDays <Int32>] [-DeferDeadline <String>] [-MinimizeWindows <Boolean>] [-CustomText] [-ForceCloseAppsCountdown <Int32>] [-PromptToSave] [-TopMost <Boolean>]"
        },
    ]
    
    print(f"Fetched {len(commands)} commands.")
    return commands

def create_qdrant_client():
    """
    Create and return a Qdrant client connected to Qdrant Cloud
    """
    if QDRANT_URL == "https://your-cluster-url.qdrant.io":
        print("Please update the QDRANT_URL in the script with your actual Qdrant Cloud URL")
        sys.exit(1)
    
    if QDRANT_API_KEY == "your-api-key":
        print("Please update the QDRANT_API_KEY in the script with your actual Qdrant Cloud API key")
        sys.exit(1)
    
    return QdrantClient(
        url=QDRANT_URL,
        api_key=QDRANT_API_KEY,
        timeout=30.0,  # Increased timeout
    )

def supports_sparse_vectors(client, collection_name):
    """
    Check if a collection supports sparse vectors
    """
    try:
        collection_info = client.get_collection(collection_name)
        
        if hasattr(collection_info, 'config') and hasattr(collection_info.config, 'params'):
            if hasattr(collection_info.config.params, 'sparse_vectors'):
                sparse_vectors = collection_info.config.params.sparse_vectors
                if sparse_vectors:
                    return True
    except Exception:
        pass
    
    return False

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
    
    # Check if collection exists
    collection_exists = False
    supports_sparse = False
    
    try:
        client.get_collection(collection_name=collection_name)
        collection_exists = True
        
        # Check if it supports sparse vectors
        if use_sparse:
            supports_sparse = supports_sparse_vectors(client, collection_name)
            if not supports_sparse:
                print(f"Warning: Collection '{collection_name}' exists but does not support sparse vectors.")
                print(f"Creating a new collection '{collection_name}_new' with sparse vector support...")
                collection_name = f"{collection_name}_new"
                collection_exists = False
    except Exception:
        collection_exists = False
        print(f"Collection '{collection_name}' does not exist. Creating new collection...")
    
    # Create collection if needed
    if not collection_exists:
        if use_sparse:
            # Sparse vectors need special configuration
            client.create_collection(
                collection_name=collection_name,
                vectors_config=qmodels.VectorParams(
                    size=1,  # Placeholder for sparse vectors
                    distance=qmodels.Distance.DOT,
                ),
                sparse_vectors_config={
                    "text": qmodels.SparseVectorParams(
                        index=qmodels.SparseIndexParams(
                            on_disk=True,
                        ),
                    )
                }
            )
            print(f"Created new collection '{collection_name}' with sparse vector support")
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
            print(f"Created new collection '{collection_name}' for dense vectors")
    
    # Process commands and upload to Qdrant
    for i, command in enumerate(commands):
        # Create text representation of the command
        command_text = f"{command['name']}: {command['synopsis']}\n{command['syntax']}"
        
        try:
            if use_sparse and (not collection_exists or supports_sparse):
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
                            vector=[0.0],  # Dummy vector
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
            
            print(f"Added command: {command['name']}")
            
        except Exception as e:
            print(f"Error adding command {command['name']}: {str(e)}")
    
    print(f"Finished processing {len(commands)} commands.")

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
    
    # Determine collection name
    collection_name = COMMANDS_COLLECTION
    
    # Check if collection exists and supports sparse vectors
    if use_sparse:
        try:
            supports_sparse = supports_sparse_vectors(client, collection_name)
            if not supports_sparse:
                alternative = f"{collection_name}_new"
                try:
                    if supports_sparse_vectors(client, alternative):
                        collection_name = alternative
                        print(f"Using alternative collection '{collection_name}' that supports sparse vectors")
                    else:
                        print(f"Warning: No collection found that supports sparse vectors. Falling back to dense search.")
                        use_sparse = False
                        model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
                        query_embedding = list(model.embed(query))[0]
                except Exception:
                    print(f"Warning: No collection found that supports sparse vectors. Falling back to dense search.")
                    use_sparse = False
                    model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
                    query_embedding = list(model.embed(query))[0]
        except Exception as e:
            print(f"Error checking collection: {str(e)}")
            return []
    
    # Perform search
    try:
        if use_sparse:
            # For sparse embeddings
            sparse_vector = {
                "indices": query_embedding.indices.tolist(),
                "values": query_embedding.values.tolist()
            }
            
            search_results = client.search(
                collection_name=collection_name,
                query_vector=[0.0],  # Dummy vector
                query_sparse_vector={"text": sparse_vector},
                limit=limit
            )
        else:
            # For dense embeddings
            search_results = client.search(
                collection_name=collection_name,
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
    except Exception as e:
        print(f"Error during search: {str(e)}")
        return []

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
