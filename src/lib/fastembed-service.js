// src/lib/fastembed-service.js
const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs').promises;

/**
 * FastEmbed Service
 * Uses a Python child process to generate embeddings using Qdrant's fastembed library
 * Supports both local and remote model options
 */
class FastEmbedService {
  constructor(config = {}) {
    this.initialized = false;
    
    // Model mode: 'local' or 'remote'
    this.modelMode = config.modelMode || process.env.EMBEDDING_MODEL_MODE || 'remote';
    console.log(`FastEmbed Service using ${this.modelMode} model mode`);
    
    // Python configuration
    this.pythonPath = process.env.PSADT_PYTHON_PATH || config.pythonPath || 'python';
    console.log(`Using Python path: ${this.pythonPath}`);
    
    // Model configuration
    if (this.modelMode === 'local') {
      // Local model settings
      this.modelName = config.modelName || process.env.LOCAL_MODEL_NAME || 'Qdrant/bm25';
      this.modelPath = config.modelPath || process.env.LOCAL_MODEL_PATH || null;
      this.useGpu = (process.env.USE_GPU !== 'false') && (config.useGpu !== false);
    } else {
      // Remote model settings (Hugging Face API)
      this.hfApiKey = config.hfApiKey || process.env.HF_API_KEY;
      this.hfModelName = config.hfModelName || process.env.HF_MODEL_NAME || 'Qdrant/bm25';
    }
    
    this.embeddingDimension = 384; // Dimension for the base model
    this.maxBatchSize = config.maxBatchSize || 32;
    
    // Script path for local model
    const dataDir = process.env.PSADT_DATA_DIR || 
                   process.env.LOCALAPPDATA || 
                   process.env.APPDATA || 
                   os.tmpdir();
    
    this.scriptPath = path.join(dataDir, 'psadt-pro-ui', 'generate_fastembed.py');
    
    this.debug = process.env.PSADT_DEBUG === 'true' || config.debug || false;
    this.pythonProcess = null;
    this.requestQueue = [];
    this.isProcessing = false;
  }
  
