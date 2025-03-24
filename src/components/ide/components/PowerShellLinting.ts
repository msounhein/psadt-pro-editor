/**
 * PowerShell Linting Integration for Monaco Editor
 * 
 * This module integrates PowerShell linting capabilities with the Monaco Editor
 * in the PSADT Pro UI. It provides custom PSADT-specific linting rules and
 * intelligent code assistance using the database-driven documentation API.
 */

// Using dynamic import to ensure this file is only loaded in the browser
import * as monaco from 'monaco-editor';
// Import PSADT documentation API for enhanced documentation support
import psadtDocsApi from '../../../lib/psadt-docs-api';
// Import PowerShellGrammar as a fallback
import { PowerShellGrammar } from './PowerShellGrammar';

// Custom diagnostic severity levels for PSADT-specific rules
const DiagnosticSeverity = {
  Error: 1,
  Warning: 2,
  Information: 3,
  Hint: 4
};

/**
 * Initialize language server capabilities for PowerShell
 * @param {monaco.editor.IStandaloneCodeEditor} editor - Monaco editor instance
 */
export async function initializePowerShellLinting(editor: monaco.editor.IStandaloneCodeEditor) {
  // Safety check for server-side rendering
  if (typeof window === 'undefined') {
    console.warn('[PowerShell Linting] Skipped initialization in server-side context');
    return {
      dispose: () => {}
    };
  }
  
  // Initialize the PSADT documentation API
  try {
    await psadtDocsApi.initialize();
    console.log('[PowerShell Linting] PSADT Documentation API initialized successfully');
  } catch (error) {
    console.warn('[PowerShell Linting] Failed to initialize PSADT Documentation API:', error);
    console.log('[PowerShell Linting] Falling back to static grammar definitions');
  }

  // Get the content of the current model
  const modelContent = editor.getModel()?.getValue() || '';
  
  // Detect PSADT version from script content
  const psadtVersion = psadtDocsApi.initialized 
    ? psadtDocsApi.detectVersion(modelContent) 
    : 3; // Default to v3 if API not initialized
  
  console.log(`[PowerShell Linting] Detected PSADT version: ${psadtVersion}`);

  // Create PSADT-specific linting rules based on documentation API
  const psadtLintingRules = [
    {
      id: 'psadt-deprecated-command',
      name: 'Deprecated PSADT Command',
      description: 'Identifies usage of deprecated PSADT commands',
      severity: DiagnosticSeverity.Warning,
      deprecated: [
        { pattern: 'Execute-MSI', replacement: 'Execute-MSIProcess' },
        { pattern: 'Show-InstallationWelcome', replacement: 'Show-ADTInstallationWelcome' },
        { pattern: 'Show-InstallationProgress', replacement: 'Show-ADTInstallationProgress' }
      ]
    },
    {
      id: 'psadt-parameter-case',
      name: 'PSADT Parameter Case',
      description: 'Ensures PSADT parameter names follow consistent casing',
      severity: DiagnosticSeverity.Information,
      parameters: psadtDocsApi.initialized 
        ? psadtDocsApi.getCriticalParameters() 
        : (PowerShellGrammar.psadtCriticalParameters || [])
    },
    {
      id: 'psadt-missing-diskspace-check',
      name: 'Missing Disk Space Check',
      description: 'Script should include a disk space check for application installations',
      severity: DiagnosticSeverity.Warning,
      pattern: psadtVersion === 3 ? 'Show-InstallationWelcome' : 'Show-ADTInstallationWelcome',
      requiredParam: 'CheckDiskSpace'
    },
    {
      id: 'psadt-log-consistency',
      name: 'Logging Consistency',
      description: 'Ensures consistent use of Write-Log throughout the script',
      severity: DiagnosticSeverity.Information,
      pattern: psadtVersion === 3 ? 'Write-Log' : 'Write-ADTLog'
    },
    {
      id: 'psadt-close-process',
      name: 'Process Closing Parameters',
      description: 'Validates correct usage of process closing parameters',
      severity: DiagnosticSeverity.Warning,
      pattern: '-CloseProcesses'
    },
    {
      id: 'psadt-version-migration',
      name: 'PSADT Version Migration',
      description: 'Suggests migration from v3 to v4 command equivalents',
      severity: DiagnosticSeverity.Information,
      enabled: psadtVersion === 3 && psadtDocsApi.initialized
    }
  ];

  // Configure Monaco editor with version-specific highlighting
  if (psadtDocsApi.initialized) {
    const config = psadtDocsApi.getMonacoConfig(psadtVersion);
    monaco.languages.setMonarchTokensProvider('powershell', config.tokenizer);
    console.log('[PowerShell Linting] Applied PSADT-specific syntax highlighting');
  }

  // Setup model change listener for on-the-fly linting
  const changeListener = editor.onDidChangeModelContent(() => {
    // Re-detect version when content changes
    const newContent = editor.getModel()?.getValue() || '';
    const newVersion = psadtDocsApi.initialized 
      ? psadtDocsApi.detectVersion(newContent) 
      : psadtVersion;
      
    // Update rules if version changed
    if (newVersion !== psadtVersion) {
      console.log(`[PowerShell Linting] PSADT version changed: ${psadtVersion} -> ${newVersion}`);
      // Update version-specific rules
      psadtLintingRules.find(r => r.id === 'psadt-missing-diskspace-check')!.pattern = 
        newVersion === 3 ? 'Show-InstallationWelcome' : 'Show-ADTInstallationWelcome';
      psadtLintingRules.find(r => r.id === 'psadt-log-consistency')!.pattern = 
        newVersion === 3 ? 'Write-Log' : 'Write-ADTLog';
      psadtLintingRules.find(r => r.id === 'psadt-version-migration')!.enabled = 
        newVersion === 3 && psadtDocsApi.initialized;
        
      // Apply updated syntax highlighting
      if (psadtDocsApi.initialized) {
        const newConfig = psadtDocsApi.getMonacoConfig(newVersion);
        monaco.languages.setMonarchTokensProvider('powershell', newConfig.tokenizer);
      }
    }
    
    validatePsadtRules(editor.getModel(), psadtLintingRules, newVersion);
  });

  // Add command completion provider for PowerShell with database-driven suggestions
  const completionDisposable = monaco.languages.registerCompletionItemProvider('powershell', {
    provideCompletionItems: (model, position) => {
      const content = model.getValue();
      const detectedVersion = psadtDocsApi.initialized 
        ? psadtDocsApi.detectVersion(content) 
        : psadtVersion;
        
      return providePsadtCompletionItems(model, position, detectedVersion);
    }
  });

  // Add hover provider for PSADT commands and parameters with enhanced documentation
  const hoverDisposable = monaco.languages.registerHoverProvider('powershell', {
    provideHover: (model, position) => {
      const content = model.getValue();
      const detectedVersion = psadtDocsApi.initialized 
        ? psadtDocsApi.detectVersion(content) 
        : psadtVersion;
        
      return providePsadtHoverInfo(model, position, detectedVersion);
    }
  });

  console.log('[PowerShell Linting] Linting initialized successfully');
  
  // Initial validation
  validatePsadtRules(editor.getModel(), psadtLintingRules, psadtVersion);

  // Return disposables for cleanup
  return {
    dispose: () => {
      changeListener.dispose();
      completionDisposable.dispose();
      hoverDisposable.dispose();
    }
  };
}

