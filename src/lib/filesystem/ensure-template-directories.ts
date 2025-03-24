import fs from 'fs/promises';
import path from 'path';

/**
 * Ensures all required template directories exist
 * Creates separate directories for Default and Custom templates
 * @param userId User ID for whom to create directories
 */
export async function ensureTemplateDirectories(userId: string) {
  const storageDir = process.env.STORAGE_DIR || 'storage';
  
  // Base template directory
  const templateBaseDir = path.join(storageDir, 'templates');
  
  // User's template directory
  const userTemplateDir = path.join(templateBaseDir, userId);
  
  // Type-specific directories
  const defaultTemplateDir = path.join(userTemplateDir, 'Default');
  const customTemplateDir = path.join(userTemplateDir, 'Custom');
  
  // Create all directories
  await ensureDirectory(templateBaseDir);
  await ensureDirectory(userTemplateDir);
  await ensureDirectory(defaultTemplateDir);
  await ensureDirectory(customTemplateDir);
  
  return {
    baseDir: templateBaseDir,
    userDir: userTemplateDir,
    defaultDir: defaultTemplateDir,
    customDir: customTemplateDir
  };
}

/**
 * Creates a directory if it doesn't already exist
 * @param dirPath Path to the directory to create
 */
export async function ensureDirectory(dirPath: string) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    return true;
  } catch (error) {
    console.error(`Error creating directory ${dirPath}:`, error);
    return false;
  }
}

/**
 * Gets the appropriate path for a template based on its type
 * @param userId User ID
 * @param templateName Template name
 * @param type Template type ('Default' or 'Custom')
 */
export function getTemplatePath(userId: string, templateName: string, type: string = 'Custom') {
  const storageDir = process.env.STORAGE_DIR || 'storage';
  return path.join(
    storageDir,
    'templates',
    userId,
    type === 'Default' ? 'Default' : 'Custom',
    templateName
  );
}