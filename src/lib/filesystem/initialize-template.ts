import { 
  createPowerShellScriptAction, 
  listFilesAction 
} from './file-actions';

/**
 * Ensures that a template directory has at least one PowerShell script file
 * @param templateId The ID of the template to initialize
 */
export async function ensureTemplateHasFile(templateId: string): Promise<boolean> {
  try {
    console.log(`Checking if template ${templateId} has files...`);
    
    // Check if any files exist
    const files = await listFilesAction(templateId);
    
    if (!files || files.length === 0) {
      console.log(`No files found in template ${templateId}. Creating default script file.`);
      
      // Create a default PowerShell script
      const success = await createPowerShellScriptAction(templateId, 'script.ps1');
      
      if (success) {
        // Verify file was created
        const updatedFiles = await listFilesAction(templateId);
        console.log(`Created default file. Now have ${updatedFiles?.length || 0} files.`);
        return true;
      } else {
        console.error(`Failed to create default script file for template ${templateId}`);
        return false;
      }
    } else {
      console.log(`Template ${templateId} already has ${files.length} files.`);
      return false;
    }
  } catch (error) {
    console.error(`Error initializing template ${templateId}:`, error);
    return false;
  }
}

/**
 * Manually creates a PowerShell script file in the template directory
 * @param templateId The ID of the template 
 * @param filename The name of the file to create
 */
export async function createPowerShellScript(templateId: string, filename: string = 'script.ps1'): Promise<boolean> {
  try {
    console.log(`Creating PowerShell script ${filename} in template ${templateId}...`);
    
    // Create a default PowerShell script using the server action
    return await createPowerShellScriptAction(templateId, filename);
  } catch (error) {
    console.error(`Error creating PowerShell script in template ${templateId}:`, error);
    return false;
  }
} 