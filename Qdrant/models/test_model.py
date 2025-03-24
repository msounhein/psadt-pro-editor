# Test the downloaded model
from fastembed import TextEmbedding

try:
    # Use the locally downloaded model
    model = TextEmbedding(
        model_name="sentence-transformers/all-MiniLM-L6-v2",
        cache_dir="C:/Users/msoun/OneDrive/Documents/Code/Web/psadt-pro-ui/Qdrant/models/sentence-transformers_all-MiniLM-L6-v2"
    )
    
    # Test with example documents
    documents = [
        "This is a test document about PSADT and installation packages",
        "Another example about PowerShell scripts and deployment"
    ]
    
    print("Testing model with example documents...")
    embeddings = list(model.embed(documents))
    print(f"Success! Generated {len(embeddings)} embeddings.")
    print(f"Embedding dimension: {len(embeddings[0])}")
    
except Exception as e:
    print(f"Error testing model: {str(e)}")
