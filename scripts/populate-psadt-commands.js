/**
 * Populate PSADT Commands, Parameters, and Examples
 * 
 * This script populates the PSADT documentation tables in the Prisma database
 * with command information for both v3 and v4.
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Initialize Prisma client
const prisma = new PrismaClient();

// Main function to populate the database
async function populatePsadtCommands() {
  console.log('Populating PSADT documentation tables...');
  
  try {
    // Get the default template IDs for v3 and v4
    const v3Template = await prisma.template.findFirst({
      where: {
        name: 'PSAppDeployToolkit_Documentation_v3'
      }
    });
    
    const v4Template = await prisma.template.findFirst({
      where: {
        name: 'PSAppDeployToolkit_Documentation_v4'
      }
    });
    
    if (!v3Template || !v4Template) {
      console.log('Creating documentation templates...');
      // If templates don't exist, create them first
      await createDocumentationTemplates();
      
      // Try again to get the templates
      const templates = await prisma.template.findMany({
        where: {
          name: {
            in: ['PSAppDeployToolkit_Documentation_v3', 'PSAppDeployToolkit_Documentation_v4']
          }
        }
      });
      
      if (templates.length === 2) {
        const v3Index = templates[0].name === 'PSAppDeployToolkit_Documentation_v3' ? 0 : 1;
        const v4Index = v3Index === 0 ? 1 : 0;
        
        await populateCommands(templates[v3Index].id, 3);
        await populateCommands(templates[v4Index].id, 4);
      } else {
        throw new Error('Failed to create documentation templates');
      }
    } else {
      await populateCommands(v3Template.id, 3);
      await populateCommands(v4Template.id, 4);
    }
    
    // Map v3 and v4 commands
    await mapVersions();
    
    // Create patterns for syntax highlighting
    await createPatterns();
    
    console.log('PSADT documentation tables populated successfully');
  } catch (error) {
    console.error('Error populating PSADT documentation tables:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Create documentation templates if they don't exist
async function createDocumentationTemplates() {
  // Get user ID (assuming there's only one user or using a specific user)
  const users = await prisma.user.findMany({ take: 1 });
  if (users.length === 0) {
    throw new Error('No users found in the database');
  }
  const userId = users[0].id;
  
  // Create v3 template
  await prisma.template.create({
    data: {
      name: 'PSAppDeployToolkit_Documentation_v3',
      description: 'PSADT v3 Command Reference Documentation',
      packageType: 'PowerShellAppDeploymentToolkit',
      userId: userId,
      isPublic: true,
      type: 'Documentation'
    }
  });
  
  // Create v4 template
  await prisma.template.create({
    data: {
      name: 'PSAppDeployToolkit_Documentation_v4',
      description: 'PSADT v4 Command Reference Documentation',
      packageType: 'PowerShellAppDeploymentToolkit',
      userId: userId,
      isPublic: true,
      type: 'Documentation'
    }
  });
  
  console.log('Created documentation templates');
}

// Populate commands for a specific version
async function populateCommands(templateId, version) {
  console.log(`Populating commands for PSADT v${version}...`);
  
  // Define commands for the version
  const commands = version === 3 ? getV3Commands() : getV4Commands();
  
  // Create commands and their parameters/examples
  for (const command of commands) {
    console.log(`Processing command: ${command.commandName}`);
    
    // Create command
    const createdCommand = await prisma.psadtCommand.create({
      data: {
        commandName: command.commandName,
        version: version,
        description: command.description,
        syntax: command.syntax,
        returnValue: command.returnValue,
        notes: command.notes,
        aliases: command.aliases,
        isDeprecated: command.isDeprecated || false,
        templateId: templateId
      }
    });
    
    // Create parameters
    if (command.parameters && command.parameters.length > 0) {
      for (const param of command.parameters) {
        await prisma.psadtParameter.create({
          data: {
            commandId: createdCommand.id,
            paramName: param.name,
            paramType: param.type,
            description: param.description,
            isRequired: param.isRequired || false,
            isCritical: param.isCritical || false,
            defaultValue: param.defaultValue,
            position: param.position
          }
        });
      }
    }
    
    // Create examples
    if (command.examples && command.examples.length > 0) {
      for (const example of command.examples) {
        await prisma.psadtExample.create({
          data: {
            commandId: createdCommand.id,
            title: example.title,
            code: example.code,
            description: example.description
          }
        });
      }
    }
  }
  
  console.log(`Populated ${commands.length} commands for PSADT v${version}`);
}

// Map v3 and v4 commands
async function mapVersions() {
  console.log('Mapping v3 to v4 commands...');
  
  // Define command mappings
  const mappings = [
    { v3: 'Set-RegistryKey', v4: 'Set-ADTRegistryKey' },
    { v3: 'Remove-RegistryKey', v4: 'Remove-ADTRegistryKey' },
    { v3: 'Show-InstallationWelcome', v4: 'Show-ADTInstallationWelcome' },
    { v3: 'Show-InstallationProgress', v4: 'Show-ADTInstallationProgress' },
    { v3: 'Execute-Process', v4: 'Execute-ADTProcess' },
    { v3: 'Write-Log', v4: 'Write-ADTLog' },
    { v3: 'Test-Battery', v4: 'Test-ADTBattery' },
    { v3: 'Test-ServiceExists', v4: 'Test-ADTServiceExists' },
    { v3: 'Test-Path', v4: 'Test-ADTPath' }
  ];
  
  for (const mapping of mappings) {
    // Get v3 and v4 commands
    const v3Command = await prisma.psadtCommand.findFirst({
      where: {
        commandName: mapping.v3,
        version: 3
      }
    });
    
    const v4Command = await prisma.psadtCommand.findFirst({
      where: {
        commandName: mapping.v4,
        version: 4
      }
    });
    
    if (v3Command && v4Command) {
      // Update v3 command to point to v4
      await prisma.psadtCommand.update({
        where: { id: v3Command.id },
        data: { mappedCommandId: v4Command.id }
      });
      
      // Update v4 command to point to v3
      await prisma.psadtCommand.update({
        where: { id: v4Command.id },
        data: { mappedCommandId: v3Command.id }
      });
      
      console.log(`Mapped ${mapping.v3} to ${mapping.v4}`);
    }
  }
}

// Create patterns for syntax highlighting
async function createPatterns() {
  console.log('Creating patterns for syntax highlighting...');
  
  // Define patterns for v3
  const v3Patterns = [
    {
      patternType: 'command',
      regexPattern: '\\b(Set|Get|Remove|Show|Execute|Write|Test|Install|Uninstall)\\-[A-Za-z]+\\b',
      tokenName: 'psadt.command',
      priority: 100
    },
    {
      patternType: 'critical_parameter',
      regexPattern: '\\s\\-(CloseProcesses|PersistPrompt|CheckDiskSpace|DeferTimes|CloseAppsCountdown)\\b',
      tokenName: 'psadt.parameter.critical',
      priority: 90
    },
    {
      patternType: 'parameter',
      regexPattern: '\\s\\-([A-Za-z][\\w]+)\\b',
      tokenName: 'psadt.parameter',
      priority: 80
    }
  ];
  
  // Define patterns for v4
  const v4Patterns = [
    {
      patternType: 'command',
      regexPattern: '\\b(Set|Get|Remove|Show|Execute|Write|Test|Install|Uninstall)\\-ADT[A-Za-z]+\\b',
      tokenName: 'psadt.command',
      priority: 100
    },
    {
      patternType: 'critical_parameter',
      regexPattern: '\\s\\-(CloseProcesses|PersistPrompt|CheckDiskSpace|DeferTimes|CloseAppsCountdown)\\b',
      tokenName: 'psadt.parameter.critical',
      priority: 90
    },
    {
      patternType: 'parameter',
      regexPattern: '\\s\\-([A-Za-z][\\w]+)\\b',
      tokenName: 'psadt.parameter',
      priority: 80
    },
    {
      patternType: 'error_action',
      regexPattern: '\\s\\-ErrorAction\\s+(SilentlyContinue|Stop|Continue|Inquire|Ignore|Suspend)\\b',
      tokenName: 'psadt.parameter.erroraction',
      priority: 85
    }
  ];
  
  // Create v3 patterns
  for (const pattern of v3Patterns) {
    await prisma.psadtPattern.create({
      data: {
        version: 3,
        patternType: pattern.patternType,
        regexPattern: pattern.regexPattern,
        tokenName: pattern.tokenName,
        priority: pattern.priority
      }
    });
  }
  
  // Create v4 patterns
  for (const pattern of v4Patterns) {
    await prisma.psadtPattern.create({
      data: {
        version: 4,
        patternType: pattern.patternType,
        regexPattern: pattern.regexPattern,
        tokenName: pattern.tokenName,
        priority: pattern.priority
      }
    });
  }
  
  console.log(`Created ${v3Patterns.length + v4Patterns.length} patterns for syntax highlighting`);
}

// Define v3 commands
function getV3Commands() {
  return [
    {
      commandName: 'Set-RegistryKey',
      description: 'Sets a registry key value or creates a new registry key.',
      syntax: 'Set-RegistryKey [-Key] <String> [[-Name] <String>] [[-Value] <Object>] [-Type <String>] [-SID <String>] [-ContinueOnError <Boolean>]',
      parameters: [
        {
          name: 'Key',
          type: 'String',
          description: 'The registry key path.',
          isRequired: true,
          position: 1
        },
        {
          name: 'Name',
          type: 'String',
          description: 'The value name.',
          position: 2
        },
        {
          name: 'Value',
          type: 'Object',
          description: 'The value data.',
          position: 3
        },
        {
          name: 'Type',
          type: 'String',
          description: "The type of registry value to create or set. Options: 'Binary','DWord','ExpandString','MultiString','None','QWord','String','Unknown'."
        },
        {
          name: 'SID',
          type: 'String',
          description: 'The security identifier (SID) for a user.'
        },
        {
          name: 'ContinueOnError',
          type: 'Boolean',
          description: 'Continue if an error is encountered. Default is: $true.'
        }
      ],
      examples: [
        {
          code: "Set-RegistryKey -Key 'HKEY_LOCAL_MACHINE\\SOFTWARE\\MyCompany\\MyApplication' -Name 'Version' -Value '1.0.0' -Type 'String'"
        }
      ]
    },
    {
      commandName: 'Remove-RegistryKey',
      description: 'Removes a registry key or value.',
      syntax: 'Remove-RegistryKey [-Key] <String> [[-Name] <String>] [-SID <String>] [-ContinueOnError <Boolean>]',
      parameters: [
        {
          name: 'Key',
          type: 'String',
          description: 'The registry key path.',
          isRequired: true,
          position: 1
        },
        {
          name: 'Name',
          type: 'String',
          description: 'The value name.',
          position: 2
        },
        {
          name: 'SID',
          type: 'String',
          description: 'The security identifier (SID) for a user.'
        },
        {
          name: 'ContinueOnError',
          type: 'Boolean',
          description: 'Continue if an error is encountered. Default is: $true.'
        }
      ],
      examples: [
        {
          code: "Remove-RegistryKey -Key 'HKEY_LOCAL_MACHINE\\SOFTWARE\\MyCompany\\MyApplication'"
        }
      ]
    },
    {
      commandName: 'Show-InstallationWelcome',
      description: 'Displays a welcome dialog for the installation.',
      syntax: 'Show-InstallationWelcome [-CloseApps <String[]>] [-CloseAppsCountdown <Int32>] [-AllowDefer <Boolean>] [-DeferTimes <Int32>] [-CheckDiskSpace <Boolean>] [-PersistPrompt <Boolean>] [-MinimizeWindows <Boolean>] [-ContinueOnError <Boolean>]',
      parameters: [
        {
          name: 'CloseApps',
          type: 'String[]',
          description: 'List of application names to check for and close.',
          isCritical: true
        },
        {
          name: 'CloseAppsCountdown',
          type: 'Int32',
          description: 'Countdown time in seconds before applications are automatically closed.',
          isCritical: true
        },
        {
          name: 'AllowDefer',
          type: 'Boolean',
          description: 'Allows the user to defer the installation.'
        },
        {
          name: 'DeferTimes',
          type: 'Int32',
          description: 'Number of times the user can defer the installation.',
          isCritical: true
        },
        {
          name: 'CheckDiskSpace',
          type: 'Boolean',
          description: 'Checks for available disk space before installation.',
          isCritical: true
        },
        {
          name: 'PersistPrompt',
          type: 'Boolean',
          description: 'Keep the prompt visible even after execution.',
          isCritical: true
        },
        {
          name: 'MinimizeWindows',
          type: 'Boolean',
          description: 'Minimizes all windows before displaying the prompt.'
        },
        {
          name: 'ContinueOnError',
          type: 'Boolean',
          description: 'Continue if an error is encountered. Default is: $true.'
        }
      ],
      examples: [
        {
          code: "Show-InstallationWelcome -CloseApps 'iexplore,firefox,chrome' -CloseAppsCountdown 60 -AllowDefer -DeferTimes 3 -CheckDiskSpace"
        }
      ]
    },
    {
      commandName: 'Execute-Process',
      description: 'Executes a process with appropriate error handling and logging.',
      syntax: 'Execute-Process [-Path] <String> [[-Parameters] <String>] [-WindowStyle <String>] [-CreateNoWindow <Boolean>] [-WorkingDirectory <String>] [-NoWait <Boolean>] [-PassThru <Boolean>] [-IgnoreExitCodes <String[]>] [-ContinueOnError <Boolean>]',
      parameters: [
        {
          name: 'Path',
          type: 'String',
          description: 'Path to the executable.',
          isRequired: true,
          position: 1
        },
        {
          name: 'Parameters',
          type: 'String',
          description: 'Arguments to pass to the executable.',
          position: 2
        },
        {
          name: 'WindowStyle',
          type: 'String',
          description: "Window style for the process. Options: 'Normal','Hidden','Minimized','Maximized'."
        },
        {
          name: 'CreateNoWindow',
          type: 'Boolean',
          description: 'Creates the process with no window.'
        },
        {
          name: 'WorkingDirectory',
          type: 'String',
          description: 'Working directory for the process.'
        },
        {
          name: 'NoWait',
          type: 'Boolean',
          description: 'Does not wait for the process to complete.'
        },
        {
          name: 'PassThru',
          type: 'Boolean',
          description: 'Returns the process object.'
        },
        {
          name: 'IgnoreExitCodes',
          type: 'String[]',
          description: 'List of exit codes to ignore.'
        },
        {
          name: 'ContinueOnError',
          type: 'Boolean',
          description: 'Continue if an error is encountered. Default is: $true.'
        }
      ],
      examples: [
        {
          code: "Execute-Process -Path 'setup.exe' -Parameters '/S' -WindowStyle 'Hidden'"
        }
      ]
    },
    {
      commandName: 'Write-Log',
      description: 'Writes a message to the log file and console.',
      syntax: 'Write-Log [-Message] <String> [-Severity <Int32>] [-Source <String>] [-LogFile <String>] [-ContinueOnError <Boolean>]',
      parameters: [
        {
          name: 'Message',
          type: 'String',
          description: 'The message to log.',
          isRequired: true,
          position: 1
        },
        {
          name: 'Severity',
          type: 'Int32',
          description: 'The severity of the message (1: Information, 2: Warning, 3: Error).'
        },
        {
          name: 'Source',
          type: 'String',
          description: 'The source of the message.'
        },
        {
          name: 'LogFile',
          type: 'String',
          description: 'The path to the log file.'
        },
        {
          name: 'ContinueOnError',
          type: 'Boolean',
          description: 'Continue if an error is encountered. Default is: $true.'
        }
      ],
      examples: [
        {
          code: "Write-Log -Message 'Installation started' -Severity 1 -Source 'Install-Application'"
        }
      ]
    }
  ];
}

// Define v4 commands
function getV4Commands() {
  return [
    {
      commandName: 'Set-ADTRegistryKey',
      description: 'Sets a registry key value or creates a new registry key.',
      syntax: 'Set-ADTRegistryKey [-Key] <String> [[-Name] <String>] [[-Value] <Object>] [-Type <String>] [-SID <String>] [-ErrorAction <ActionPreference>]',
      parameters: [
        {
          name: 'Key',
          type: 'String',
          description: 'The registry key path.',
          isRequired: true,
          position: 1
        },
        {
          name: 'Name',
          type: 'String',
          description: 'The value name.',
          position: 2
        },
        {
          name: 'Value',
          type: 'Object',
          description: 'The value data.',
          position: 3
        },
        {
          name: 'Type',
          type: 'String',
          description: "The type of registry value to create or set. Options: 'Binary','DWord','ExpandString','MultiString','None','QWord','String','Unknown'."
        },
        {
          name: 'SID',
          type: 'String',
          description: 'The security identifier (SID) for a user.'
        },
        {
          name: 'ErrorAction',
          type: 'ActionPreference',
          description: "Specifies how the cmdlet responds when an error occurs. Options: 'SilentlyContinue','Stop','Continue','Inquire','Ignore','Suspend'."
        }
      ],
      examples: [
        {
          code: "Set-ADTRegistryKey -Key 'HKEY_LOCAL_MACHINE\\SOFTWARE\\MyCompany\\MyApplication' -Name 'Version' -Value '1.0.0' -Type 'String'"
        }
      ]
    },
    {
      commandName: 'Remove-ADTRegistryKey',
      description: 'Removes a registry key or value.',
      syntax: 'Remove-ADTRegistryKey [-Key] <String> [[-Name] <String>] [-SID <String>] [-ErrorAction <ActionPreference>]',
      parameters: [
        {
          name: 'Key',
          type: 'String',
          description: 'The registry key path.',
          isRequired: true,
          position: 1
        },
        {
          name: 'Name',
          type: 'String',
          description: 'The value name.',
          position: 2
        },
        {
          name: 'SID',
          type: 'String',
          description: 'The security identifier (SID) for a user.'
        },
        {
          name: 'ErrorAction',
          type: 'ActionPreference',
          description: "Specifies how the cmdlet responds when an error occurs. Options: 'SilentlyContinue','Stop','Continue','Inquire','Ignore','Suspend'."
        }
      ],
      examples: [
        {
          code: "Remove-ADTRegistryKey -Key 'HKEY_LOCAL_MACHINE\\SOFTWARE\\MyCompany\\MyApplication'"
        }
      ]
    },
    {
      commandName: 'Show-ADTInstallationWelcome',
      description: 'Displays a welcome dialog for the installation.',
      syntax: 'Show-ADTInstallationWelcome [-CloseApps <String[]>] [-CloseAppsCountdown <Int32>] [-AllowDefer <Boolean>] [-DeferTimes <Int32>] [-CheckDiskSpace <Boolean>] [-PersistPrompt <Boolean>] [-MinimizeWindows <Boolean>] [-ErrorAction <ActionPreference>]',
      parameters: [
        {
          name: 'CloseApps',
          type: 'String[]',
          description: 'List of application names to check for and close.',
          isCritical: true
        },
        {
          name: 'CloseAppsCountdown',
          type: 'Int32',
          description: 'Countdown time in seconds before applications are automatically closed.',
          isCritical: true
        },
        {
          name: 'AllowDefer',
          type: 'Boolean',
          description: 'Allows the user to defer the installation.'
        },
        {
          name: 'DeferTimes',
          type: 'Int32',
          description: 'Number of times the user can defer the installation.',
          isCritical: true
        },
        {
          name: 'CheckDiskSpace',
          type: 'Boolean',
          description: 'Checks for available disk space before installation.',
          isCritical: true
        },
        {
          name: 'PersistPrompt',
          type: 'Boolean',
          description: 'Keep the prompt visible even after execution.',
          isCritical: true
        },
        {
          name: 'MinimizeWindows',
          type: 'Boolean',
          description: 'Minimizes all windows before displaying the prompt.'
        },
        {
          name: 'ErrorAction',
          type: 'ActionPreference',
          description: "Specifies how the cmdlet responds when an error occurs. Options: 'SilentlyContinue','Stop','Continue','Inquire','Ignore','Suspend'."
        }
      ],
      examples: [
        {
          code: "Show-ADTInstallationWelcome -CloseApps 'iexplore,firefox,chrome' -CloseAppsCountdown 60 -AllowDefer -DeferTimes 3 -CheckDiskSpace"
        }
      ]
    },
    {
      commandName: 'Execute-ADTProcess',
      description: 'Executes a process with appropriate error handling and logging.',
      syntax: 'Execute-ADTProcess [-Path] <String> [[-Parameters] <String>] [-WindowStyle <String>] [-CreateNoWindow <Boolean>] [-WorkingDirectory <String>] [-NoWait <Boolean>] [-PassThru <Boolean>] [-IgnoreExitCodes <String[]>] [-ErrorAction <ActionPreference>]',
      parameters: [
        {
          name: 'Path',
          type: 'String',
          description: 'Path to the executable.',
          isRequired: true,
          position: 1
        },
        {
          name: 'Parameters',
          type: 'String',
          description: 'Arguments to pass to the executable.',
          position: 2
        },
        {
          name: 'WindowStyle',
          type: 'String',
          description: "Window style for the process. Options: 'Normal','Hidden','Minimized','Maximized'."
        },
        {
          name: 'CreateNoWindow',
          type: 'Boolean',
          description: 'Creates the process with no window.'
        },
        {
          name: 'WorkingDirectory',
          type: 'String',
          description: 'Working directory for the process.'
        },
        {
          name: 'NoWait',
          type: 'Boolean',
          description: 'Does not wait for the process to complete.'
        },
        {
          name: 'PassThru',
          type: 'Boolean',
          description: 'Returns the process object.'
        },
        {
          name: 'IgnoreExitCodes',
          type: 'String[]',
          description: 'List of exit codes to ignore.'
        },
        {
          name: 'ErrorAction',
          type: 'ActionPreference',
          description: "Specifies how the cmdlet responds when an error occurs. Options: 'SilentlyContinue','Stop','Continue','Inquire','Ignore','Suspend'."
        }
      ],
      examples: [
        {
          code: "Execute-ADTProcess -Path 'setup.exe' -Parameters '/S' -WindowStyle 'Hidden'"
        }
      ]
    },
    {
      commandName: 'Write-ADTLog',
      description: 'Writes a message to the log file and console.',
      syntax: 'Write-ADTLog [-Message] <String> [-Severity <Int32>] [-Source <String>] [-LogFile <String>] [-ErrorAction <ActionPreference>]',
      parameters: [
        {
          name: 'Message',
          type: 'String',
          description: 'The message to log.',
          isRequired: true,
          position: 1
        },
        {
          name: 'Severity',
          type: 'Int32',
          description: 'The severity of the message (1: Information, 2: Warning, 3: Error).'
        },
        {
          name: 'Source',
          type: 'String',
          description: 'The source of the message.'
        },
        {
          name: 'LogFile',
          type: 'String',
          description: 'The path to the log file.'
        },
        {
          name: 'ErrorAction',
          type: 'ActionPreference',
          description: "Specifies how the cmdlet responds when an error occurs. Options: 'SilentlyContinue','Stop','Continue','Inquire','Ignore','Suspend'."
        }
      ],
      examples: [
        {
          code: "Write-ADTLog -Message 'Installation started' -Severity 1 -Source 'Install-Application'"
        }
      ]
    }
  ];
}

// Create documentation source
async function createDocumentationSource() {
  // Creating documentation sources for v3 and v4
  await prisma.psadtDocumentationSource.create({
    data: {
      version: 3,
      sourceUrl: 'https://github.com/PSAppDeployToolkit/PSAppDeployToolkit/wiki',
      fileName: 'Functions.md',
      status: 'success',
      lastUpdated: new Date()
    }
  });
  
  await prisma.psadtDocumentationSource.create({
    data: {
      version: 4,
      sourceUrl: 'https://github.com/PSAppDeployToolkit/PSAppDeployToolkit/wiki/v4',
      fileName: 'Functions.md',
      status: 'success',
      lastUpdated: new Date()
    }
  });
  
  console.log('Created documentation sources');
}

// Run the script
populatePsadtCommands()
  .then(() => {
    console.log('Script completed successfully');
  })
  .catch(error => {
    console.error('Error running script:', error);
    process.exit(1);
  });
