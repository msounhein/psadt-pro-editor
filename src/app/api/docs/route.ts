import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api/docs/route.ts');

// Define the path to the documentation files
const DOCS_PATH = process.env.DOCS_PATH || path.join(process.cwd(), 'public/docs');

// Ensure the docs directory exists
if (!fs.existsSync(DOCS_PATH)) {
  fs.mkdirSync(DOCS_PATH, { recursive: true });
}

/**
 * GET handler for listing documentation files or retrieving a specific file
 */
export async function GET(request: NextRequest) {
  const getHandler = logger.forFunction('GET');
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const filePath = searchParams.get('path') || '';
    
    // If no specific file is requested, list all available files
    if (!filePath) {
      getHandler.info('Listing all documentation files');
      
      // Function to recursively get all files
      const getAllFiles = (dirPath: string, arrayOfFiles: string[] = []): string[] => {
        const files = fs.readdirSync(dirPath);
        
        files.forEach(file => {
          const fullPath = path.join(dirPath, file);
          if (fs.statSync(fullPath).isDirectory()) {
            arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
          } else {
            // Skip metadata.json from the listing
            if (file !== 'metadata.json') {
              // Get path relative to DOCS_PATH
              const relativePath = path.relative(DOCS_PATH, fullPath);
              arrayOfFiles.push(relativePath);
            }
          }
        });
        
        return arrayOfFiles;
      };
      
      // Get all documentation files
      const allFiles = getAllFiles(DOCS_PATH);
      
      // Get metadata if it exists
      let metadata = null;
      const metadataPath = path.join(DOCS_PATH, 'metadata.json');
      if (fs.existsSync(metadataPath)) {
        try {
          const metadataContent = fs.readFileSync(metadataPath, 'utf8');
          metadata = JSON.parse(metadataContent);
        } catch (error) {
          getHandler.warn('Error reading metadata file', { error });
        }
      }
      
      // Group files by directories for easier navigation
      const fileTree: Record<string, string[]> = {};
      
      allFiles.forEach(file => {
        const dir = path.dirname(file);
        if (dir === '.') {
          // Root files
          if (!fileTree['']) {
            fileTree[''] = [];
          }
          fileTree[''].push(file);
        } else {
          if (!fileTree[dir]) {
            fileTree[dir] = [];
          }
          fileTree[dir].push(file);
        }
      });
      
      return NextResponse.json({
        success: true,
        metadata,
        fileCount: allFiles.length,
        files: allFiles,
        fileTree
      });
    }
    
    // If a specific file is requested, serve its content
    getHandler.info(`Fetching documentation file: ${filePath}`);
    
    const fullPath = path.join(DOCS_PATH, filePath);
    
    // Security check to ensure the path is within the DOCS_PATH
    if (!fullPath.startsWith(DOCS_PATH)) {
      getHandler.warn(`Security check failed for path: ${filePath}`);
      return NextResponse.json({
        success: false,
        error: 'Invalid file path'
      }, { status: 400 });
    }
    
    // Check if the file exists
    if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
      getHandler.warn(`File not found: ${filePath}`);
      return NextResponse.json({
        success: false,
        error: 'File not found'
      }, { status: 404 });
    }
    
    // Read the file content
    const fileContent = fs.readFileSync(fullPath, 'utf8');
    
    // Determine the file type based on extension
    const ext = path.extname(filePath).toLowerCase();
    
    return NextResponse.json({
      success: true,
      path: filePath,
      content: fileContent,
      fileType: ext.replace('.', '') // Remove the dot
    });
  } catch (error) {
    getHandler.error('Error processing request', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
} 