  /**
   * Initialize the service
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      if (this.modelMode === 'local') {
        // Create Python script for generating embeddings with local model
        await this.createPythonScript();
        
        // Verify Python setup
        await this.verifyPythonSetup();
      } else {
        // Verify Hugging Face API key for remote model
        if (!this.hfApiKey) {
          console.warn('No Hugging Face API key provided for remote embedding model');
        }
      }
      
      this.initialized = true;
      console.log(`FastEmbed Service initialized successfully in ${this.modelMode} mode`);
    } catch (error) {
      console.error('Failed to initialize FastEmbed Service:', error);
      throw error;
    }
  }
  
  /**
   * Create the Python script for generating embeddings
   */
  async createPythonScript() {
    const gpuSupport = this.useGpu ? `
    # Try to use GPU if available
    try:
        providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
        log_message("Attempting to use GPU for inference")
    except Exception as e:
        providers = None
        log_message(f"GPU support not enabled: {e}")` : `
    # Using CPU only
    providers = None
    log_message("Using CPU only for inference")`;
    
    const modelPathCode = this.modelPath ? `
    # Using local model path
    model_path = "${this.modelPath}"
    log_message(f"Using local model path: {model_path}")` : `
    # Using model name from Hugging Face
    model_path = None
    log_message(f"Using model from Hugging Face: ${this.modelName}")`;
    
    const pythonScript = `
import sys
import json
import os
import numpy as np
from typing import List, Dict, Any

# Setup logging to file for debugging on Windows servers
log_dir = os.path.dirname(os.path.abspath(__file__))
log_path = os.path.join(log_dir, 'fastembed_service.log')

def log_message(message):
    """Log message to both stderr and a file"""
    print(message, file=sys.stderr)
    try:
        with open(log_path, 'a', encoding='utf-8') as f:
            f.write(message + '\\n')
    except Exception as e:
        print(f"Could not write to log file: {e}", file=sys.stderr)

# Start with system info for diagnostics
log_message(f"Python version: {sys.version}")
log_message(f"Process ID: {os.getpid()}")
log_message(f"Working directory: {os.getcwd()}")

# Try importing fastembed
try:
    from fastembed import SparseTextEmbedding
    log_message("Successfully imported fastembed")
except ImportError as e:
    log_message(f"Error importing fastembed: {e}")
    log_message("Attempting to install fastembed...")
    
    # Try to install fastembed if not available
    try:
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "fastembed-gpu" if ${this.useGpu} else "fastembed"])
        log_message("Successfully installed fastembed, importing again...")
        from fastembed import SparseTextEmbedding
    except Exception as ie:
        log_message(f"Failed to install fastembed: {ie}")
        sys.exit(1)

${gpuSupport}

${modelPathCode}

# Try loading the model with additional error handling
try:
    log_message(f"Loading model: ${this.modelName}")
    model_kwargs = {}
    if model_path:
        model_kwargs['model_path'] = model_path
    
    model = SparseTextEmbedding(
        model_name="${this.modelName}",
        providers=providers,
        **model_kwargs
    )
    log_message("Model loaded successfully")
    
    # Test the model with a simple embedding
    test_embedding = list(model.embed(["Test embedding"]))
    if test_embedding:
        log_message(f"Test embedding shape: indices={len(test_embedding[0].indices)}, values={len(test_embedding[0].values)}")
except Exception as e:
    log_message(f"Error loading model: {e}")
    log_message(f"Error details: {str(type(e))}")
    # Don't exit, as we'll handle errors per request

def generate_embeddings(texts: List[str]):
    """Generate embeddings for a list of texts"""
    try:
        embeddings = list(model.embed(texts))
        result = []
        
        for embedding in embeddings:
            # Convert indices and values to lists
            result.append({
                'indices': embedding.indices.tolist(),
                'values': embedding.values.tolist()
            })
        
        return result
    except Exception as e:
        log_message(f"Error generating embeddings: {e}")
        raise

# Main loop to process input from stdin
while True:
    try:
        # Read input from stdin
        input_line = sys.stdin.readline()
        if not input_line:
            log_message("End of input stream, exiting")
            break
        
        # Parse the input JSON
        request = json.loads(input_line)
        request_id = request.get('id', 'unknown')
        texts = request.get('texts', [])
        
        log_message(f"Processing request {request_id} with {len(texts)} texts")
        
        if not texts:
            response = {
                'id': request_id,
                'error': 'No texts provided',
                'embeddings': []
            }
        else:
            # Generate embeddings
            embeddings = generate_embeddings(texts)
            response = {
                'id': request_id,
                'embeddings': embeddings
            }
        
        # Send the response
        print(json.dumps(response))
        sys.stdout.flush()
        log_message(f"Response sent for request {request_id}")
        
    except Exception as e:
        # Handle errors
        log_message(f"Error processing request: {e}")
        error_response = {
            'id': request.get('id', 'unknown') if 'request' in locals() else 'unknown',
            'error': str(e),
            'embeddings': []
        }
        print(json.dumps(error_response))
        sys.stdout.flush()
`;

    try {
      // Ensure the directory exists
      const scriptDir = path.dirname(this.scriptPath);
      try {
        await fs.mkdir(scriptDir, { recursive: true });
      } catch (mkdirError) {
        console.warn(`Could not create directory ${scriptDir}: ${mkdirError.message}`);
        // Continue anyway, the write might still succeed
      }
      
      await fs.writeFile(this.scriptPath, pythonScript);
      console.log(`Python script created at ${this.scriptPath}`);
    } catch (error) {
      console.error('Failed to create Python script:', error);
      throw error;
    }
  }
  