/**
 * Validate PSADT-specific rules on the given model
 * @param {monaco.editor.ITextModel | null} model - Monaco text model
 * @param {Array} psadtLintingRules - Linting rules to apply
 * @param {number} version - PSADT version (3 or 4)
 * @returns {Array} - Array of diagnostic markers
 */
function validatePsadtRules(model: monaco.editor.ITextModel | null, psadtLintingRules: any[], version: number = 3) {
  if (!model) return [];
  
  const content = model.getValue();
  const diagnostics: monaco.editor.IMarkerData[] = [];

  // Process each linting rule
  for (const rule of psadtLintingRules) {
    // Skip disabled rules
    if (rule.hasOwnProperty('enabled') && !rule.enabled) continue;
    
    switch (rule.id) {
      case 'psadt-deprecated-command':
        // Check for deprecated commands
        for (const item of rule.deprecated) {
          const matches = findAllMatches(content, new RegExp(`\\b${item.pattern}\\b`, 'g'));
          for (const match of matches) {
            const startPos = model.getPositionAt(match.index);
            const endPos = model.getPositionAt(match.index + match[0].length);
            
            diagnostics.push({
              severity: rule.severity,
              message: `'${match[0]}' is deprecated. Use '${item.replacement}' instead.`,
              startLineNumber: startPos.lineNumber,
              startColumn: startPos.column,
              endLineNumber: endPos.lineNumber,
              endColumn: endPos.column,
              source: 'PSADT Linter',
              code: rule.id
            });
          }
        }
        break;
        
      case 'psadt-missing-diskspace-check':
        // Check if installation welcome is used without disk space check
        const welcomeMatches = findAllMatches(content, new RegExp(`\\b${rule.pattern}\\b.+`, 'g'));
        for (const match of welcomeMatches) {
          if (!match[0].includes(rule.requiredParam)) {
            const startPos = model.getPositionAt(match.index);
            const endPos = model.getPositionAt(match.index + (match[0].indexOf('\n') > 0 ? match[0].indexOf('\n') : match[0].length));
            
            diagnostics.push({
              severity: rule.severity,
              message: `Installation welcome should include ${rule.requiredParam} parameter for reliable deployment.`,
              startLineNumber: startPos.lineNumber,
              startColumn: startPos.column,
              endLineNumber: endPos.lineNumber,
              endColumn: endPos.column,
              source: 'PSADT Linter',
              code: rule.id
            });
          }
        }
        break;
        
      case 'psadt-log-consistency':
        // Check for consistent use of Write-Log
        if (content.includes(rule.pattern)) {
          // Different patterns based on version
          const consoleWritePattern = version === 3 
            ? /\b(Write-Host|Write-Output|Write-Verbose)\b/g
            : /\b(Write-Host|Write-Output|Write-Verbose|Write-Log)\b/g;
            
          const consoleWriteMatches = findAllMatches(content, consoleWritePattern);
          for (const match of consoleWriteMatches) {
            const startPos = model.getPositionAt(match.index);
            const endPos = model.getPositionAt(match.index + match[0].length);
            
            const suggestion = version === 3 ? 'Write-Log' : 'Write-ADTLog';
            
            diagnostics.push({
              severity: rule.severity,
              message: `Consider using ${suggestion} instead of ${match[0]} for consistent logging.`,
              startLineNumber: startPos.lineNumber,
              startColumn: startPos.column,
              endLineNumber: endPos.lineNumber,
              endColumn: endPos.column,
              source: 'PSADT Linter',
              code: rule.id
            });
          }
        }
        break;
        
      case 'psadt-version-migration':
        // Only applicable for v3 scripts
        if (version === 3 && psadtDocsApi.initialized) {
          // Get v3 commands from the API
          const v3Commands = psadtDocsApi.getCommands(3);
          
          // For each command that has a v4 equivalent
          for (const cmd of v3Commands) {
            // Check if this command has a v4 equivalent
            const v4Equivalent = psadtDocsApi.getEquivalentCommand(cmd.command_name, 3);
            if (v4Equivalent) {
              const regex = new RegExp(`\\b${cmd.command_name}\\b`, 'g');
              const matches = findAllMatches(content, regex);
              
              for (const match of matches) {
                const startPos = model.getPositionAt(match.index);
                const endPos = model.getPositionAt(match.index + match[0].length);
                
                diagnostics.push({
                  severity: rule.severity,
                  message: `In PSADT v4, this command is called '${v4Equivalent.command_name}'`,
                  startLineNumber: startPos.lineNumber,
                  startColumn: startPos.column,
                  endLineNumber: endPos.lineNumber,
                  endColumn: endPos.column,
                  source: 'PSADT Linter',
                  code: rule.id
                });
              }
            }
          }
        }
        break;
    }
  }

  // Set the diagnostics markers on the model
  monaco.editor.setModelMarkers(model, 'powershell', diagnostics);
  
  return diagnostics;
}

