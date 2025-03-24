/**
 * PSADT Documentation API
 * 
 * This module provides client-side access to the PSADT documentation
 * for syntax highlighting, code completion, and linting in the Monaco editor.
 */

class PsadtDocsApi {
  constructor() {
    this.data = null;
    this.initialized = false;
    this.loading = false;
    this.commandsCache = {
      v3: new Map(),
      v4: new Map()
    };
    this.criticalParameters = new Set();
  }

  /**
   * Initialize the API by loading documentation data
   * @returns {Promise} Resolves when initialization is complete
   */
  async initialize() {
    if (this.initialized || this.loading) {
      return this.initialized;
    }

    this.loading = true;

    try {
      const response = await fetch('/api/psadt-docs');
      if (!response.ok) {
        throw new Error(`Failed to load PSADT documentation: ${response.status} ${response.statusText}`);
      }

      this.data = await response.json();
      this.populateCaches();
      this.initialized = true;
    } catch (error) {
      console.error('Error initializing PSADT documentation API:', error);
      throw error;
    } finally {
      this.loading = false;
    }

    return this.initialized;
  }

  /**
   * Populate caches for faster access
   */
  populateCaches() {
    // Cache commands by version
    this.data.commands.forEach(cmd => {
      if (cmd.version === 3) {
        this.commandsCache.v3.set(cmd.command_name, cmd);
      } else if (cmd.version === 4) {
        this.commandsCache.v4.set(cmd.command_name, cmd);
      }
    });

    // Cache critical parameters
    this.data.criticalParams.forEach(param => {
      this.criticalParameters.add(param.param_name);
    });
  }

  /**
   * Get all commands for a specific version
   * @param {number} version - PSADT version (3 or 4)
   * @returns {Array} Array of command objects
   */
  getCommands(version) {
    if (!this.initialized) {
      throw new Error('PSADT documentation API not initialized');
    }

    return this.data.commands.filter(cmd => cmd.version === version);
  }

  /**
   * Get a specific command by name and version
   * @param {string} commandName - Command name
   * @param {number} version - PSADT version (3 or 4)
   * @returns {Object|null} Command object or null if not found
   */
  getCommand(commandName, version) {
    if (!this.initialized) {
      throw new Error('PSADT documentation API not initialized');
    }

    const cache = version === 3 ? this.commandsCache.v3 : this.commandsCache.v4;
    return cache.get(commandName) || null;
  }

  /**
   * Get parameters for a specific command
   * @param {number} commandId - Command ID
   * @returns {Array} Array of parameter objects
   */
  getParameters(commandId) {
    if (!this.initialized) {
      throw new Error('PSADT documentation API not initialized');
    }

    return this.data.parameters.filter(param => param.command_id === commandId);
  }

  /**
   * Get the equivalent command in the other version
   * @param {string} commandName - Command name
   * @param {number} version - Source PSADT version (3 or 4)
   * @returns {Object|null} Equivalent command or null if not found
   */
  getEquivalentCommand(commandName, version) {
    if (!this.initialized) {
      throw new Error('PSADT documentation API not initialized');
    }

    const mapping = this.data.v3tov4Mappings.find(m => 
      version === 3 ? m.v3_command === commandName : m.v4_command === commandName
    );

    if (!mapping) {
      return null;
    }

    const targetVersion = version === 3 ? 4 : 3;
    const targetName = version === 3 ? mapping.v4_command : mapping.v3_command;
    return this.getCommand(targetName, targetVersion);
  }

  /**
   * Check if a parameter is critical
   * @param {string} paramName - Parameter name
   * @returns {boolean} True if parameter is critical
   */
  isParameterCritical(paramName) {
    if (!this.initialized) {
      throw new Error('PSADT documentation API not initialized');
    }

    return this.criticalParameters.has(paramName);
  }

