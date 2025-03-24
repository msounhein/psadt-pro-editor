import * as fs from 'fs-extra';
import * as path from 'path';
import { createFsFromVolume, Volume } from 'memfs';
import { EventEmitter } from 'events';
import { FSWatcher } from 'fs';
import './server-only'; // Mark this module as server-only

/**
 * FileChangeType enum represents the type of file change
 */
export enum FileChangeType {
  CREATED = 1,
  CHANGED = 2,
  DELETED = 3
}

/**
 * FileChange interface represents a change to a file in the filesystem
 */
export interface FileChange {
  type: FileChangeType;
  path: string;
}

/**
 * FileStat interface represents file metadata
 */
export interface FileStat {
  type: 'file' | 'directory' | 'symlink';
  name: string;
  path: string;
  size: number;
  createdAt: Date;
  modifiedAt: Date;
  isReadonly?: boolean;
}

/**
 * FileSystemProvider interface defines the contract for filesystem operations
 */
export interface FileSystemProvider {
  watch(path: string, recursive: boolean): Promise<void>;
  readDirectory(path: string): Promise<FileStat[]>;
  createDirectory(path: string): Promise<void>;
  readFile(path: string): Promise<Uint8Array>;
  writeFile(path: string, content: Uint8Array): Promise<void>;
  delete(path: string, options?: { recursive?: boolean }): Promise<void>;
  rename(source: string, target: string): Promise<void>;
  copy(source: string, target: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  stat(path: string): Promise<FileStat>;
}

/**
 * Class representing a filesystem service with both disk and in-memory operations
 */
export class FileSystemService {
  private readonly onDidChangeFileEmitter = new EventEmitter();
  private readonly memfs = createFsFromVolume(new Volume());
  private readonly templateBasePath: string;

  /**
   * Creates a new FileSystemService instance
   * @param templateBasePath The base path for templates on disk
   */
  constructor(templateBasePath: string = 'storage') {
    this.templateBasePath = templateBasePath;
    
    // Create storage directory if it doesn't exist
    const templatesPath = path.join(process.cwd(), templateBasePath);
    fs.ensureDirSync(templatesPath);
  }

  /**
   * Get the full path to a template
   * @param templateId The template ID or full storagePath from database
   * @returns The full path to the template
   */
  private getTemplatePath(templateId: string): string {
    console.log(`Getting template path for: ${templateId}`);
    
    // Check if this is a full storage path (contains user ID, etc.)
    if (templateId.includes('/')) {
      // Specific case for template ID matching pattern from database
      // Format: "0db3920e-8e02-4bbb-8edd-58e81cbabeb5/Default/PSAppDeployToolkit_Template_v4_v4.0.6"
      const parts = templateId.split('/');
      
      // Check if this looks like a UUID/GUID followed by subdirectories
      if (parts.length >= 2 && parts[0].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        // This is the format we expect for database-stored paths
        // First add "templates" between storage and the UUID/path
        const fullPath = path.join(process.cwd(), this.templateBasePath, 'templates', templateId);
        console.log(`Using full path with UUID: ${fullPath}`);
        return fullPath;
      }
      
      // Fall back to regular path joining for other cases
      const fullPath = path.join(process.cwd(), this.templateBasePath, templateId);
      console.log(`Using full storage path: ${fullPath}`);
      return fullPath;
    }
    
    // Simple template ID case - original behavior
    // Check if it's a UUID, in which case we need to look in templates dir
    if (templateId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const simplePath = path.join(process.cwd(), this.templateBasePath, 'templates', templateId);
      console.log(`Using simple UUID template ID path: ${simplePath}`);
      return simplePath;
    }
    
    // Otherwise, just use as-is
    const simplePath = path.join(process.cwd(), this.templateBasePath, templateId);
    console.log(`Using simple template ID path: ${simplePath}`);
    return simplePath;
  }

  /**
   * Watch for file changes in a directory
   * @param templateId The template ID
   * @param relativePath The path within the template to watch
   * @param recursive Whether to watch subdirectories
   * @returns A file system watcher that can be used to stop watching
   */
  async watchFiles(templateId: string, relativePath: string, recursive: boolean = true): Promise<FSWatcher> {
    const fullPath = path.join(this.getTemplatePath(templateId), relativePath);
    
    try {
      // Ensure the directory exists
      await fs.ensureDir(fullPath);
      
      // Set up watcher
      const watcher = fs.watch(
        fullPath, 
        { recursive },
        (event: string, filename: string | null) => {
          if (!filename) return;
          
          const filePath = path.join(relativePath, filename);
          
          let type: FileChangeType;
          if (event === 'rename') {
            // Need to check if the file exists to determine if it was created or deleted
            const fullFilePath = path.join(fullPath, filename);
            type = fs.existsSync(fullFilePath) 
              ? FileChangeType.CREATED 
              : FileChangeType.DELETED;
          } else {
            // 'change' event
            type = FileChangeType.CHANGED;
          }
          
          this.onDidChangeFileEmitter.emit('fileChange', {
            type,
            path: filePath
          });
        }
      );
      
      return watcher;
    } catch (error) {
      console.error(`Error watching files in ${fullPath}:`, error);
      throw error;
    }
  }

