/**
 * PSADT Documentation Parser
 * 
 * This script is designed to automatically extract PSADT commands and parameters
 * from the documentation to generate a comprehensive syntax highlighting ruleset.
 * 
 * Features:
 * - Automatically fetches PSADT documentation from GitHub or local sources
 * - Parses command definitions, parameters, and usage patterns
 * - Generates Monaco Editor syntax highlighting rules
 * - Updates the PowerShellGrammar.ts file with new commands
 * - Provides a validation report of commands found vs. implemented
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

// Configuration
const config = {
  // Source options: 'github', 'local'
  source: 'github',
  // GitHub repository information
  github: {
    // PSADT documentation repository
    repo: 'PSAppDeployToolkit/PSAppDeployToolkit',
    // Path to the documentation within the repository
    docsPath: 'wiki',
    // File names or patterns for the function documentation pages
    functionPages: [
      'Functions.md',
      'Functions-*'
    ],
  },
  // Local file paths (if using local documentation)
  local: {
    // Directory containing documentation files
    docsDir: './docs/psadt',
    // Patterns for function documentation files
    functionPatterns: [
      'Functions.md',
      'Functions-*.md'
    ]
  },
  // Output configuration
  output: {
    // Path to output the generated grammar file
    grammarPath: './src/components/ide/components/PowerShellGrammar.ts',
    // Generate a JSON file with all extracted commands and parameters
    commandsJsonPath: './docs/psadt-commands.json',
    // Generate a report of missing or new commands
    reportPath: './docs/psadt-command-report.md'
  }
};

/**
 * Fetches documentation content from GitHub
 */
async function fetchGitHubDocumentation() {
  console.log('Fetching documentation from GitHub...');
  
  const repo = config.github.repo;
  const docsPath = config.github.docsPath;
  const functionPages = config.github.functionPages;
  
  const docs = [];
  
  // GitHub API URL for repository contents
  const apiUrl = `https://api.github.com/repos/${repo}/contents/${docsPath}`;
  
  try {
    const response = await fetch(apiUrl);
    const contents = await response.json();
    
    // Find documentation files that match patterns
    const docFiles = contents.filter(item => {
      if (item.type !== 'file') return false;
      
      // Check if file matches any of the patterns
      return functionPages.some(pattern => {
        if (pattern.includes('*')) {
          const regex = new RegExp(pattern.replace('*', '.*'));
          return regex.test(item.name);
        }
        return item.name === pattern;
      });
    });
    
    // Fetch content of each documentation file
    for (const file of docFiles) {
      console.log(`Fetching ${file.name}...`);
      const contentResponse = await fetch(file.download_url);
      const content = await contentResponse.text();
      
      docs.push({
        name: file.name,
        content
      });
    }
    
    return docs;
  } catch (error) {
    console.error('Error fetching documentation from GitHub:', error);
    throw error;
  }
}

/**
 * Reads documentation from local files
 */
function readLocalDocumentation() {
  console.log('Reading documentation from local files...');
  
  const docsDir = config.local.docsDir;
  const functionPatterns = config.local.functionPatterns;
  
  const docs = [];
  
  try {
    // Ensure the directory exists
    if (!fs.existsSync(docsDir)) {
      throw new Error(`Documentation directory does not exist: ${docsDir}`);
    }
    
    // Get all files in the directory
    const files = fs.readdirSync(docsDir);
    
    // Filter files that match patterns
    const docFiles = files.filter(fileName => {
      return functionPatterns.some(pattern => {
        if (pattern.includes('*')) {
          const regex = new RegExp(pattern.replace('*', '.*'));
          return regex.test(fileName);
        }
        return fileName === pattern;
      });
    });
    
    // Read content of each documentation file
    for (const fileName of docFiles) {
      console.log(`Reading ${fileName}...`);
      const filePath = path.join(docsDir, fileName);
      const content = fs.readFileSync(filePath, 'utf8');
      
      docs.push({
        name: fileName,
        content
      });
    }
    
    return docs;
  } catch (error) {
    console.error('Error reading local documentation:', error);
    throw error;
  }
}