  /**
   * Get all critical parameters
   * @returns {Array} Array of critical parameter names
   */
  getCriticalParameters() {
    if (!this.initialized) {
      throw new Error('PSADT documentation API not initialized');
    }

    return [...this.criticalParameters];
  }

  /**
   * Detect PSADT version from script content
   * @param {string} scriptContent - Script content
   * @returns {number} Detected version (3 or 4)
   */
  detectVersion(scriptContent) {
    if (!this.initialized) {
      throw new Error('PSADT documentation API not initialized');
    }

    // Check for v4-specific commands (with ADT prefix)
    const v4CommandRegex = /\b(Add|Block|Close|Complete|Convert|ConvertTo|Copy|Disable|Dismount|Enable|Export|Get|Initialize|Install|Invoke|Mount|New|Open|Out|Register|Remove|Reset|Resolve|Send|Set|Show|Start|Stop|Test|Unblock|Uninstall)-ADT/i;
    
    // Check for v3-specific import or dot-sourcing
    const v3ImportRegex = /\.\s*(?:["'])?(?:.*AppDeployToolkitMain\.ps1)(?:["'])?/i;
    
    if (v4CommandRegex.test(scriptContent)) {
      return 4;
    } else if (v3ImportRegex.test(scriptContent)) {
      return 3;
    }
    
    // Default to v3 if can't determine (more common in existing scripts)
    return 3;
  }

  /**
   * Get completion items for PowerShell commands
   * @param {string} prefix - Command prefix
   * @param {number} version - PSADT version (3 or 4)
   * @returns {Array} Array of completion items
   */
  getCommandCompletions(prefix, version) {
    if (!this.initialized) {
      throw new Error('PSADT documentation API not initialized');
    }

    const commands = this.getCommands(version);
    
    // Filter commands by prefix
    return commands
      .filter(cmd => cmd.command_name.toLowerCase().startsWith(prefix.toLowerCase()))
      .map(cmd => ({
        label: cmd.command_name,
        kind: 'Function',
        detail: cmd.description ? cmd.description.split('\n')[0] : cmd.command_name,
        documentation: {
          value: this.formatCommandDocumentation(cmd),
          isTrusted: true
        },
        insertText: cmd.command_name
      }));
  }

  /**
   * Get completion items for command parameters
   * @param {string} commandName - Command name
   * @param {string} prefix - Parameter prefix
   * @param {number} version - PSADT version (3 or 4)
   * @returns {Array} Array of completion items
   */
  getParameterCompletions(commandName, prefix, version) {
    if (!this.initialized) {
      throw new Error('PSADT documentation API not initialized');
    }

    const command = this.getCommand(commandName, version);
    if (!command) {
      return [];
    }

    const parameters = this.getParameters(command.id);
    
    // Filter parameters by prefix
    return parameters
      .filter(param => param.param_name.toLowerCase().startsWith(prefix.toLowerCase()))
      .map(param => ({
        label: param.param_name,
        kind: 'Property',
        detail: this.isParameterCritical(param.param_name) 
          ? '🔴 Critical Parameter' 
          : param.is_required 
            ? '⚠️ Required Parameter' 
            : 'Parameter',
        documentation: {
          value: this.formatParameterDocumentation(param),
          isTrusted: true
        },
        insertText: param.param_name
      }));
  }

  /**
   * Format command documentation for display
   * @param {Object} command - Command object
   * @returns {string} Formatted documentation
   */
  formatCommandDocumentation(command) {
    let doc = `## ${command.command_name}\n\n`;
    
    if (command.description) {
      doc += `${command.description}\n\n`;
    }
    
    if (command.syntax) {
      doc += `### Syntax\n\`\`\`powershell\n${command.syntax}\n\`\`\`\n\n`;
    }
    
    // If there's an equivalent command in the other version, add a note
    const otherVersion = command.version === 3 ? 4 : 3;
    const equivalentCommand = this.getEquivalentCommand(command.command_name, command.version);
    
    if (equivalentCommand) {
      doc += `> **Note**: In PSADT v${otherVersion}, this command is called \`${equivalentCommand.command_name}\`.\n\n`;
    }
    
    return doc;
  }

  /**
   * Format parameter documentation for display
   * @param {Object} param - Parameter object
   * @returns {string} Formatted documentation
   */
  formatParameterDocumentation(param) {
    let doc = `## -${param.param_name}\n\n`;
    
    if (param.description) {
      doc += `${param.description}\n\n`;
    }
    
    if (param.param_type) {
      doc += `**Type**: ${param.param_type}\n\n`;
    }
    
    if (param.is_required) {
      doc += `**Required**: Yes\n\n`;
    }
    
    if (this.isParameterCritical(param.param_name)) {
      doc += `**Critical**: This is a critical PSADT parameter that affects important functionality.\n\n`;
    }
    
    if (param.default_value) {
      doc += `**Default**: ${param.default_value}\n\n`;
    }
    
    return doc;
  }

  /**
   * Get hover information for a command
   * @param {string} commandName - Command name
   * @param {number} version - PSADT version (3 or 4)
   * @returns {Object|null} Hover information or null if not found
   */
  getCommandHover(commandName, version) {
    if (!this.initialized) {
      throw new Error('PSADT documentation API not initialized');
    }

    const command = this.getCommand(commandName, version);
    if (!command) {
      return null;
    }

    return {
      contents: [
        { value: this.formatCommandDocumentation(command) }
      ]
    };
  }

  /**
   * Get hover information for a parameter
   * @param {string} paramName - Parameter name
   * @param {string} commandName - Command name (optional)
   * @param {number} version - PSADT version (3 or 4)
   * @returns {Object|null} Hover information or null if not found
   */
  getParameterHover(paramName, commandName, version) {
    if (!this.initialized) {
      throw new Error('PSADT documentation API not initialized');
    }

    // If command name is provided, look for parameter in that command
    if (commandName) {
      const command = this.getCommand(commandName, version);
      if (command) {
        const parameters = this.getParameters(command.id);
        const param = parameters.find(p => p.param_name === paramName);
        
        if (param) {
          return {
            contents: [
              { value: this.formatParameterDocumentation(param) }
            ]
          };
        }
      }
    }

    // If command name not provided or parameter not found in that command,
    // check if it's a critical parameter
    if (this.isParameterCritical(paramName)) {
      return {
        contents: [
          { value: `## -${paramName}\n\n**Critical**: This is a critical PSADT parameter that affects important functionality.\n\n` }
        ]
      };
    }

    // Parameter not found
    return null;
  }

  /**
   * Get diagnostic issues for a script
   * @param {string} scriptContent - Script content
   * @param {number} version - PSADT version (3 or 4, or null to auto-detect)
   * @returns {Array} Array of diagnostic issues
   */
  getDiagnostics(scriptContent, version = null) {
    if (!this.initialized) {
      throw new Error('PSADT documentation API not initialized');
    }

    // Auto-detect version if not provided
    if (!version) {
      version = this.detectVersion(scriptContent);
    }

    const diagnostics = [];

    // Check for deprecated commands (v3 to v4 migration)
    if (version === 3) {
      const v3Commands = Array.from(this.commandsCache.v3.keys());
      
      for (const commandName of v3Commands) {
        const regex = new RegExp(`\\b${commandName}\\b`, 'g');
        let match;
        
        while ((match = regex.exec(scriptContent)) !== null) {
          const equivalentCommand = this.getEquivalentCommand(commandName, 3);
          
          if (equivalentCommand) {
            diagnostics.push({
              severity: 'Information',
              message: `In PSADT v4, this command is called '${equivalentCommand.command_name}'`,
              startLineNumber: this.getLineNumber(scriptContent, match.index),
              startColumn: this.getColumn(scriptContent, match.index),
              endLineNumber: this.getLineNumber(scriptContent, match.index + commandName.length),
              endColumn: this.getColumn(scriptContent, match.index + commandName.length),
              source: 'PSADT Linter',
              code: 'psadt-v4-equivalent'
            });
          }
        }
      }
    }

    // Check for Show-InstallationWelcome without CheckDiskSpace parameter
    const welcomeRegex = version === 3 
      ? /\bShow-InstallationWelcome\b(?:(?!-CheckDiskSpace).)*$/gm
      : /\bShow-ADTInstallationWelcome\b(?:(?!-CheckDiskSpace).)*$/gm;
      
    let match;
    while ((match = welcomeRegex.exec(scriptContent)) !== null) {
      // Only flag if it's a complete command (ends with newline or is at end of file)
      if (match[0].endsWith('\n') || match.index + match[0].length === scriptContent.length) {
        diagnostics.push({
          severity: 'Warning',
          message: 'Installation welcome should include -CheckDiskSpace parameter for reliable deployment',
          startLineNumber: this.getLineNumber(scriptContent, match.index),
          startColumn: this.getColumn(scriptContent, match.index),
          endLineNumber: this.getLineNumber(scriptContent, match.index + match[0].length),
          endColumn: this.getColumn(scriptContent, match.index + match[0].length),
          source: 'PSADT Linter',
          code: 'psadt-missing-diskspace-check'
        });
      }
    }

    // Check for consistent logging (Write-Log vs Write-Host, etc.)
    if (scriptContent.includes('Write-Log')) {
      const consoleWriteRegex = /\b(Write-Host|Write-Output|Write-Verbose)\b/g;
      
      while ((match = consoleWriteRegex.exec(scriptContent)) !== null) {
        diagnostics.push({
          severity: 'Information',
          message: `Consider using Write-Log instead of ${match[1]} for consistent logging`,
          startLineNumber: this.getLineNumber(scriptContent, match.index),
          startColumn: this.getColumn(scriptContent, match.index),
          endLineNumber: this.getLineNumber(scriptContent, match.index + match[1].length),
          endColumn: this.getColumn(scriptContent, match.index + match[1].length),
          source: 'PSADT Linter',
          code: 'psadt-log-consistency'
        });
      }
    }

    return diagnostics;
  }

  /**
   * Get line number for a position in text
   * @param {string} text - Text content
   * @param {number} position - Character position
   * @returns {number} Line number (1-based)
   */
  getLineNumber(text, position) {
    const lines = text.substring(0, position).split('\n');
    return lines.length;
  }

  /**
   * Get column number for a position in text
   * @param {string} text - Text content
   * @param {number} position - Character position
   * @returns {number} Column number (1-based)
   */
  getColumn(text, position) {
    const lines = text.substring(0, position).split('\n');
    return lines[lines.length - 1].length + 1;
  }

  /**
   * Get Monaco editor configuration for PSADT syntax highlighting
   * @param {number} version - PSADT version (3 or 4)
   * @returns {Object} Monaco configuration object
   */
  getMonacoConfig(version) {
    if (!this.initialized) {
      throw new Error('PSADT documentation API not initialized');
    }

    // Get critical parameters for highlighting
    const criticalParams = this.getCriticalParameters();
    
    // Get commands for this version
    const commands = this.getCommands(version);
    
    // Get command prefixes for regex pattern
    const commandPrefixes = [];
    for (const cmd of commands) {
      const parts = cmd.command_name.split('-');
      if (parts.length >= 2) {
        // Extract first two parts for pattern (e.g., "Show-ADT" from "Show-ADTInstallationWelcome")
        const prefix = parts.slice(0, 2).join('-');
        if (!commandPrefixes.includes(prefix)) {
          commandPrefixes.push(prefix);
        }
      }
    }
    
    // PowerShell verbs (with priority for highlighting)
    const priorityVerbs = [
      'Add', 'Block', 'Close', 'Complete', 'Convert', 'ConvertTo', 'Copy',
      'Disable', 'Dismount', 'Enable', 'Export', 'Get', 'Initialize',
      'Install', 'Invoke', 'Mount', 'New', 'Open', 'Out', 'Register',
      'Remove', 'Reset', 'Resolve', 'Send', 'Set', 'Show', 'Start',
      'Stop', 'Test', 'Unblock', 'Uninstall'
    ];
    
    const secondaryVerbs = [
      'Clear', 'Enter', 'Exit', 'Find', 'Format', 'Hide', 'Join',
      'Lock', 'Move', 'Optimize', 'Pop', 'Push', 'Redo', 'Rename',
      'Resize', 'Search', 'Select', 'Skip', 'Split', 'Step', 'Switch',
      'Sync', 'Trace', 'Undo', 'Unlock', 'Watch', 'Write', 'Wait',
      'Use', 'Import'
    ];
    
    // Build configuration for Monaco editor
    return {
      tokenizer: {
        root: [
          // PSADT Commands with highest priority
          [new RegExp(`\\b(${commandPrefixes.join('|')})\\w+\\b`), 'psadt.command'],
          
          // PowerShell variable with $ prefix
          [/\$[\w]+/, 'variable'],
          
          // PSADT Critical Parameters with dash prefix
          [new RegExp(`\\s-(${criticalParams.join('|')})\\b`), 'psadt.parameter.critical'],
          
          // Regular PowerShell parameters with dash prefix
          [/\s-([A-Za-z][\w]+)\b/, 'parameter.powershell'],
          
          // PowerShell parameter values with numbers
          [/(\s-[A-Za-z][\w]+)(\s+)(\d+)\b/, ['parameter.powershell', '', 'number.psadt']],
          
          // Comments - single line and block
          [/#.*$/, 'comment'],
          [/<#/, { token: 'comment', next: '@commentBlock' }],
          
          // Type declarations with brackets
          [/\[.*?\]/, 'type'],
          
          // PowerShell special variables
          [/\$(PSScriptRoot|PSCommandPath|_|args|input|MyInvocation)\b/, 'variable'],
          
          // Control keywords
          [/\b(if|else|elseif|switch|foreach|for|while|do|until|break|continue|return|try|catch|finally|throw)\b/i, 'keyword'],
          
          // Declaration keywords
          [/\b(function|param|begin|process|end|dynamicparam|class|enum|filter|configuration|data|assembly)\b/i, 'keyword'],
          
          // PowerShell specific keywords
          [/\b(using|namespace|module|requires|import|export)\b/i, 'keyword'],
          
          // PowerShell cmdlets - prioritized verb list
          [new RegExp(`\\b(${priorityVerbs.join('|')})\\b`, 'i'), {
            token: 'verb.powershell.priority'
          }],
          
          // Other PowerShell verbs - secondary priority
          [new RegExp(`\\b(${secondaryVerbs.join('|')})\\b`, 'i'), {
            token: 'verb.powershell'
          }],
          
          // Complete cmdlet pattern (verb-noun)
          [new RegExp(`\\b(${[...priorityVerbs, ...secondaryVerbs].join('|')})-(\\w+)\\b`, 'i'), 'function'],
          
          // Strings with variables in them
          [/"(?:[^"$]|\$[^{]|\${\w+})*"/, 'string'],
          [/'[^']*'/, 'string'],
          
          // Numeric literals
          [/\b\d+\b/, 'number'],
          
          // Special PSADT markup
          [/##\s+MARK:.*$/, 'markup.heading'],
          [/##=+$/, 'markup.heading'],
        ],
        commentBlock: [
          [/#>/, { token: 'comment', next: '@pop' }],
          [/./, 'comment']
        ]
      }
    };
  }
}

// Export singleton instance
const psadtDocsApi = new PsadtDocsApi();
export default psadtDocsApi;
