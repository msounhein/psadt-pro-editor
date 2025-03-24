// src/lib/local-embedding-service.js
const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs').promises;

/**
 * Local Embedding Service
 * Uses a Python child process to generate embeddings locally using sentence-transformers
 */
class LocalEmbeddingService {
  constructor(config = {}) {
    this.initialized = false;
    
    // Use environment variable PSADT_PYTHON_PATH if available
    this.pythonPath = process.env.PSADT_PYTHON_PATH || config.pythonPath || 'python';
    
    // Log the Python path for debugging
    console.log(`Using Python path: ${this.pythonPath}`);
    
    this.modelName = config.modelName || 'sentence-transformers/all-MiniLM-L6-v2';
    this.embeddingDimension = 384; // Dimension for the MiniLM-L6-v2 model
    this.maxBatchSize = config.maxBatchSize || 32;
    
    // Use a suitable path for Windows server environments
    // First check for app-specific env var, then LOCALAPPDATA (Windows), then APPDATA, then temp
    const dataDir = process.env.PSADT_DATA_DIR || 
                   process.env.LOCALAPPDATA || 
                   process.env.APPDATA || 
                   os.tmpdir();
    
    this.scriptPath = path.join(dataDir, 'psadt-pro-ui', 'generate_embeddings.py');
    
    this.debug = process.env.PSADT_DEBUG === 'true' || config.debug || false;
    this.pythonProcess = null;
    this.requestQueue = [];
    this.isProcessing = false;
  }

  /**
   * Initialize the embedding service
   * Creates a Python script file and verifies Python + dependencies are installed
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      // Create Python script for generating embeddings
      await this.createPythonScript();
      
      // Verify Python installation
      await this.verifyPythonSetup();
      
      this.initialized = true;
      console.log('Local Embedding Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Local Embedding Service:', error);
      throw error;
    }
  }

  /**
   * Create the Python script for generating embeddings
   */
  async createPythonScript() {
    const pythonScript = `
import sys
import json
import torch
import os
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Any

# Setup logging to file for debugging on Windows servers
log_dir = os.path.dirname(os.path.abspath(__file__))
log_path = os.path.join(log_dir, 'embedding_service.log')

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
log_message(f"PyTorch version: {torch.__version__}")
log_message(f"Process ID: {os.getpid()}")
log_message(f"Working directory: {os.getcwd()}")

# Try loading the model with additional error handling
try:
    log_message(f"Loading model: ${this.modelName}")
    model = SentenceTransformer('${this.modelName}')
    log_message("Model loaded successfully")
    
    # Use GPU if available
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    log_message(f"Using device: {device}")
    model = model.to(device)
except Exception as e:
    log_message(f"Error loading model: {e}")
    log_message(f"Error details: {str(type(e))}") 
    # Don't exit, as we'll handle errors per request

def generate_embeddings(texts: List[str]) -> List[List[float]]:
    """Generate embeddings for a list of texts"""
    try:
        with torch.no_grad():
            embeddings = model.encode(texts, convert_to_tensor=True)
            return embeddings.cpu().numpy().tolist()
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
    import sentence_transformers
    print(f"sentence-transformers version: {sentence_transformers.__version__}")
except ImportError as e:
    print(f"Error importing sentence_transformers: {e}")
    sys.exit(1)

try:
    import torch
    print(f"PyTorch version: {torch.__version__}")
    print(f"CUDA available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"CUDA version: {torch.version.cuda}")
        print(f"GPU: {torch.cuda.get_device_name(0)}")
except ImportError as e:
    print(f"Error importing torch: {e}")
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
Please ensure Python is installed and the sentence-transformers package is available:

For Windows:
1. Install Python from https://www.python.org/downloads/
2. Create a virtual environment: python -m venv .venv
3. Activate it: .venv\\Scripts\\activate
4. Install dependencies: pip install -r python-requirements.txt
5. For GPU support: pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
   (Choose the CUDA version that matches your GPU drivers)

Check your Python path is correctly set to: ${this.pythonPath}
`);
          
          reject(error);
        } else {
          console.log('Python and required packages are properly installed');
          
          // Log useful information about the setup
          const cudaAvailable = output.includes('CUDA available: True');
          const pythonVersion = output.match(/Python (\d+\.\d+\.\d+)/)?.[1] || 'unknown';
          const torchVersion = output.match(/PyTorch version: ([\d\.]+)/)?.[1] || 'unknown';
          
          console.log(`Python ${pythonVersion}, PyTorch ${torchVersion}, CUDA: ${cudaAvailable ? 'Available ✓' : 'Not available'}`);
          
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
   * Generate embeddings for text
   * @param {string|string[]} texts - Text or array of texts to embed
   * @returns {Promise<number[]|number[][]>} - The embeddings
   */
  async generateEmbeddings(texts) {
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
   * @returns {Promise<number[][]>} - The embeddings
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
    
    console.log('Local Embedding Service shut down');
  }
}

// Export a singleton instance
let instance = null;
export function getLocalEmbeddingService(config) {
  if (!instance) {
    instance = new LocalEmbeddingService(config);
  }
  return instance;
}

// Export the class for testing
export default LocalEmbeddingService;