/**
 * Find all matches of a regular expression in a string
 * @param {string} content - The content to search in
 * @param {RegExp} regex - The regular expression to search for
 * @returns {Array} - Array of match objects
 */
function findAllMatches(content: string, regex: RegExp): Array<any> {
  const matches = [];
  let match;
  
  // Reset the regex to start from the beginning
  regex.lastIndex = 0;
  
  while ((match = regex.exec(content)) !== null) {
    matches.push({
      index: match.index,
      0: match[0],
      length: match[0].length
    });
  }
  
  return matches;
}

/**
 * Provide completion items for PSADT commands and parameters
 * @param {monaco.editor.ITextModel} model - Monaco text model
 * @param {monaco.Position} position - The position in the document
 * @param {number} version - PSADT version (3 or 4)
 * @returns {monaco.languages.CompletionList} - Completion list
 */
function providePsadtCompletionItems(model: monaco.editor.ITextModel, position: monaco.Position, version: number = 3): monaco.languages.CompletionList {
  const textUntilPosition = model.getValueInRange({
    startLineNumber: position.lineNumber,
    startColumn: 1,
    endLineNumber: position.lineNumber,
    endColumn: position.column
  });

  // Check if we're working with a parameter (starts with -)
  const paramMatch = textUntilPosition.match(/\s-([A-Za-z]*)$/);
  if (paramMatch) {
    // Check if there's a command before the parameter
    const commandMatch = textUntilPosition.match(/\b([A-Za-z]+-[A-Za-z]+).*\s-[A-Za-z]*$/);
    if (commandMatch && commandMatch[1]) {
      return {
        suggestions: createParameterCompletionItems(paramMatch[1], commandMatch[1], position, version)
      };
    } 
    return {
      suggestions: createParameterCompletionItems(paramMatch[1], null, position, version)
    };
  }

  // Check if we're working with a command
  const commandMatch = textUntilPosition.match(/\b([A-Za-z]+-[A-Za-z]*)$/);
  if (commandMatch) {
    return {
      suggestions: createCommandCompletionItems(commandMatch[1], position, version)
    };
  }

  return { suggestions: [] };
}