/**
 * Parse documentation content to extract PSADT commands and parameters
 */
function parseDocumentation(docs) {
  console.log('Parsing documentation...');
  
  const commands = [];
  const parameters = [];
  const parameterDescriptions = {};
  
  // Regular expressions for extracting information
  const functionRegex = /## (?:Function: )?([\w-]+)/g;
  const parameterRegex = /^\s*\|-+\|([-\w]+)\|/gm;
  const codeBlockRegex = /```powershell([\s\S]*?)```/g;
  const syntaxRegex = /## Syntax\s+([\s\S]*?)(?:## Parameters|## Description|## Return Value|## Example|$)/;
  
  // Process each documentation file
  for (const doc of docs) {
    console.log(`Parsing ${doc.name}...`);
    
    // Extract function names
    let match;
    while ((match = functionRegex.exec(doc.content)) !== null) {
      const functionName = match[1].trim();
      if (functionName && !commands.includes(functionName)) {
        commands.push(functionName);
      }
    }
    
    // Extract parameters from parameter tables
    while ((match = parameterRegex.exec(doc.content)) !== null) {
      const paramName = match[1].trim();
      if (paramName && !parameters.includes(paramName) && !paramName.includes('-')) {
        parameters.push(paramName);
      }
    }
    
    // Extract parameters from code examples
    while ((match = codeBlockRegex.exec(doc.content)) !== null) {
      const codeBlock = match[1];
      const paramMatches = codeBlock.match(/-([a-zA-Z][\w]+)\b/g);
      
      if (paramMatches) {
        for (const paramMatch of paramMatches) {
          const paramName = paramMatch.substring(1); // Remove the leading dash
          if (paramName && !parameters.includes(paramName)) {
            parameters.push(paramName);
          }
        }
      }
    }
    
    // Extract syntax blocks to find parameter descriptions
    const syntaxMatch = syntaxRegex.exec(doc.content);
    if (syntaxMatch) {
      const syntaxBlock = syntaxMatch[1];
      const paramLines = syntaxBlock.split('\n');
      
      for (const line of paramLines) {
        const paramDescMatch = line.match(/-([a-zA-Z][\w]+)\b\s*<([^>]+)>/);
        if (paramDescMatch) {
          const paramName = paramDescMatch[1];
          const paramType = paramDescMatch[2];
          
          if (paramName && !parameterDescriptions[paramName]) {
            parameterDescriptions[paramName] = paramType;
          }
        }
      }
    }
  }
  
  // Sort the lists for readability
  commands.sort();
  parameters.sort();
  
  // Categorize parameters by importance
  const criticalParameters = parameters.filter(param => 
    ['CloseProcesses', 'PersistPrompt', 'CheckDiskSpace', 'DeferTimes', 'CloseAppsCountdown'].includes(param)
  );
  
  const regularParameters = parameters.filter(param => !criticalParameters.includes(param));
  
  return {
    commands,
    parameters: {
      critical: criticalParameters,
      regular: regularParameters
    },
    parameterDescriptions
  };
}

/**
 * Generate PowerShell grammar file based on extracted commands
 */