  /**
   * Verify Python and required packages are installed
   */
  async verifyPythonSetup() {
    return new Promise((resolve, reject) => {
      // Check for Windows-specific issues
      const isWindows = process.platform === 'win32';
      const pythonCheckScript = `
import sys
import platform

print(f"Python {sys.version}")
print(f"Platform: {platform.platform()}")

try:
    from fastembed import SparseTextEmbedding
    print("fastembed is installed")
except ImportError as e:
    print(f"Error importing fastembed: {e}")
    sys.exit(1)

try:
    import onnxruntime
    print(f"onnxruntime version: {onnxruntime.__version__}")
    print(f"Available providers: {onnxruntime.get_available_providers()}")
except ImportError as e:
    print(f"Error importing onnxruntime: {e}")
    sys.exit(1)

print("OK")
`;
      
      const pythonProcess = spawn(this.pythonPath, ['-c', pythonCheckScript]);
      
      let output = '';
      let errorOutput = '';
      
      pythonProcess.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        if (this.debug) {
          console.log(`Python verification output: ${text.trim()}`);
        }
      });
      
      pythonProcess.stderr.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        if (this.debug) {
          console.log(`Python verification error: ${text.trim()}`);
        }
      });
      
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          const error = new Error(`Python verification failed with code ${code}: ${errorOutput}`);
          console.error(error);
          
          // Provide helpful installation instructions
          console.error(`
Please ensure Python is installed and the fastembed package is available:

For Windows:
1. Install Python from https://www.python.org/downloads/
2. Create a virtual environment: python -m venv .venv
3. Activate it: .venv\\Scripts\\activate
4. Install dependencies: pip install fastembed-gpu
5. For GPU support: pip install onnxruntime-gpu

Check your Python path is correctly set to: ${this.pythonPath}
`);
          
          reject(error);
        } else {
          console.log('Python and required packages are properly installed');
          
          // Log useful information about the setup
          const cudaAvailable = output.includes('CUDAExecutionProvider');
          const pythonVersion = output.match(/Python (\d+\.\d+\.\d+)/)?.[1] || 'unknown';
          
          console.log(`Python ${pythonVersion}, CUDA: ${cudaAvailable ? 'Available ✓' : 'Not available'}`);
          
          resolve();
        }
      });
      
      // Handle process errors (like executable not found)
      pythonProcess.on('error', (err) => {
        console.error(`Failed to start Python process: ${err.message}`);
        console.error(`Python path: ${this.pythonPath}`);
        
        if (isWindows && err.code === 'ENOENT') {
          console.error(`
Python executable not found at ${this.pythonPath}. 
On Windows, make sure:
1. Python is installed and added to PATH, or
2. You're using a virtual environment (.venv) and it's properly activated
3. The pythonPath config is correctly set to the absolute path of python.exe
`);
        }
        
        reject(err);
      });
    });
  }
  
  /**
   * Generate embeddings based on model mode (local or remote)
   * @param {string|string[]} texts - Text or array of texts to embed
   * @returns {Promise<number[]|number[][]>} - The embeddings
   */
  async generateEmbeddings(texts) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    if (this.modelMode === 'local') {
      return this.generateLocalEmbeddings(texts);
    } else {
      return this.generateRemoteEmbeddings(texts);
    }
  }
  
  /**
   * Generate embeddings using local model
   * @param {string|string[]} texts - Text or array of texts to embed
   * @returns {Promise<number[]|number[][]>} - The embeddings
   */
  async generateLocalEmbeddings(texts) {
    return this.generateDenseEmbeddings(texts);
  }
  
  /**
   * Generate embeddings using remote model (Hugging Face API)
   * @param {string|string[]} texts - Text or array of texts to embed
   * @returns {Promise<number[]|number[][]>} - The embeddings
   */
  async generateRemoteEmbeddings(texts) {
    // Ensure texts is an array
    const textArray = Array.isArray(texts) ? texts : [texts];
    
    try {
      const url = `https://api-inference.huggingface.co/models/${this.hfModelName}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.hfApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: textArray,
          options: {
            wait_for_model: true,
          },
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Hugging Face API error: ${response.status} ${errorText}`);
      }
      
      const embeddings = await response.json();
      
      // Return single embedding or array of embeddings
      return Array.isArray(texts) ? embeddings : embeddings[0];
    } catch (error) {
      console.error('Failed to generate remote embeddings:', error);
      
      // Fall back to deterministic random embeddings
      console.warn('Falling back to deterministic random embeddings');
      
      const deterministicEmbeddings = textArray.map(text => {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
          const char = text.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convert to 32bit integer
        }
        
        // Seed the random number generator with the hash
        const seededRandom = function() {
          const x = Math.sin(hash++) * 10000;
          return x - Math.floor(x);
        };
        
        return Array.from({ length: this.embeddingDimension }, () => seededRandom() * 2 - 1);
      });
      
      return Array.isArray(texts) ? deterministicEmbeddings : deterministicEmbeddings[0];
    }
  }
  
  /**
   * Start the Python process for generating embeddings
   */
  async startPythonProcess() {
    if (this.pythonProcess) {
      return; // Process already running
    }
    
    this.pythonProcess = spawn(this.pythonPath, [this.scriptPath]);
    
    // Handle stdout (responses)
    this.pythonProcess.stdout.on('data', (data) => {
      const responseStr = data.toString().trim();
      if (responseStr) {
        try {
          const response = JSON.parse(responseStr);
          const pendingRequest = this.requestQueue.find(req => req.id === response.id);
          
          if (pendingRequest) {
            if (response.error) {
              pendingRequest.reject(new Error(response.error));
            } else {
              pendingRequest.resolve(response.embeddings);
            }
            
            // Remove from queue
            this.requestQueue = this.requestQueue.filter(req => req.id !== response.id);
          }
        } catch (error) {
          console.error('Error parsing Python response:', error, responseStr);
        }
      }
    });
    
    // Handle stderr (logs)
    this.pythonProcess.stderr.on('data', (data) => {
      if (this.debug) {
        console.log('Python process log:', data.toString());
      }
    });
    
    // Handle process exit
    this.pythonProcess.on('close', (code) => {
      console.log(`Python process exited with code ${code}`);
      this.pythonProcess = null;
      
      // Reject all pending requests
      for (const request of this.requestQueue) {
        request.reject(new Error(`Python process exited with code ${code}`));
      }
      
      this.requestQueue = [];
      this.isProcessing = false;
    });
    
    // Wait for the model to load
    return new Promise((resolve, reject) => {
      let modelLoadedTimeout = setTimeout(() => {
        reject(new Error('Timeout waiting for model to load'));
      }, 60000); // 60 second timeout
      
      const checkModelLoaded = (data) => {
        const output = data.toString();
        if (output.includes('Model loaded successfully')) {
          clearTimeout(modelLoadedTimeout);
          this.pythonProcess.stderr.removeListener('data', checkModelLoaded);
          resolve();
        }
      };
      
      this.pythonProcess.stderr.on('data', checkModelLoaded);
    });
  }
  
  /**
   * Generate sparse embeddings for text
   * @param {string|string[]} texts - Text or array of texts to embed
   * @returns {Promise<Array<{indices: number[], values: number[]}>>} - The sparse embeddings
   */
  async generateSparseEmbeddings(texts) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    // Ensure texts is an array
    const textArray = Array.isArray(texts) ? texts : [texts];
    
    // Start the Python process if not already running
    if (!this.pythonProcess) {
      await this.startPythonProcess();
    }
    
    // Process in batches to avoid overloading the Python process
    const batches = [];
    for (let i = 0; i < textArray.length; i += this.maxBatchSize) {
      batches.push(textArray.slice(i, i + this.maxBatchSize));
    }
    
    // Process all batches
    const allResults = [];
    for (const batch of batches) {
      const batchResults = await this.processBatch(batch);
      allResults.push(...batchResults);
    }
    
    // Return single embedding or array of embeddings
    return Array.isArray(texts) ? allResults : allResults[0];
  }
  
  /**
   * Process a batch of texts
   * @param {string[]} batch - Batch of texts to process
   * @returns {Promise<Array<{indices: number[], values: number[]}>>} - The sparse embeddings
   */
  async processBatch(batch) {
    return new Promise((resolve, reject) => {
      // Create a unique ID for this request
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Add to queue
      this.requestQueue.push({
        id: requestId,
        resolve,
        reject
      });
      
      // Send the request to the Python process
      const request = {
        id: requestId,
        texts: batch
      };
      
      this.pythonProcess.stdin.write(JSON.stringify(request) + '\n');
    });
  }
  
  /**
   * Convert sparse embeddings to dense embeddings (for compatibility)
   * @param {Object} sparseEmbedding - The sparse embedding with indices and values
   * @param {number} dimension - The dimension of the dense embedding
   * @returns {number[]} - The dense embedding
   */
  sparseToDense(sparseEmbedding, dimension = this.embeddingDimension) {
    // Create a dense vector filled with zeros
    const dense = new Array(dimension).fill(0);
    
    // Put the sparse values at the corresponding indices
    for (let i = 0; i < sparseEmbedding.indices.length; i++) {
      const index = sparseEmbedding.indices[i] % dimension; // Use modulo to ensure index is in range
      dense[index] = sparseEmbedding.values[i];
    }
    
    return dense;
  }
  
  /**
   * Generate dense embeddings compatible with the original embeddings
   * @param {string|string[]} texts - Text or array of texts to embed
   * @returns {Promise<number[]|number[][]>} - The dense embeddings
   */
  async generateDenseEmbeddings(texts) {
    const sparseEmbeddings = await this.generateSparseEmbeddings(texts);
    
    if (Array.isArray(texts)) {
      return sparseEmbeddings.map(sparse => this.sparseToDense(sparse));
    } else {
      return this.sparseToDense(sparseEmbeddings);
    }
  }
  
  /**
   * Shut down the embedding service
   */
  async shutdown() {
    if (this.pythonProcess) {
      this.pythonProcess.kill();
      this.pythonProcess = null;
    }
    
    this.initialized = false;
    this.requestQueue = [];
    this.isProcessing = false;
    
    console.log('FastEmbed Service shut down');
  }
}

// Export a singleton instance
let instance = null;
export function getFastEmbedService(config) {
  if (!instance) {
    instance = new FastEmbedService(config);
  }
  return instance;
}

// Export the class for testing
export default FastEmbedService;
