/**
 * Create PSADT Templates in Prisma Database
 * 
 * This script creates PSADT documentation templates in the Prisma database
 * using our mocked documentation.
 */

const { PrismaClient } = require('@prisma/client');

// Initialize Prisma client
const prisma = new PrismaClient();

// Create Base Template content
function createBaseTemplate() {
  let content = `<#
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
    . "$PSScriptRoot\\AppDeployToolkit\\AppDeployToolkitMain.ps1"
    
    ## For PSADT v4:
    ## Import-Module -Name PSAppDeployToolkit
    
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

  return content;
}

// Create Migration Guide content
function createMigrationGuide() {
  let content = `# PSADT v3 to v4 Migration Guide

## Overview

This document provides guidance for migrating scripts from PowerShell App Deployment Toolkit (PSADT) v3 to v4.

## Key Differences

### Command Naming Convention

- **v3**: Used natural PowerShell commands (e.g., \`Set-RegistryKey\`, \`Execute-Process\`)
- **v4**: Adds "ADT" prefix to all commands (e.g., \`Set-ADTRegistryKey\`, \`Execute-ADTProcess\`)

### Architecture Changes

- **v3**: Collection of dot-sourced scripts
- **v4**: PowerShell module with code signing and improved security

### Parameter Handling

- **v3**: Used custom parameters like \`-ContinueOnError $true\`
- **v4**: Uses standard PowerShell parameters like \`-ErrorAction SilentlyContinue\`

### File Structure

- **v3**: Simple hierarchy with AppDeployToolkit folder
- **v4**: Module structure with PSAppDeployToolkit.psm1 and versioned resources

## Command Mapping

| PSADT v3 Command | PSADT v4 Command |
|------------------|------------------|
| Set-RegistryKey | Set-ADTRegistryKey |
| Remove-RegistryKey | Remove-ADTRegistryKey |
| Show-InstallationWelcome | Show-ADTInstallationWelcome |
| Show-InstallationProgress | Show-ADTInstallationProgress |
| Execute-Process | Execute-ADTProcess |
| Write-Log | Write-ADTLog |
| Test-Battery | Test-ADTBattery |
| Test-ServiceExists | Test-ADTServiceExists |
| Test-Path | Test-ADTPath |

## Migration Steps

1. **Update Import Statement**:
   - v3: \`. "$PSScriptRoot\\AppDeployToolkit\\AppDeployToolkitMain.ps1"\`
   - v4: \`Import-Module -Name PSAppDeployToolkit\`

2. **Update Command Names**:
   - Replace all v3 commands with their v4 equivalents (add ADT prefix)
   - Example: \`Show-InstallationWelcome\` → \`Show-ADTInstallationWelcome\`

3. **Update Error Handling Parameters**:
   - Replace \`-ContinueOnError $true\` with \`-ErrorAction SilentlyContinue\`
   - Replace \`-ContinueOnError $false\` with \`-ErrorAction Stop\`

4. **Update Execution Context**:
   - v4 requires proper PowerShell module context
   - Use PowerShell 5.1 or later for best compatibility

## Compatibility Notes

- v4 includes compatibility shims for v3 commands
- Both versions can coexist in the same environment
- Scripts designed for v3 will generally work with v4 without modification

## Best Practices

1. **Use v4 Command Naming**:
   - Consistently use the ADT prefix for all toolkit commands
   - This makes it clear which functions are from PSADT

2. **Use Standard PowerShell Parameters**:
   - Follow PowerShell best practices for parameter naming
   - Use standard PowerShell error handling with \`-ErrorAction\`

3. **Test Thoroughly**:
   - Test all scripts after migration to ensure compatibility
   - Pay special attention to error handling and user interfaces

`;

  return content;
}

// Create PSADT v3 Documentation content
function createV3Documentation() {
  let content = `# PSADT v3 Command Reference

## Overview

This documentation covers the key commands available in the PowerShell App Deployment Toolkit (PSADT) version 3.

---

## Set-RegistryKey

Sets a registry key value or creates a new registry key.

### Syntax
\`\`\`powershell
Set-RegistryKey [-Key] <String> [[-Name] <String>] [[-Value] <Object>] [-Type <String>] [-SID <String>] [-ContinueOnError <Boolean>]
\`\`\`

### Parameters

**-Key** <String> (Required)

The registry key path.

**-Name** <String>

The value name.

**-Value** <Object>

The value data.

**-Type** <String>

The type of registry value to create or set. Options: 'Binary','DWord','ExpandString','MultiString','None','QWord','String','Unknown'.

**-SID** <String>

The security identifier (SID) for a user.

**-ContinueOnError** <Boolean>

Continue if an error is encountered. Default is: $true.

### Examples

\`\`\`powershell
Set-RegistryKey -Key 'HKEY_LOCAL_MACHINE\\SOFTWARE\\MyCompany\\MyApplication' -Name 'Version' -Value '1.0.0' -Type 'String'
\`\`\`

---

## Remove-RegistryKey

Removes a registry key or value.

### Syntax
\`\`\`powershell
Remove-RegistryKey [-Key] <String> [[-Name] <String>] [-SID <String>] [-ContinueOnError <Boolean>]
\`\`\`

### Parameters

**-Key** <String> (Required)

The registry key path.

**-Name** <String>

The value name.

**-SID** <String>

The security identifier (SID) for a user.

**-ContinueOnError** <Boolean>

Continue if an error is encountered. Default is: $true.

### Examples

\`\`\`powershell
Remove-RegistryKey -Key 'HKEY_LOCAL_MACHINE\\SOFTWARE\\MyCompany\\MyApplication'
\`\`\`

---

## Show-InstallationWelcome

Displays a welcome dialog for the installation.

### Syntax
\`\`\`powershell
Show-InstallationWelcome [-CloseApps <String[]>] [-CloseAppsCountdown <Int32>] [-AllowDefer <Boolean>] [-DeferTimes <Int32>] [-CheckDiskSpace <Boolean>] [-PersistPrompt <Boolean>] [-MinimizeWindows <Boolean>] [-ContinueOnError <Boolean>]
\`\`\`

### Parameters

**-CloseApps** <String[]>

List of application names to check for and close.

**-CloseAppsCountdown** <Int32>

Countdown time in seconds before applications are automatically closed.

**-AllowDefer** <Boolean>

Allows the user to defer the installation.

**-DeferTimes** <Int32>

Number of times the user can defer the installation.

**-CheckDiskSpace** <Boolean>

Checks for available disk space before installation.

**-PersistPrompt** <Boolean>

Keep the prompt visible even after execution.

**-MinimizeWindows** <Boolean>

Minimizes all windows before displaying the prompt.

**-ContinueOnError** <Boolean>

Continue if an error is encountered. Default is: $true.

### Examples

\`\`\`powershell
Show-InstallationWelcome -CloseApps 'iexplore,firefox,chrome' -CloseAppsCountdown 60 -AllowDefer -DeferTimes 3 -CheckDiskSpace
\`\`\`

---

## Execute-Process

Executes a process with appropriate error handling and logging.

### Syntax
\`\`\`powershell
Execute-Process [-Path] <String> [[-Parameters] <String>] [-WindowStyle <String>] [-CreateNoWindow <Boolean>] [-WorkingDirectory <String>] [-NoWait <Boolean>] [-PassThru <Boolean>] [-IgnoreExitCodes <String[]>] [-ContinueOnError <Boolean>]
\`\`\`

### Parameters

**-Path** <String> (Required)

Path to the executable.

**-Parameters** <String>

Arguments to pass to the executable.

**-WindowStyle** <String>

Window style for the process. Options: 'Normal','Hidden','Minimized','Maximized'.

**-CreateNoWindow** <Boolean>

Creates the process with no window.

**-WorkingDirectory** <String>

Working directory for the process.

**-NoWait** <Boolean>

Does not wait for the process to complete.

**-PassThru** <Boolean>

Returns the process object.

**-IgnoreExitCodes** <String[]>

List of exit codes to ignore.

**-ContinueOnError** <Boolean>

Continue if an error is encountered. Default is: $true.

### Examples

\`\`\`powershell
Execute-Process -Path 'setup.exe' -Parameters '/S' -WindowStyle 'Hidden'
\`\`\`

---

## Write-Log

Writes a message to the log file and console.

### Syntax
\`\`\`powershell
Write-Log [-Message] <String> [-Severity <Int32>] [-Source <String>] [-LogFile <String>] [-ContinueOnError <Boolean>]
\`\`\`

### Parameters

**-Message** <String> (Required)

The message to log.

**-Severity** <Int32>

The severity of the message (1: Information, 2: Warning, 3: Error).

**-Source** <String>

The source of the message.

**-LogFile** <String>

The path to the log file.

**-ContinueOnError** <Boolean>

Continue if an error is encountered. Default is: $true.

### Examples

\`\`\`powershell
Write-Log -Message 'Installation started' -Severity 1 -Source 'Install-Application'
\`\`\`

`;

  return content;
}

// Create PSADT v4 Documentation content
function createV4Documentation() {
  let content = `# PSADT v4 Command Reference

## Overview

This documentation covers the key commands available in the PowerShell App Deployment Toolkit (PSADT) version 4.

---

## Set-ADTRegistryKey

Sets a registry key value or creates a new registry key.

### Syntax
\`\`\`powershell
Set-ADTRegistryKey [-Key] <String> [[-Name] <String>] [[-Value] <Object>] [-Type <String>] [-SID <String>] [-ErrorAction <ActionPreference>]
\`\`\`

### Parameters

**-Key** <String> (Required)

The registry key path.

**-Name** <String>

The value name.

**-Value** <Object>

The value data.

**-Type** <String>

The type of registry value to create or set. Options: 'Binary','DWord','ExpandString','MultiString','None','QWord','String','Unknown'.

**-SID** <String>

The security identifier (SID) for a user.

**-ErrorAction** <ActionPreference>

Specifies how the cmdlet responds when an error occurs. Options: 'SilentlyContinue','Stop','Continue','Inquire','Ignore','Suspend'.

### Examples

\`\`\`powershell
Set-ADTRegistryKey -Key 'HKEY_LOCAL_MACHINE\\SOFTWARE\\MyCompany\\MyApplication' -Name 'Version' -Value '1.0.0' -Type 'String'
\`\`\`

---

## Remove-ADTRegistryKey

Removes a registry key or value.

### Syntax
\`\`\`powershell
Remove-ADTRegistryKey [-Key] <String> [[-Name] <String>] [-SID <String>] [-ErrorAction <ActionPreference>]
\`\`\`

### Parameters

**-Key** <String> (Required)

The registry key path.

**-Name** <String>

The value name.

**-SID** <String>

The security identifier (SID) for a user.

**-ErrorAction** <ActionPreference>

Specifies how the cmdlet responds when an error occurs. Options: 'SilentlyContinue','Stop','Continue','Inquire','Ignore','Suspend'.

### Examples

\`\`\`powershell
Remove-ADTRegistryKey -Key 'HKEY_LOCAL_MACHINE\\SOFTWARE\\MyCompany\\MyApplication'
\`\`\`

---

## Show-ADTInstallationWelcome

Displays a welcome dialog for the installation.

### Syntax
\`\`\`powershell
Show-ADTInstallationWelcome [-CloseApps <String[]>] [-CloseAppsCountdown <Int32>] [-AllowDefer <Boolean>] [-DeferTimes <Int32>] [-CheckDiskSpace <Boolean>] [-PersistPrompt <Boolean>] [-MinimizeWindows <Boolean>] [-ErrorAction <ActionPreference>]
\`\`\`

### Parameters

**-CloseApps** <String[]>

List of application names to check for and close.

**-CloseAppsCountdown** <Int32>

Countdown time in seconds before applications are automatically closed.

**-AllowDefer** <Boolean>

Allows the user to defer the installation.

**-DeferTimes** <Int32>

Number of times the user can defer the installation.

**-CheckDiskSpace** <Boolean>

Checks for available disk space before installation.

**-PersistPrompt** <Boolean>

Keep the prompt visible even after execution.

**-MinimizeWindows** <Boolean>

Minimizes all windows before displaying the prompt.

**-ErrorAction** <ActionPreference>

Specifies how the cmdlet responds when an error occurs. Options: 'SilentlyContinue','Stop','Continue','Inquire','Ignore','Suspend'.

### Examples

\`\`\`powershell
Show-ADTInstallationWelcome -CloseApps 'iexplore,firefox,chrome' -CloseAppsCountdown 60 -AllowDefer -DeferTimes 3 -CheckDiskSpace
\`\`\`

---

## Execute-ADTProcess

Executes a process with appropriate error handling and logging.

### Syntax
\`\`\`powershell
Execute-ADTProcess [-Path] <String> [[-Parameters] <String>] [-WindowStyle <String>] [-CreateNoWindow <Boolean>] [-WorkingDirectory <String>] [-NoWait <Boolean>] [-PassThru <Boolean>] [-IgnoreExitCodes <String[]>] [-ErrorAction <ActionPreference>]
\`\`\`

### Parameters

**-Path** <String> (Required)

Path to the executable.

**-Parameters** <String>

Arguments to pass to the executable.

**-WindowStyle** <String>

Window style for the process. Options: 'Normal','Hidden','Minimized','Maximized'.

**-CreateNoWindow** <Boolean>

Creates the process with no window.

**-WorkingDirectory** <String>

Working directory for the process.

**-NoWait** <Boolean>

Does not wait for the process to complete.

**-PassThru** <Boolean>

Returns the process object.

**-IgnoreExitCodes** <String[]>

List of exit codes to ignore.

**-ErrorAction** <ActionPreference>

Specifies how the cmdlet responds when an error occurs. Options: 'SilentlyContinue','Stop','Continue','Inquire','Ignore','Suspend'.

### Examples

\`\`\`powershell
Execute-ADTProcess -Path 'setup.exe' -Parameters '/S' -WindowStyle 'Hidden'
\`\`\`

---

## Write-ADTLog

Writes a message to the log file and console.

### Syntax
\`\`\`powershell
Write-ADTLog [-Message] <String> [-Severity <Int32>] [-Source <String>] [-LogFile <String>] [-ErrorAction <ActionPreference>]
\`\`\`

### Parameters

**-Message** <String> (Required)

The message to log.

**-Severity** <Int32>

The severity of the message (1: Information, 2: Warning, 3: Error).

**-Source** <String>

The source of the message.

**-LogFile** <String>

The path to the log file.

**-ErrorAction** <ActionPreference>

Specifies how the cmdlet responds when an error occurs. Options: 'SilentlyContinue','Stop','Continue','Inquire','Ignore','Suspend'.

### Examples

\`\`\`powershell
Write-ADTLog -Message 'Installation started' -Severity 1 -Source 'Install-Application'
\`\`\`

`;

  return content;
}

// Main function to create templates
async function createPsadtTemplates() {
  console.log('Creating PSADT templates in Prisma database...');
  
  try {
    // Get user ID (assuming there's only one user or using a specific user)
    const users = await prisma.user.findMany({ take: 1 });
    if (users.length === 0) {
      throw new Error('No users found in the database');
    }
    const userId = users[0].id;
    
    // Check for existing templates
    const existingTemplates = await prisma.template.findMany({
      where: {
        name: {
          contains: 'PSAppDeployToolkit'
        }
      }
    });
    
    const existingTemplateNames = existingTemplates.map(t => t.name);
    console.log(`Found ${existingTemplateNames.length} existing PSADT templates`);
    
    // Create templates using our mock documentation
    const templatePromises = [];
    
    // 1. Create PSADT v3 Documentation template
    if (!existingTemplateNames.includes('PSAppDeployToolkit_Documentation_v3')) {
      const v3Content = createV3Documentation();
      
      const createV3Template = prisma.template.create({
        data: {
          name: 'PSAppDeployToolkit_Documentation_v3',
          description: 'PSADT v3 Command Reference Documentation',
          packageType: 'PowerShellAppDeploymentToolkit',
          userId: userId,
          content: v3Content,
          isPublic: true
        }
      });
      
      templatePromises.push(createV3Template);
    }
    
    // 2. Create PSADT v4 Documentation template
    if (!existingTemplateNames.includes('PSAppDeployToolkit_Documentation_v4')) {
      const v4Content = createV4Documentation();
      
      const createV4Template = prisma.template.create({
        data: {
          name: 'PSAppDeployToolkit_Documentation_v4',
          description: 'PSADT v4 Command Reference Documentation',
          packageType: 'PowerShellAppDeploymentToolkit',
          userId: userId,
          content: v4Content,
          isPublic: true
        }
      });
      
      templatePromises.push(createV4Template);
    }
    
    // 3. Create Migration Guide template
    if (!existingTemplateNames.includes('PSAppDeployToolkit_Migration_Guide')) {
      const migrationContent = createMigrationGuide();
      
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
    
    // 4. Create Base Template for new PSADT scripts
    if (!existingTemplateNames.includes('PSAppDeployToolkit_Base_Template')) {
      const baseContent = createBaseTemplate();
      
      const createBaseTemplatePromise = prisma.template.create({
        data: {
          name: 'PSAppDeployToolkit_Base_Template',
          description: 'Base template for PSADT script creation',
          packageType: 'PowerShellAppDeploymentToolkit',
          userId: userId,
          content: baseContent,
          isPublic: true,
          isDefault: true
        }
      });
      
      templatePromises.push(createBaseTemplatePromise);
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
    console.error('Error creating templates:', error);
  } finally {
    // Disconnect from Prisma
    await prisma.$disconnect();
  }
  
  console.log('Template creation completed');
}

// Run the script
createPsadtTemplates()
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