function generateGrammarFile(extractedData) {
  console.log('Generating PowerShell grammar file...');
  
  const { commands, parameters } = extractedData;
  
  // Convert commands to command prefixes
  const commandPrefixes = [...new Set(
    commands.map(cmd => {
      // Extract prefix pattern (like Show-ADT, Test-ADT, etc.)
      const parts = cmd.split('-');
      if (parts.length >= 2) {
        return `${parts[0]}-${parts[1].substring(0, 3)}`;
      }
      return parts[0];
    })
  )].sort();
  
  // Prepare command strings for the grammar
  const commandStrings = commands.map(cmd => `'${cmd}'`).join(', ');
  
  // Prepare critical parameter string
  const criticalParamStrings = parameters.critical.map(param => `'${param}'`).join('|');
  
  // Template for PowerShellGrammar.ts
  const grammarTemplate = `// Enhanced PowerShell Grammar with specific highlighting for PSADT commands
// Auto-generated from documentation - DO NOT EDIT DIRECTLY

export const PowerShellGrammar = {
  defaultToken: 'text',
  ignoreCase: true,
  tokenPostfix: '.ps1',

  // Common regular expressions
  brackets: [
    { open: '{', close: '}', token: 'delimiter.curly' },
    { open: '[', close: ']', token: 'delimiter.square' },
    { open: '(', close: ')', token: 'delimiter.parenthesis' },
  ],

  // PowerShell specific keywords
  keywords: [
    'begin', 'break', 'catch', 'class', 'continue', 'data', 'define', 'do', 'dynamicparam', 'else', 'elseif',
    'end', 'enum', 'exit', 'filter', 'finally', 'for', 'foreach', 'from', 'function', 'if', 'in',
    'param', 'process', 'return', 'switch', 'throw', 'trap', 'try', 'until', 'using', 'var', 'while', 'workflow',
  ],

  // Common PowerShell cmdlets (verb-noun pattern) - prioritized list
  verbs: [
    // Priority verbs
    'Add', 'Block', 'Close', 'Complete', 'Convert', 'ConvertTo', 'Copy', 'Disable', 'Dismount',
    'Enable', 'Export', 'Get', 'Initialize', 'Install', 'Invoke', 'Mount', 'New', 'Open',
    'Out', 'Register', 'Remove', 'Reset', 'Resolve', 'Send', 'Set', 'Show', 'Start',
    'Stop', 'Test', 'Unblock', 'Uninstall',
    
    // Other common verbs
    'Clear', 'Enter', 'Exit', 'Find', 'Format', 'Hide', 'Join', 'Lock', 'Move',
    'Optimize', 'Pop', 'Push', 'Redo', 'Rename', 'Resize', 'Search', 'Select',
    'Skip', 'Split', 'Step', 'Switch', 'Sync', 'Trace', 'Undo', 'Unlock',
    'Watch', 'Write', 'Wait', 'Use', 'Import', 'Export',
  ],

  // PSADT specific commands with high visibility
  psadtCommands: [
    ${commandStrings}
  ],

  // PSADT critical parameters
  psadtCriticalParameters: [
    ${parameters.critical.map(p => `'${p}'`).join(',\n    ')}
  ],

  // PSADT regular parameters
  psadtRegularParameters: [
    ${parameters.regular.map(p => `'${p}'`).join(',\n    ')}
  ],

  // Common operators in PowerShell
  operators: [
    '-eq', '-ne', '-gt', '-ge', '-lt', '-le', '-like', '-notlike', '-match', '-notmatch',
    '-contains', '-notcontains', '-in', '-notin', '-is', '-as', '-replace', '-creplace',
    '-ireplace', '-and', '-or', '-not', '-xor', '-band', '-bor', '-bnot', '-bxor',
    '-f', '-join', '-split', '+', '-', '*', '/', '%', '++', '--'
  ],

  // Tokenizer rules
  tokenizer: {
    root: [
      // PSADT Commands with highest priority - auto-generated from documentation
      [/\\b(${commandPrefixes.join('|')})\\w+\\b/, 'psadt.command'],
      
      // PowerShell variable with $ prefix
      [/\\$[\\w]+\\b/, 'variable'],
      
      // PSADT Critical Parameters with dash prefix
      [/\\s-(${criticalParamStrings})\\b/, 'psadt.parameter.critical'],
      
      // Regular PowerShell parameters with dash prefix
      [/\\s-([A-Za-z][\\w]+)\\b/, 'parameter'],
      
      // Parameter values with numbers
      [/\\s-([A-Za-z][\\w]+)(\\s+)(\\d+)\\b/, ['parameter', '', 'number.parameter']],
      
      // Comments - single line and block
      [/#.*$/, 'comment'],
      [/<#/, { token: 'comment', next: '@commentBlock' }],
      
      // Type declarations with brackets
      [/\\[.*?\\]/, 'type'],
      
      // Control keywords
      [/\\b(if|else|elseif|switch|while|for|foreach|do|until|break|continue|return|try|catch|finally|throw)\\b/i, 'keyword.control'],
      
      // Declaration keywords
      [/\\b(function|param|begin|process|end|class|enum|filter)\\b/i, 'keyword.declaration'],
      
      // PowerShell cmdlets (verb-noun pattern)
      [/\\b(Add|Clear|Close|Copy|Enter|Exit|Find|Format|Get|Hide|Join|Lock|Move|New|Open|Optimize|Pop|Push|Redo|Remove|Rename|Reset|Resize|Search|Select|Set|Show|Skip|Split|Step|Switch|Sync|Test|Trace|Unblock|Undo|Unlock|Watch|Write|Start|Stop|Out|Wait|Use|Install|Uninstall|Import|Export)-[\\w]+\\b/i, 'function'],
      
      // PowerShell specific keywords
      [/\\b(begin|break|catch|class|continue|data|define|do|dynamicparam|else|elseif|end|enum|exit|filter|finally|for|foreach|from|function|if|in|param|process|return|switch|throw|trap|try|until|using|var|while|workflow)\\b/i, 'keyword'],
      
      // Strings with variables in them
      [/"(?:[^"$]|\\$[^{]|\\${\\w+})*"/, 'string'],
      [/'[^']*'/, 'string'],
      
      // Numeric literals
      [/\\b\\d+\\b/, 'number'],
      
      // Special operators
      [/\\|>|>>|\\|/, 'operator'],
      
      // Parentheses/Brackets
      [/[{}()\\[\\]]/, '@brackets'],
      
      // Special markers like ## MARK
      [/##\\s+MARK:.*$/, 'markup.heading'],
      [/##=+$/, 'markup.heading']
    ],
    
    commentBlock: [
      [/#>/, { token: 'comment', next: '@pop' }],
      [/./, 'comment']
    ]
  }
};
`;

  // Return the generated grammar file content
  return grammarTemplate;
}