  /**
   * Read the contents of a directory
   * @param templateId The template ID
   * @param relativePath The path within the template
   * @returns Array of file and directory stats
   */
  async readDirectory(templateId: string, relativePath: string = ''): Promise<FileStat[]> {
    const fullPath = path.join(this.getTemplatePath(templateId), relativePath);
    
    try {
      console.log(`Reading directory: ${fullPath}`);
      await fs.ensureDir(fullPath);
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      console.log(`Found ${entries.length} entries in ${fullPath}`);
      
      const stats: FileStat[] = [];
      for (const entry of entries) {
        const entryPath = path.join(relativePath, entry.name);
        const fullEntryPath = path.join(fullPath, entry.name);
        const fileStat = await fs.stat(fullEntryPath);
        
        let type: 'file' | 'directory' | 'symlink';
        if (entry.isFile()) type = 'file';
        else if (entry.isDirectory()) type = 'directory';
        else if (entry.isSymbolicLink()) type = 'symlink';
        else continue; // Skip if not a file, directory, or symlink
        
        stats.push({
          type,
          name: entry.name,
          path: entryPath,
          size: fileStat.size,
          createdAt: new Date(fileStat.birthtime),
          modifiedAt: new Date(fileStat.mtime),
          isReadonly: false
        });
      }
      
      console.log(`Returning ${stats.length} file stats for ${fullPath}`);
      return stats;
    } catch (error) {
      console.error(`Error reading directory ${fullPath}:`, error);
      throw error;
    }
  }

  /**
   * Create a directory in a template
   * @param templateId The template ID
   * @param relativePath The path within the template
   */
  async createDirectory(templateId: string, relativePath: string): Promise<void> {
    const fullPath = path.join(this.getTemplatePath(templateId), relativePath);
    
    try {
      await fs.ensureDir(fullPath);
    } catch (error) {
      console.error(`Error creating directory ${fullPath}:`, error);
      throw error;
    }
  }

  /**
   * Read a file from a template
   * @param templateId The template ID
   * @param relativePath The path within the template
   * @returns The file contents as a Uint8Array
   */
  async readFile(templateId: string, relativePath: string): Promise<Uint8Array> {
    const fullPath = path.join(this.getTemplatePath(templateId), relativePath);
    
    try {
      const buffer = await fs.readFile(fullPath);
      return new Uint8Array(buffer);
    } catch (error) {
      console.error(`Error reading file ${fullPath}:`, error);
      throw error;
    }
  }

  /**
   * Read a file as text from a template
   * @param templateId The template ID
   * @param relativePath The path within the template
   * @returns The file contents as a string
   */
  async readTextFile(templateId: string, relativePath: string): Promise<string> {
    const fullPath = path.join(this.getTemplatePath(templateId), relativePath);
    
    try {
      return await fs.readFile(fullPath, 'utf8');
    } catch (error) {
      console.error(`Error reading text file ${fullPath}:`, error);
      throw error;
    }
  }

  /**
   * Write a file to a template
   * @param templateId The template ID
   * @param relativePath The path within the template
   * @param content The file contents as a Uint8Array
   */
  async writeFile(templateId: string, relativePath: string, content: Uint8Array): Promise<void> {
    const fullPath = path.join(this.getTemplatePath(templateId), relativePath);
    
    try {
      // Ensure the directory exists
      await fs.ensureDir(path.dirname(fullPath));
      await fs.writeFile(fullPath, Buffer.from(content));
    } catch (error) {
      console.error(`Error writing file ${fullPath}:`, error);
      throw error;
    }
  }

  /**
   * Write a text file to a template
   * @param templateId The template ID
   * @param relativePath The path within the template
   * @param content The file contents as a string
   */
  async writeTextFile(templateId: string, relativePath: string, content: string): Promise<void> {
    const fullPath = path.join(this.getTemplatePath(templateId), relativePath);
    
    try {
      // Ensure the directory exists
      await fs.ensureDir(path.dirname(fullPath));
      await fs.writeFile(fullPath, content, 'utf8');
    } catch (error) {
      console.error(`Error writing text file ${fullPath}:`, error);
      throw error;
    }
  }

  /**
   * Delete a file or directory in a template
   * @param templateId The template ID
   * @param relativePath The path within the template
   * @param options Delete options
   */
  async delete(templateId: string, relativePath: string, options: { recursive?: boolean } = {}): Promise<void> {
    const fullPath = path.join(this.getTemplatePath(templateId), relativePath);
    
    try {
      const stat = await fs.stat(fullPath);
      
      if (stat.isDirectory()) {
        if (options.recursive) {
          await fs.remove(fullPath);
        } else {
          await fs.rmdir(fullPath);
        }
      } else {
        await fs.unlink(fullPath);
      }
    } catch (error) {
      console.error(`Error deleting ${fullPath}:`, error);
      throw error;
    }
  }

