from fastembed import TextEmbedding

# Initialize the model using the local files
model = TextEmbedding(
    model_name="model_02.onnx",
    cache_dir="C:/Users/msoun/OneDrive/Documents/Code/Web/psadt-pro-ui/Qdrant/models/sentence-transformers_all-MiniLM-L6-v2/onnx",
    provider="onnxruntime"
)

# Example PSADT commands
documents = [
    "Show-InstallationWelcome: Shows a welcome dialog prompting the user with information about the installation and actions to take.",
    "Close-InstallationProgress: Closes the installation progress dialog.",
    "Show-InstallationPrompt: Displays a custom installation prompt with the specified message and buttons."
]

# Generate embeddings
print("Generating embeddings...")
embeddings = list(model.embed(documents))

# Display information about the embeddings
print(f"Generated {len(embeddings)} embeddings")
print(f"Embedding dimension: {len(embeddings[0])}")
print(f"Embedding type: {type(embeddings[0])}")

# Calculate similarity between embeddings (optional)
from numpy import dot
from numpy.linalg import norm

def cosine_similarity(a, b):
    return dot(a, b) / (norm(a) * norm(b))

# Compare first and second embeddings
similarity_1_2 = cosine_similarity(embeddings[0], embeddings[1])
print(f"Similarity between docs 1 and 2: {similarity_1_2:.4f}")

# Compare first and third embeddings
similarity_1_3 = cosine_similarity(embeddings[0], embeddings[2])
print(f"Similarity between docs 1 and 3: {similarity_1_3:.4f}")