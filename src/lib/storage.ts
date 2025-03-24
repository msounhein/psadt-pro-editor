import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Get the storage path from environment variables or use a default
const storagePath = process.env.FILE_STORAGE_PATH || './storage';

// Ensure the storage directory exists
if (!fs.existsSync(storagePath)) {
  fs.mkdirSync(storagePath, { recursive: true });
}

interface StorageOptions {
  userId: string;
  prefix?: string;
}

/**
 * Generates a unique filename for storing files
 */
export function generateFilename(originalFilename: string, options: StorageOptions): string {
  const { userId, prefix = '' } = options;
  const ext = path.extname(originalFilename);
  const uuid = uuidv4();
  return `${prefix ? prefix + '_' : ''}${userId}_${uuid}${ext}`;
}

/**
 * Stores a file in the storage directory
 */
export async function storeFile(
  fileBuffer: Buffer,
  originalFilename: string,
  options: StorageOptions
): Promise<string> {
  const filename = generateFilename(originalFilename, options);
  const filePath = path.join(storagePath, filename);
  
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, fileBuffer, (err) => {
      if (err) return reject(err);
      resolve(filename);
    });
  });
}

/**
 * Retrieves a file from the storage directory
 */
export function getFilePath(filename: string): string {
  return path.join(storagePath, filename);
}

/**
 * Checks if a file exists in storage
 */
export function fileExists(filename: string): boolean {
  return fs.existsSync(getFilePath(filename));
}

/**
 * Deletes a file from storage
 */
export async function deleteFile(filename: string): Promise<boolean> {
  const filePath = getFilePath(filename);
  
  if (!fs.existsSync(filePath)) {
    return false;
  }
  
  return new Promise((resolve, reject) => {
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(`Error deleting file ${filename}:`, err);
        return resolve(false);
      }
      resolve(true);
    });
  });
} 