  /**
   * Rename a file or directory in a template
   * @param templateId The template ID
   * @param sourcePath The source path within the template
   * @param targetPath The target path within the template
   */
  async rename(templateId: string, sourcePath: string, targetPath: string): Promise<void> {
    const sourceFullPath = path.join(this.getTemplatePath(templateId), sourcePath);
    const targetFullPath = path.join(this.getTemplatePath(templateId), targetPath);
    
    try {
      // Ensure the target directory exists
      await fs.ensureDir(path.dirname(targetFullPath));
      await fs.rename(sourceFullPath, targetFullPath);
    } catch (error) {
      console.error(`Error renaming ${sourceFullPath} to ${targetFullPath}:`, error);
      throw error;
    }
  }

  /**
   * Copy a file or directory in a template
   * @param templateId The template ID
   * @param sourcePath The source path within the template
   * @param targetPath The target path within the template
   */
  async copy(templateId: string, sourcePath: string, targetPath: string): Promise<void> {
    const sourceFullPath = path.join(this.getTemplatePath(templateId), sourcePath);
    const targetFullPath = path.join(this.getTemplatePath(templateId), targetPath);
    
    try {
      // Ensure the target directory exists
      await fs.ensureDir(path.dirname(targetFullPath));
      
      // Check if source is a directory or file
      const stat = await fs.stat(sourceFullPath);
      
      if (stat.isDirectory()) {
        await fs.copy(sourceFullPath, targetFullPath);
      } else {
        await fs.copyFile(sourceFullPath, targetFullPath);
      }
    } catch (error) {
      console.error(`Error copying ${sourceFullPath} to ${targetFullPath}:`, error);
      throw error;
    }
  }

  /**
   * Check if a file or directory exists in a template
   * @param templateId The template ID
   * @param relativePath The path within the template
   * @returns Whether the file or directory exists
   */
  async exists(templateId: string, relativePath: string): Promise<boolean> {
    const fullPath = path.join(this.getTemplatePath(templateId), relativePath);
    
    try {
      return await fs.pathExists(fullPath);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get file stats for a file or directory in a template
   * @param templateId The template ID
   * @param relativePath The path within the template
   * @returns File stats
   */
  async stat(templateId: string, relativePath: string): Promise<FileStat> {
    const fullPath = path.join(this.getTemplatePath(templateId), relativePath);
    
    try {
      const stats = await fs.stat(fullPath);
      
      let type: 'file' | 'directory' | 'symlink';
      if (stats.isFile()) type = 'file';
      else if (stats.isDirectory()) type = 'directory';
      else if (stats.isSymbolicLink()) type = 'symlink';
      else throw new Error(`Unknown file type for ${fullPath}`);
      
      return {
        type,
        name: path.basename(relativePath),
        path: relativePath,
        size: stats.size,
        createdAt: new Date(stats.birthtime),
        modifiedAt: new Date(stats.mtime),
        isReadonly: false
      };
    } catch (error) {
      console.error(`Error getting stats for ${fullPath}:`, error);
      throw error;
    }
  }

  /**
   * Search for files in a template
   * @param templateId The template ID
   * @param query The search query
   * @returns Array of matching file paths
   */
  async searchFiles(templateId: string, query: string): Promise<string[]> {
    const results: string[] = [];
    const templatePath = this.getTemplatePath(templateId);
    
    const searchInDirectory = async (dirPath: string, relativeDirPath: string = '') => {
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const entryRelativePath = path.join(relativeDirPath, entry.name);
          const entryPath = path.join(dirPath, entry.name);
          
          if (entry.isDirectory()) {
            // Recursively search subdirectories
            await searchInDirectory(entryPath, entryRelativePath);
          } else if (entry.isFile()) {
            // Check filename for match
            if (entry.name.toLowerCase().includes(query.toLowerCase())) {
              results.push(entryRelativePath);
              continue;
            }
            
            // Check file content for match (for text files)
            try {
              const stats = await fs.stat(entryPath);
              
              // Skip large files
              if (stats.size > 1024 * 1024) continue;
              
              // Check for binary files by extension
              const ext = path.extname(entry.name).toLowerCase();
              const binaryExtensions = ['.exe', '.dll', '.obj', '.bin', '.dat', '.jpg', '.png', '.gif'];
              if (binaryExtensions.includes(ext)) continue;
              
              // Read and check content
              const content = await fs.readFile(entryPath, 'utf8');
              if (content.toLowerCase().includes(query.toLowerCase())) {
                results.push(entryRelativePath);
              }
            } catch (error) {
              // Skip files with read errors
              console.error(`Error reading file ${entryPath}:`, error);
            }
          }
        }
      } catch (error) {
        console.error(`Error searching in directory ${dirPath}:`, error);
      }
    };
    
    await searchInDirectory(templatePath);
    return results;
  }
}

// Export singleton instance for server-side
const fileSystemService = new FileSystemService();
export default fileSystemService;