/**
 * Migrate PSADT Documentation to Prisma Database
 * 
 * This script reads documentation from the SQLite database and inserts it into
 * the Prisma database as template records.
 */

const sqlite3 = require('sqlite3').verbose();
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

// Initialize Prisma client
const prisma = new PrismaClient();

// Path to SQLite database
const sqliteDbPath = path.join(__dirname, '../data/psadt-docs.sqlite');

// Function to promisify SQLite operations
function runSqliteQuery(db, query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Main migration function
async function migratePsadtDocsToPrisma() {
  console.log('Starting migration of PSADT documentation to Prisma...');
  
  // Check if SQLite database exists
  if (!fs.existsSync(sqliteDbPath)) {
    console.error(`SQLite database not found at: ${sqliteDbPath}`);
    return;
  }

  // Open SQLite database
  const db = new sqlite3.Database(sqliteDbPath);
  
  try {
    // Get user ID (assuming there's only one user or using a specific user)
    const users = await prisma.user.findMany({ take: 1 });
    if (users.length === 0) {
      throw new Error('No users found in the database');
    }
    const userId = users[0].id;
    
    // Get existing templates
    const existingTemplates = await prisma.template.findMany({
      where: {
        name: {
          contains: 'PSAppDeployToolkit'
        }
      }
    });
    
    const existingTemplateNames = existingTemplates.map(t => t.name);
    console.log(`Found ${existingTemplateNames.length} existing PSADT templates`);
    
    // Get commands from SQLite database for both v3 and v4
    const v3Commands = await runSqliteQuery(db, 'SELECT * FROM commands WHERE version = 3');
    const v4Commands = await runSqliteQuery(db, 'SELECT * FROM commands WHERE version = 4');
    
    console.log(`Found ${v3Commands.length} v3 commands and ${v4Commands.length} v4 commands`);
    
    // Create templates for v3 and v4 documentation
    const templatePromises = [];
    
    // Create template for v3 documentation
    if (v3Commands.length > 0 && !existingTemplateNames.includes('PSAppDeployToolkit_Template_v3')) {
      // Format commands for documentation content
      let v3Content = '# PSADT v3 Command Reference\n\n';
      
      for (const cmd of v3Commands) {
        // Skip non-real commands (like description, syntax, etc.)
        if (['Description', 'Syntax', 'Parameters', 'Example'].includes(cmd.command_name)) {
          continue;
        }
        
        v3Content += `## ${cmd.command_name}\n\n`;
        
        if (cmd.description) {
          v3Content += `${cmd.description}\n\n`;
        }
        
        if (cmd.syntax) {
          v3Content += `### Syntax\n\`\`\`powershell\n${cmd.syntax}\n\`\`\`\n\n`;
        }
        
        // Get parameters for this command
        const params = await runSqliteQuery(db, 'SELECT * FROM parameters WHERE command_id = ? ORDER BY position', [cmd.id]);
        
        if (params.length > 0) {
          v3Content += `### Parameters\n\n`;
          
          for (const param of params) {
            v3Content += `**-${param.param_name}**`;
            
            if (param.param_type) {
              v3Content += ` <${param.param_type}>`;
            }
            
            if (param.is_required) {
              v3Content += ` (Required)`;
            }
            
            v3Content += `\n\n`;
            
            if (param.description) {
              v3Content += `${param.description}\n\n`;
            }
          }
        }
        
        // Add examples if available
        if (cmd.examples) {
          try {
            const examples = JSON.parse(cmd.examples);
            if (examples && examples.length > 0) {
              v3Content += `### Examples\n\n`;
              
              for (const example of examples) {
                v3Content += `\`\`\`powershell\n${example}\n\`\`\`\n\n`;
              }
            }
          } catch (e) {
            console.warn(`Error parsing examples for ${cmd.command_name}: ${e.message}`);
          }
        }
        
        // Add separation between commands
        v3Content += '---\n\n';
      }
      
      // Create the template in Prisma
      const createV3Template = prisma.template.create({
        data: {
          name: 'PSAppDeployToolkit_Template_v3',
          description: 'PSADT v3 Command Reference Documentation',
          packageType: 'PowerShellAppDeploymentToolkit',
          userId: userId,
          content: v3Content,
          isPublic: true
        }
      });
      
      templatePromises.push(createV3Template);
    }
    
    // Create template for v4 documentation
    if (v4Commands.length > 0 && !existingTemplateNames.includes('PSAppDeployToolkit_Template_v4')) {
      // Format commands for documentation content
      let v4Content = '# PSADT v4 Command Reference\n\n';
      
      for (const cmd of v4Commands) {
        // Skip non-real commands (like description, syntax, etc.)
        if (['Description', 'Syntax', 'Parameters', 'Example'].includes(cmd.command_name)) {
          continue;
        }
        
        v4Content += `## ${cmd.command_name}\n\n`;
        
        if (cmd.description) {
          v4Content += `${cmd.description}\n\n`;
        }
        
        if (cmd.syntax) {
          v4Content += `### Syntax\n\`\`\`powershell\n${cmd.syntax}\n\`\`\`\n\n`;
        }
        
        // Get parameters for this command
        const params = await runSqliteQuery(db, 'SELECT * FROM parameters WHERE command_id = ? ORDER BY position', [cmd.id]);
        
        if (params.length > 0) {
          v4Content += `### Parameters\n\n`;
          
          for (const param of params) {
            v4Content += `**-${param.param_name}**`;
            
            if (param.param_type) {
              v4Content += ` <${param.param_type}>`;
            }
            
            if (param.is_required) {
              v4Content += ` (Required)`;
            }
            
            v4Content += `\n\n`;
            
            if (param.description) {
              v4Content += `${param.description}\n\n`;
            }
          }
        }
        
        // Add examples if available
        if (cmd.examples) {
          try {
            const examples = JSON.parse(cmd.examples);
            if (examples && examples.length > 0) {
              v4Content += `### Examples\n\n`;
              
              for (const example of examples) {
                v4Content += `\`\`\`powershell\n${example}\n\`\`\`\n\n`;
              }
            }
          } catch (e) {
            console.warn(`Error parsing examples for ${cmd.command_name}: ${e.message}`);
          }
        }
        
        // Add separation between commands
        v4Content += '---\n\n';
      }
      
      // Create the template in Prisma
      const createV4Template = prisma.template.create({
        data: {
          name: 'PSAppDeployToolkit_Template_v4',
          description: 'PSADT v4 Command Reference Documentation',
          packageType: 'PowerShellAppDeploymentToolkit',
          userId: userId,
          content: v4Content,
          isPublic: true
        }
      });
      
      templatePromises.push(createV4Template);
    }
    
    // Create version migration guide template
    if (v3Commands.length > 0 && v4Commands.length > 0 && !existingTemplateNames.includes('PSAppDeployToolkit_Migration_Guide')) {
      // Get command mappings
      const mappings = await runSqliteQuery(db, `
        SELECT v3.command_name as v3_command, v4.command_name as v4_command 
        FROM commands v3 
        JOIN commands v4 ON v3.v4_equivalent_id = v4.id 
        WHERE v3.version = 3 AND v4.version = 4
      `);
      
      let migrationContent = '# PSADT v3 to v4 Migration Guide\n\n';
      
      migrationContent += `## Command Mapping\n\n`;
      migrationContent += `| PSADT v3 Command | PSADT v4 Command |\n`;
      migrationContent += `|-----------------|------------------|\n`;
      
      for (const mapping of mappings) {
        migrationContent += `| \`${mapping.v3_command}\` | \`${mapping.v4_command}\` |\n`;
      }
      
      migrationContent += `\n## Major Changes\n\n`;
      migrationContent += `- **Command Prefix**: v4 adds "ADT" prefix to commands\n`;
      migrationContent += `- **Parameter Style**: v4 uses standard PowerShell parameter patterns\n`;
      migrationContent += `- **Architecture**: v4 is a proper PowerShell module\n`;
      migrationContent += `- **ErrorHandling**: v4 uses -ErrorAction instead of -ContinueOnError\n`;
      
      // Create the template in Prisma
      const createMigrationTemplate = prisma.template.create({
        data: {
          name: 'PSAppDeployToolkit_Migration_Guide',
          description: 'PSADT v3 to v4 Migration Guide',
          packageType: 'PowerShellAppDeploymentToolkit',
          userId: userId,
          content: migrationContent,
          isPublic: true
        }
      });
      
      templatePromises.push(createMigrationTemplate);
    }
    
    // Create a base template for new PSADT scripts
    if (!existingTemplateNames.includes('PSAppDeployToolkit_Base_Template')) {
      const baseTemplateContent = `<#
.SYNOPSIS
    This script performs the installation or uninstallation of an application.
.DESCRIPTION
    The script is provided as a template to perform an install or uninstall of an application.
    The script either performs an "Install" deployment type or an "Uninstall" deployment type.
.PARAMETER DeploymentType
    The type of deployment to perform. [Install|Uninstall]
.PARAMETER DeployMode
    Specifies whether the installation should be run in Interactive, Silent, or NonInteractive mode.
    Interactive = Default mode
    Silent = No dialogs
    NonInteractive = Very silent, i.e. no blocking apps. NonInteractive mode is automatically set if it is detected that the process is not user interactive.
.PARAMETER AllowRebootPassThru
    Allows the 3010 return code (requires restart) to be passed back to the parent process (e.g. SCCM) if detected from an installation.
    If 3010 is passed back to SCCM, a reboot prompt will be triggered.
.PARAMETER TerminalServerMode
    Changes to "user install mode" and back to "user execute mode" for installing/uninstalling applications for Remote Desktop Session Hosts/Citrix servers.
.PARAMETER DisableLogging
    Disables logging to file for the script.
.EXAMPLE
    Deploy-Application.ps1
.EXAMPLE
    Deploy-Application.ps1 -DeploymentType "Uninstall"
.EXAMPLE
    Deploy-Application.ps1 -DeploymentType "Install" -DeployMode "Silent"
.EXAMPLE
    Deploy-Application.ps1 -DeploymentType "Install" -DeployMode "Interactive"
.EXAMPLE
    Deploy-Application.ps1 -DeploymentType "Install" -DeployMode "NonInteractive"
.EXAMPLE
    Deploy-Application.ps1 -DeploymentType "Install" -DeployMode "Silent" -AllowRebootPassThru
.EXAMPLE
    Deploy-Application.ps1 -DeploymentType "Install" -DeployMode "Silent" -TerminalServerMode
.NOTES
    Toolkit Exit Code Ranges:
    60000 - 68999: Reserved for built-in exit codes in Deploy-Application.ps1, Deploy-Application.exe, and AppDeployToolkitMain.ps1
    69000 - 69999: Recommended for user customized exit codes in Deploy-Application.ps1
    70000 - 79999: Recommended for user customized exit codes in AppDeployToolkitExtensions.ps1
.LINK
    https://psappdeploytoolkit.com
#>

[CmdletBinding()]
Param (
    [Parameter(Mandatory = $false)]
    [ValidateSet('Install', 'Uninstall', 'Repair')]
    [String]$DeploymentType = 'Install',
    [Parameter(Mandatory = $false)]
    [ValidateSet('Interactive', 'Silent', 'NonInteractive')]
    [String]$DeployMode = 'Interactive',
    [Parameter(Mandatory = $false)]
    [switch]$AllowRebootPassThru = $false,
    [Parameter(Mandatory = $false)]
    [switch]$TerminalServerMode = $false,
    [Parameter(Mandatory = $false)]
    [switch]$DisableLogging = $false
)

Try {
    ## Import the appropriate version of the AppDeployToolkit.ps1 file (v3 or v4)
    
    ## For PSADT v3:
    ## Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
    ## . "$PSScriptRoot\\AppDeployToolkit\\AppDeployToolkitMain.ps1"
    
    ## For PSADT v4:
    #Import-Module -Name PSAppDeployToolkit
    
    ## Handle parameters
    If ($deploymentType -ieq 'Uninstall') {
        $installPhase = 'Uninstallation'
    }
    Else {
        $installPhase = 'Installation'
    }

    ## Show Welcome Message, close processes if required, allow up to 3 deferrals, verify disk space
    Show-InstallationWelcome -CloseApps 'iexplore,firefox,chrome' -CheckDiskSpace -PersistPrompt

    ## Show Progress Message
    Show-InstallationProgress

    ## <Perform Installation tasks here>
    
    ## Display a message at the end of the install
    Show-InstallationPrompt -Message "Installation has completed successfully." -ButtonRightText "OK" -Icon Information
    
    ## Complete the installation
    Exit-Script -ExitCode 0
}
Catch {
    [int32]$mainExitCode = 60001
    Write-Log -Message "Installation failed with error: $($_.Exception.Message)" -Severity 3 -Source $deployAppScriptFriendlyName
    Show-DialogBox -Text "Installation failed with error: $($_.Exception.Message)" -Icon 'Stop'
    Exit-Script -ExitCode $mainExitCode
}
`;

      // Create the template in Prisma
      const createBaseTemplate = prisma.template.create({
        data: {
          name: 'PSAppDeployToolkit_Base_Template',
          description: 'Base template for PSADT script creation',
          packageType: 'PowerShellAppDeploymentToolkit',
          userId: userId,
          content: baseTemplateContent,
          isPublic: true,
          isDefault: true
        }
      });
      
      templatePromises.push(createBaseTemplate);
    }
    
    // Wait for all template creations to complete
    if (templatePromises.length > 0) {
      const results = await Promise.all(templatePromises);
      console.log(`Created ${results.length} templates in Prisma database`);
      
      // Log the created templates
      for (const template of results) {
        console.log(`- ${template.name}`);
      }
    } else {
      console.log('No new templates to create');
    }
    
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    // Close SQLite database
    db.close();
    
    // Disconnect from Prisma
    await prisma.$disconnect();
  }
  
  console.log('Migration completed');
}

// Run the migration function
migratePsadtDocsToPrisma()
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