/**
 * Generate report of commands found vs implemented
 */
function generateReport(extractedData, existingGrammar) {
  console.log('Generating report...');
  
  const { commands, parameters } = extractedData;
  
  // Parse existing grammar to extract implemented commands
  let implementedCommands = [];
  let implementedParameters = [];
  
  if (existingGrammar) {
    // Extract commands from existing grammar
    const commandsMatch = existingGrammar.match(/psadtCommands: \[\s+([\s\S]*?)\s+\]/);
    if (commandsMatch) {
      const commandsBlock = commandsMatch[1];
      implementedCommands = commandsBlock.match(/'([^']+)'/g)?.map(s => s.replace(/'/g, '')) || [];
    }
    
    // Extract parameters from existing grammar
    const parametersMatch = existingGrammar.match(/psadtParameters: \[\s+([\s\S]*?)\s+\]/);
    if (parametersMatch) {
      const parametersBlock = parametersMatch[1];
      implementedParameters = parametersBlock.match(/'([^']+)'/g)?.map(s => s.replace(/'/g, '')) || [];
    }
  }
  
  // Find new commands (in documentation but not implemented)
  const newCommands = commands.filter(cmd => !implementedCommands.includes(cmd));
  
  // Find removed commands (implemented but not in documentation)
  const removedCommands = implementedCommands.filter(cmd => !commands.includes(cmd));
  
  // Find new parameters
  const allParameters = [...parameters.critical, ...parameters.regular];
  const newParameters = allParameters.filter(param => !implementedParameters.includes(param));
  
  // Find removed parameters
  const removedParameters = implementedParameters.filter(param => !allParameters.includes(param));
  
  // Generate report content
  const reportContent = `# PSADT Command and Parameter Report

## Summary
- **Total Commands Found in Documentation**: ${commands.length}
- **Previously Implemented Commands**: ${implementedCommands.length}
- **New Commands**: ${newCommands.length}
- **Removed Commands**: ${removedCommands.length}
- **Total Parameters Found**: ${allParameters.length}
- **Critical Parameters**: ${parameters.critical.length}
- **Regular Parameters**: ${parameters.regular.length}
- **New Parameters**: ${newParameters.length}
- **Removed Parameters**: ${removedParameters.length}

## New Commands
${newCommands.length === 0 ? 'None' : newCommands.map(cmd => `- \`${cmd}\``).join('\n')}

