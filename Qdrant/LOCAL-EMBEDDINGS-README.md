# Local Embeddings for PSADT Pro UI

This document explains how to set up and use the local sentence-transformers model for AI-powered code completions in the PSADT Pro UI.

## Prerequisites

- Python 3.8 or newer installed on your system
- Windows 10 or Windows Server 2016 or newer
- (Optional) NVIDIA GPU with compatible drivers for acceleration

## Installation with Virtual Environment (Recommended for Windows Servers)

Using a virtual environment is recommended to isolate dependencies and avoid conflicts, especially in server environments.

1. **Open Command Prompt as Administrator**

2. **Navigate to the PSADT Pro UI directory**

   ```cmd
   cd C:\path\to\psadt-pro-ui
   ```

3. **Create a Virtual Environment**

   ```cmd
   python -m venv .venv
   ```

4. **Activate the Virtual Environment**

   ```cmd
   .venv\Scripts\activate
   ```

   You should see `(.venv)` at the beginning of your command prompt, indicating the virtual environment is active.

5. **Install Required Packages**

   ```cmd
   pip install -r python-requirements.txt
   ```

6. **Install PyTorch with GPU Support (Optional but Recommended)**

   If you have an NVIDIA GPU and want to enable GPU acceleration:

   ```cmd
   # For CUDA 11.7
   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu117
   
   # For CUDA 11.8
   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
   
   # For the latest CUDA version
   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
   ```

   Choose the version that matches your CUDA installation. If you're not sure which CUDA version you have, you can check with:

   ```cmd
   nvidia-smi
   ```

7. **Verify the Installation**

   ```cmd
   python -c "import sentence_transformers; import torch; print('All packages installed successfully'); print('CUDA available:', torch.cuda.is_available())"
   ```

   This should print `All packages installed successfully` and whether CUDA is available.

8. **Set the Python Path Environment Variable**

   After creating the virtual environment, set the `PSADT_PYTHON_PATH` environment variable to point to the Python executable in your virtual environment:

   ```cmd
   setx PSADT_PYTHON_PATH "C:\path\to\psadt-pro-ui\.venv\Scripts\python.exe"
   ```

   For system-wide configuration (recommended for servers):

   ```cmd
   setx PSADT_PYTHON_PATH "C:\path\to\psadt-pro-ui\.venv\Scripts\python.exe" /M
   ```
   
   This requires administrator privileges but ensures all users and services can access the Python executable.

   Additional environment variables you can set:
   - `PSADT_DATA_DIR`: Directory for storing script files and logs
   - `PSADT_DEBUG`: Set to 'true' to enable debug logging

## Installation without Virtual Environment

## Installation without Virtual Environment

If you prefer not to use a virtual environment, you can install the packages globally:

1. **Open Command Prompt as Administrator**

2. **Install Required Packages**

   ```cmd
   pip install -r python-requirements.txt
   ```

3. **Install PyTorch with GPU Support (Optional)**

   Follow the instructions for installing PyTorch as shown in the virtual environment section.

## First Use

The first time you use the local embedding service, it will download the sentence-transformers model (about 80MB) automatically and cache it locally. This might take a few moments, but subsequent uses will be faster.

By default, the model is downloaded to:
- Windows: `C:\Users\<username>\.cache\torch\sentence_transformers`
- Linux: `~/.cache/torch/sentence_transformers`

You can verify the model is downloaded by checking this directory.

## How It Works

The local embedding service:

1. Launches a Python process in the background when needed
2. Uses the sentence-transformers library to generate embeddings
3. Communicates through a standard input/output pipe
4. Automatically uses your GPU if available

The model maps text to a 384-dimensional vector space that captures semantic meaning, allowing the completion system to find contextually relevant suggestions.

## Windows-Specific Considerations

### Path Issues

Windows uses backslashes (`\`) in paths, while the code may use forward slashes (`/`). The implementation handles this, but if you encounter path-related errors:

1. Make sure paths don't contain special characters or spaces
2. Consider using a shorter path to the application

### Firewall and Antivirus

Windows Defender or other security software might block the Python child process:

1. Check Windows Defender or your antivirus logs for blocked actions
2. Add exceptions for the Python executable and the application directory if needed

### Long Path Support

If you encounter "path too long" errors:

1. Enable long path support in Windows by running this in an admin PowerShell:

   ```powershell
   New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
   -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
   ```

2. Consider moving the application to a shorter path

## Troubleshooting

If you encounter issues with the local embedding service:

1. **Check Python Installation**

   Ensure Python is properly installed and in your PATH:

   ```cmd
   python --version
   ```

2. **Verify Package Installation**

   Make sure the required packages are installed:

   ```cmd
   python -c "import sentence_transformers; import torch; print('All packages installed successfully')"
   ```

3. **GPU Issues**

   If you have a GPU but it's not being used:

   ```cmd
   python -c "import torch; print('CUDA available:', torch.cuda.is_available())"
   ```

   If this returns `False`, make sure:
   - Your GPU drivers are up to date
   - You've installed the CUDA-enabled version of PyTorch
   - Your GPU is compatible with the installed CUDA version

4. **Virtual Environment Path**

   If using a virtual environment, make sure the application knows where to find it:

   ```javascript
   const embeddingService = getLocalEmbeddingService({ 
     pythonPath: 'C:\\path\\to\\psadt-pro-ui\\.venv\\Scripts\\python.exe'
   });
   ```

5. **Fallback Mechanism**

   If the local embedding service fails, the system will automatically fall back to deterministic random embeddings, though the results will be less accurate.

## Performance Considerations

- **GPU vs CPU**: Using a GPU will significantly speed up embedding generation
- **First Run**: The first run will be slower as it needs to load the model
- **Memory Usage**: The model uses about 200-300MB of RAM/VRAM when loaded

## Advanced Configuration

The local embedding service can be configured by modifying the parameters in the `getLocalEmbeddingService` function call:

```javascript
const embeddingService = getLocalEmbeddingService({ 
  modelName: 'sentence-transformers/all-MiniLM-L6-v2', // Model to use
  pythonPath: 'python', // Path to Python executable
  maxBatchSize: 32, // Maximum batch size for embedding generation
  debug: true // Enable debug logging
});
```

## Server Deployment Considerations

When deploying on Windows Server:

1. **Service Account**

   If running as a service, ensure the service account has:
   - Read/write access to the application directory
   - Network access if needed
   - Sufficient permissions to execute Python

2. **Resource Allocation**

   The model requires:
   - ~200-300MB of RAM (more if using GPU)
   - ~80MB of disk space for the model files
   - Minimal CPU usage except during initialization

3. **Multiple Instances**

   If running multiple instances:
   - Each instance will maintain its own Python process
   - Consider setting different model cache directories to avoid conflicts

4. **Log Monitoring**

   Monitor for Python-related errors in:
   - Application logs
   - Windows Event Logs
   - stdout/stderr capture from the Python process

## Need Help?

If you encounter any issues with the local embedding service:

1. Check the application logs for error messages
2. Verify Python and package installation
3. Ensure the virtual environment is properly activated (if using one)
4. Refer to the sentence-transformers documentation for model-specific information

For Windows-specific help, also check:
- Windows Event Logs for Python-related errors
- Firewall and security software logs for blocked processes
- Path and permission issues with the Python executable