/**
 * Create parameter completion items
 * @param {string} prefix - Parameter prefix
 * @param {string|null} commandName - The command name (if available)
 * @param {monaco.Position} position - Position in the document
 * @param {number} version - PSADT version (3 or 4)
 * @returns {Array} - Array of completion items
 */
function createParameterCompletionItems(prefix: string, commandName: string | null, position: monaco.Position, version: number): monaco.languages.CompletionItem[] {
  // If we have the documentation API and a command name, get parameters for that command
  if (psadtDocsApi.initialized && commandName) {
    const command = psadtDocsApi.getCommand(commandName, version);
    
    if (command) {
      return psadtDocsApi.getParameterCompletions(commandName, prefix, version).map(item => ({
        ...item,
        range: {
          startLineNumber: position.lineNumber,
          startColumn: position.column - prefix.length,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        }
      }));
    }
  }
  
  // Fall back to static list from PowerShellGrammar
  const criticalParams = psadtDocsApi.initialized 
    ? psadtDocsApi.getCriticalParameters() 
    : (PowerShellGrammar.psadtCriticalParameters || []);
    
  const regularParams = PowerShellGrammar.psadtRegularParameters || [];
  const allParams = [...criticalParams, ...regularParams];
  
  const filteredParams = allParams.filter(param => 
    param.toLowerCase().startsWith(prefix.toLowerCase())
  );
  
  return filteredParams.map(param => ({
    label: param,
    kind: monaco.languages.CompletionItemKind.Property,
    detail: criticalParams.includes(param) ? 'PSADT Critical Parameter' : 'PSADT Parameter',
    insertText: param,
    documentation: getParameterDocumentation(param),
    range: {
      startLineNumber: position.lineNumber,
      startColumn: position.column - prefix.length,
      endLineNumber: position.lineNumber,
      endColumn: position.column
    }
  }));
}

/**
 * Create command completion items
 * @param {string} prefix - Command prefix
 * @param {monaco.Position} position - Position in the document
 * @param {number} version - PSADT version (3 or 4)
 * @returns {Array} - Array of completion items
 */
function createCommandCompletionItems(prefix: string, position: monaco.Position, version: number): monaco.languages.CompletionItem[] {
  // If documentation API is initialized, use it for commands
  if (psadtDocsApi.initialized) {
    return psadtDocsApi.getCommandCompletions(prefix, version).map(item => ({
      ...item,
      range: {
        startLineNumber: position.lineNumber,
        startColumn: position.column - prefix.length,
        endLineNumber: position.lineNumber,
        endColumn: position.column
      }
    }));
  }
  
  // Fall back to static list from PowerShellGrammar
  const commands = version === 3 
    ? (PowerShellGrammar.psadtCommands || [])
    : (PowerShellGrammar.psadtV4Commands || PowerShellGrammar.psadtCommands || []);
  
  const filteredCommands = commands.filter(cmd => 
    cmd.toLowerCase().startsWith(prefix.toLowerCase())
  );
  
  return filteredCommands.map(cmd => ({
    label: cmd,
    kind: monaco.languages.CompletionItemKind.Function,
    detail: 'PSADT Command',
    insertText: cmd,
    documentation: getCommandDocumentation(cmd, version),
    range: {
      startLineNumber: position.lineNumber,
      startColumn: position.column - prefix.length,
      endLineNumber: position.lineNumber,
      endColumn: position.column
    }
  }));
}

/**
 * Get documentation for a parameter
 * @param {string} parameter - Parameter name
 * @returns {string} - Parameter documentation
 */