## Removed Commands
${removedCommands.length === 0 ? 'None' : removedCommands.map(cmd => `- \`${cmd}\``).join('\n')}

## Critical Parameters
${parameters.critical.map(param => `- \`${param}\``).join('\n')}

## New Parameters
${newParameters.length === 0 ? 'None' : newParameters.map(param => `- \`${param}\``).join('\n')}

## Removed Parameters
${removedParameters.length === 0 ? 'None' : removedParameters.map(param => `- \`${param}\``).join('\n')}

## All Commands
${commands.map(cmd => `- \`${cmd}\``).join('\n')}

*This report was auto-generated on ${new Date().toISOString()}*
`;

  return reportContent;
}

/**
 * Save output files
 */
function saveOutputFiles(grammarContent, extractedData, reportContent) {
  console.log('Saving output files...');
  
  // Create output directories if they don't exist
  const grammarDir = path.dirname(config.output.grammarPath);
  const commandsJsonDir = path.dirname(config.output.commandsJsonPath);
  const reportDir = path.dirname(config.output.reportPath);
  
  for (const dir of [grammarDir, commandsJsonDir, reportDir]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  
  // Save PowerShell grammar file
  fs.writeFileSync(config.output.grammarPath, grammarContent, 'utf8');
  console.log(`Grammar file saved to ${config.output.grammarPath}`);
  
  // Save commands JSON file
  fs.writeFileSync(
    config.output.commandsJsonPath,
    JSON.stringify(extractedData, null, 2),
    'utf8'
  );
  console.log(`Commands JSON saved to ${config.output.commandsJsonPath}`);
  
  // Save report file
  fs.writeFileSync(config.output.reportPath, reportContent, 'utf8');
  console.log(`Report saved to ${config.output.reportPath}`);
}

/**
 * Main function to run the documentation parser
 */
async function main() {
  try {
    console.log('Starting PSADT Documentation Parser...');
    
    // Fetch or read documentation
    let docs;
    if (config.source === 'github') {
      docs = await fetchGitHubDocumentation();
    } else {
      docs = readLocalDocumentation();
    }
    
    // Check if any documentation was found
    if (!docs || docs.length === 0) {
      throw new Error('No documentation found. Please check configuration.');
    }
    
    console.log(`Found ${docs.length} documentation files.`);
    
    // Parse documentation to extract commands and parameters
    const extractedData = parseDocumentation(docs);
    
    console.log(`Extracted ${extractedData.commands.length} commands and ${extractedData.parameters.critical.length + extractedData.parameters.regular.length} parameters.`);
    
    // Read existing grammar file if it exists
    let existingGrammar = '';
    if (fs.existsSync(config.output.grammarPath)) {
      existingGrammar = fs.readFileSync(config.output.grammarPath, 'utf8');
    }
    
    // Generate grammar file
    const grammarContent = generateGrammarFile(extractedData);
    
    // Generate report
    const reportContent = generateReport(extractedData, existingGrammar);
    
    // Save output files
    saveOutputFiles(grammarContent, extractedData, reportContent);
    
    console.log('PSADT Documentation Parser completed successfully!');
  } catch (error) {
    console.error('Error running PSADT Documentation Parser:', error);
    process.exit(1);
  }
}

// Run the parser
main();
