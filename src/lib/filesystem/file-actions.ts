'use server';

import fileSystemService from './filesystem-service';

/**
 * Server action to create a PowerShell script in a template directory
 * @param templateId The ID of the template
 * @param filename Optional filename (defaults to script.ps1)
 * @returns true if successful, false otherwise
 */
export async function createPowerShellScriptAction(templateId: string, filename: string = 'script.ps1'): Promise<boolean> {
  try {
    console.log(`[Server Action] Creating PowerShell script ${filename} in template ${templateId}...`);
    
    // Create a default PowerShell script
    const defaultScript = `# PowerShell Script
    
# Add your code here
`;
    await fileSystemService.writeTextFile(templateId, filename, defaultScript);
    
    // Verify the file was created
    const exists = await fileSystemService.exists(templateId, filename);
    return exists;
  } catch (error) {
    console.error(`[Server Action] Error creating PowerShell script in template ${templateId}:`, error);
    return false;
  }
}

/**
 * Server action to list files in a template directory
 * @param templateId The ID of the template
 * @param relativePath Optional path within the template
 * @returns Array of file paths or null if an error occurs
 */
export async function listFilesAction(templateId: string, relativePath: string = ''): Promise<string[] | null> {
  try {
    console.log(`[Server Action] Listing files in template path: ${templateId}, relative path: ${relativePath}`);
    
    // Check if template path exists
    const exists = await fileSystemService.exists(templateId, '');
    if (!exists) {
      console.error(`[Server Action] Template directory does not exist: ${templateId}`);
      // Create the template directory if it doesn't exist
      try {
        await fileSystemService.createDirectory(templateId, '');
        console.log(`[Server Action] Created template directory: ${templateId}`);
      } catch (dirError) {
        console.error(`[Server Action] Failed to create template directory: ${templateId}`, dirError);
        return null;
      }
    }
    
    // Get list of files in the directory
    const files = await fileSystemService.readDirectory(templateId, relativePath);
    
    console.log(`[Server Action] Found ${files.length} files in ${templateId}/${relativePath}`);
    // Return just the file paths for simplicity
    return files.map(file => file.path);
  } catch (error) {
    console.error(`[Server Action] Error listing files in template ${templateId}:`, error);
    // Return empty array instead of null to avoid breaking UI
    return [];
  }
}

/**
 * Server action to read a file from a template
 * @param templateId The ID of the template
 * @param relativePath The path within the template
 * @returns The file contents as a string, or null if an error occurs
 */
export async function readFileAction(templateId: string, relativePath: string): Promise<string | null> {
  try {
    console.log(`[Server Action] Reading file ${relativePath} in template ${templateId}`);
    
    const content = await fileSystemService.readTextFile(templateId, relativePath);
    return content;
  } catch (error) {
    console.error(`[Server Action] Error reading file ${relativePath} in template ${templateId}:`, error);
    return null;
  }
}

/**
 * Server action to write a file to a template
 * @param templateId The ID of the template
 * @param relativePath The path within the template
 * @param content The file contents as a string
 * @returns true if successful, false otherwise
 */
export async function writeFileAction(templateId: string, relativePath: string, content: string): Promise<boolean> {
  try {
    console.log(`[Server Action] Writing file ${relativePath} in template ${templateId}`);
    
    await fileSystemService.writeTextFile(templateId, relativePath, content);
    return true;
  } catch (error) {
    console.error(`[Server Action] Error writing file ${relativePath} in template ${templateId}:`, error);
    return false;
  }
} 