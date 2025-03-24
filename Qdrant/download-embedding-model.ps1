# Download-EmbeddingModel.ps1
# This script downloads the sentence-transformers/all-MiniLM-L6-v2 model from Hugging Face
# and prepares it for use with FastEmbed

param (
    [string]$ModelName = "sentence-transformers/all-MiniLM-L6-v2",
    [string]$OutputDir = "$PSScriptRoot\models"
)

# Create output directory if it doesn't exist
if (-not (Test-Path -Path $OutputDir)) {
    New-Item -Path $OutputDir -ItemType Directory -Force | Out-Null
    Write-Host "Created output directory: $OutputDir" -ForegroundColor Green
}

# Create model-specific directory
$modelDir = Join-Path -Path $OutputDir -ChildPath ($ModelName -replace "/", "_")
if (-not (Test-Path -Path $modelDir)) {
    New-Item -Path $modelDir -ItemType Directory -Force | Out-Null
    Write-Host "Created model directory: $modelDir" -ForegroundColor Green
}

# Fix the path for Python (replace backslashes with forward slashes)
$pythonModelDir = $modelDir -replace "\\", "/"

# Check if Python and huggingface_hub are installed
try {
    $pythonVersion = python --version
    Write-Host "Found Python: $pythonVersion" -ForegroundColor Green
}
catch {
    Write-Host "Python is not installed or not in PATH. Please install Python first." -ForegroundColor Red
    exit 1
}

# Install required Python packages if not already installed
Write-Host "Checking for required Python packages..." -ForegroundColor Yellow
python -m pip install --upgrade pip
python -m pip install huggingface_hub torch transformers safetensors

# Create a Python script to download the model
$pythonScript = @"
from huggingface_hub import snapshot_download
import os
import sys
import json

# Model to download
model_name = "$ModelName"
output_dir = "$pythonModelDir"

print(f"Downloading model: {model_name}")
print(f"Output directory: {output_dir}")

try:
    # Download the complete model
    files = snapshot_download(
        repo_id=model_name,
        local_dir=output_dir,
        local_dir_use_symlinks=False
    )
    
    print(f"Downloaded {len(files)} files")
    
    # Create a summary file with model details
    model_info = {
        "name": model_name,
        "download_date": str(os.path.getmtime(output_dir)),
        "files": [os.path.basename(f) for f in files],
        "usage_example": f'''
from fastembed import TextEmbedding

# Use the locally downloaded model
model = TextEmbedding(
    model_name="{model_name}",
    cache_dir="{output_dir}"
)

# Example usage
documents = [
    "This is a test document about PSADT",
    "Another example about PowerShell scripting"
]

embeddings = list(model.embed(documents))
print(f"Generated {{len(embeddings)}} embeddings")
'''
    }
    
    with open(os.path.join(output_dir, "model_info.json"), "w") as f:
        json.dump(model_info, f, indent=2)
    
    print("Download completed successfully!")
    sys.exit(0)
except Exception as e:
    print(f"Error downloading model: {str(e)}")
    sys.exit(1)
"@

# Save the Python script to a temporary file
$pythonScriptPath = Join-Path -Path $OutputDir -ChildPath "download_model.py"
$pythonScript | Out-File -FilePath $pythonScriptPath -Encoding utf8

# Execute the Python script
Write-Host "Starting model download. This may take several minutes depending on your internet connection..." -ForegroundColor Yellow
Write-Host "Downloading $ModelName to $modelDir" -ForegroundColor Cyan

try {
    python $pythonScriptPath
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Model downloaded successfully!" -ForegroundColor Green
        Write-Host "You can now use this model with FastEmbed by specifying the cache_dir:" -ForegroundColor Green
        Write-Host "from fastembed import TextEmbedding" -ForegroundColor Cyan
        Write-Host "model = TextEmbedding(model_name='$ModelName', cache_dir='$modelDir')" -ForegroundColor Cyan
    }
    else {
        Write-Host "Model download failed. Check the error messages above." -ForegroundColor Red
    }
}
catch {
    Write-Host "Error executing Python script: $_" -ForegroundColor Red
}

# Fix the path for the test script
$pythonModelDir = $modelDir -replace "\\", "/"

# Create a simple test script
$testScript = @"
# Test the downloaded model
from fastembed import TextEmbedding

try:
    # Use the locally downloaded model
    model = TextEmbedding(
        model_name="$ModelName",
        cache_dir="$pythonModelDir"
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
"@

# Save the test script
$testScriptPath = Join-Path -Path $OutputDir -ChildPath "test_model.py"
$testScript | Out-File -FilePath $testScriptPath -Encoding utf8

Write-Host "`nA test script has been created at $testScriptPath" -ForegroundColor Yellow
Write-Host "You can test the model with: python $testScriptPath" -ForegroundColor Yellow

# Clean up
Remove-Item -Path $pythonScriptPath -Force