function getParameterDocumentation(parameter: string): string {
  // This would ideally come from the parsed documentation
  const paramDocs: Record<string, string> = {
    'CloseProcesses': 'Closes specified processes before installation.',
    'PersistPrompt': 'Keep the prompt visible even after execution.',
    'CheckDiskSpace': 'Checks for sufficient disk space before installation.',
    'DeferTimes': 'Number of times the user can defer the installation.'
    // Add more parameter documentation as needed
  };
  
  return paramDocs[parameter] || `PSADT parameter: ${parameter}`;
}

/**
 * Get documentation for a command
 * @param {string} command - Command name
 * @param {number} version - PSADT version
 * @returns {string} - Command documentation
 */
function getCommandDocumentation(command: string, version: number): string {
  // This would ideally come from the parsed documentation
  const v3CommandDocs: Record<string, string> = {
    'Show-InstallationWelcome': 'Displays a welcome dialog for the installation.',
    'Show-InstallationProgress': 'Shows installation progress dialog.',
    'Execute-Process': 'Executes a process with appropriate error handling.',
    'Test-Battery': 'Tests if the system is currently running on battery power.'
  };
  
  const v4CommandDocs: Record<string, string> = {
    'Show-ADTInstallationWelcome': 'Displays a welcome dialog for the installation.',
    'Show-ADTInstallationProgress': 'Shows installation progress dialog.',
    'Execute-ADTProcess': 'Executes a process with appropriate error handling.',
    'Test-ADTBattery': 'Tests if the system is currently running on battery power.'
  };
  
  const docs = version === 3 ? v3CommandDocs : v4CommandDocs;
  return docs[command] || `PSADT command: ${command}`;
}

/**
 * Provide hover information for PSADT commands and parameters
 * @param {monaco.editor.ITextModel} model - Monaco text model
 * @param {monaco.Position} position - Position in the document
 * @param {number} version - PSADT version (3 or 4)
 * @returns {monaco.languages.Hover | null} - Hover information
 */
function providePsadtHoverInfo(model: monaco.editor.ITextModel, position: monaco.Position, version: number): monaco.languages.Hover | null {
  const word = model.getWordAtPosition(position);
  if (!word) return null;
  
  const lineContent = model.getLineContent(position.lineNumber);
  
  // Check if it's a parameter
  if (lineContent.substring(word.startColumn - 2, word.startColumn) === '-') {
    const parameter = word.word;
    
    // Try to find the command this parameter belongs to
    const cmdMatch = lineContent.match(/\b([A-Za-z]+-[A-Za-z]+)/);
    const commandName = cmdMatch ? cmdMatch[1] : null;
    
    // If documentation API is initialized, use it for parameter hover
    if (psadtDocsApi.initialized) {
      const hoverInfo = psadtDocsApi.getParameterHover(parameter, commandName || '', version);
      if (hoverInfo) {
        return {
          ...hoverInfo,
          range: {
            startLineNumber: position.lineNumber,
            startColumn: word.startColumn - 1, // Include the dash
            endLineNumber: position.lineNumber,
            endColumn: word.endColumn
          }
        };
      }
    }
    
    // Fall back to static documentation
    const documentation = getParameterDocumentation(parameter);
    
    return {
      contents: [
        { value: `**${parameter}**` },
        { value: documentation }
      ],
      range: {
        startLineNumber: position.lineNumber,
        startColumn: word.startColumn - 1, // Include the dash
        endLineNumber: position.lineNumber,
        endColumn: word.endColumn
      }
    };
  }
  
  // Check if it's a command
  // If documentation API is initialized, use it for command hover
  if (psadtDocsApi.initialized) {
    const hoverInfo = psadtDocsApi.getCommandHover(word.word, version);
    if (hoverInfo) {
      return {
        ...hoverInfo,
        range: {
          startLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endLineNumber: position.lineNumber,
          endColumn: word.endColumn
        }
      };
    }
  }
  
  // Fall back to static command list
  const commands = version === 3 
    ? (PowerShellGrammar.psadtCommands || [])
    : (PowerShellGrammar.psadtV4Commands || PowerShellGrammar.psadtCommands || []);
    
  const matchedCommand = commands.find(cmd => cmd === word.word || lineContent.includes(cmd));
  
  if (matchedCommand) {
    const documentation = getCommandDocumentation(matchedCommand, version);
    
    return {
      contents: [
        { value: `**${matchedCommand}**` },
        { value: documentation }
      ],
      range: {
        startLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endLineNumber: position.lineNumber,
        endColumn: word.endColumn
      }
    };
  }
  
  return null;
}
