// src/app/api/psadt-qdrant/code-completions/route.js
import { NextResponse } from 'next/server';
import { getPsadtQdrantDb } from '../../../../lib/psadt-qdrant-db';

/**
 * Detect the PSADT version from code context
 * @param {string} codeContext - The code context to analyze
 * @returns {number} - The detected version (3 or 4), defaults to 4
 */
function detectPsadtVersion(codeContext) {
  // Default to version 4
  let version = 4;
  
  // Check for version-specific patterns
  if (codeContext.includes('AppDeployToolkit\\AppDeployToolkitMain.ps1') ||
      codeContext.includes('Show-InstallationWelcome') ||
      codeContext.includes('Show-InstallationPrompt')) {
    // These are common in v3
    version = 3;
  }
  
  if (codeContext.includes('ADT\\') || 
      codeContext.includes('Show-ADTWelcome') || 
      codeContext.includes('Show-ADTPrompt')) {
    // These are specific to v4
    version = 4;
  }
  
  return version;
}

/**
 * Extract the current command context from the code
 * @param {string} codeContext - The full code context
 * @returns {string} - The extracted command context
 */
function extractCommandContext(codeContext) {
  // Look for the current line up to the cursor position
  let currentLine = codeContext;
  
  // If there are multiple lines, get just the current line
  const lines = codeContext.split('\n');
  if (lines.length > 1) {
    // Get the last line as the current line
    // This is a simplification - in a real implementation,
    // we would need the cursor position to identify the current line
    currentLine = lines[lines.length - 1];
  }
  
  // Extract the current command if there's a potential command
  // Look for common command patterns
  const commandPattern = /\b(Show-|Set-|Get-|Install-|Write-|Test-|New-|Close-|Execute-|Start-).+$/;
  const match = currentLine.match(commandPattern);
  
  if (match) {
    // Return just the command part
    return match[0].trim();
  }
  
  // If no specific command pattern found, return the cleaned current line
  return currentLine.trim();
}

/**
 * Process code completion results into Monaco completion items
 * @param {Array} results - The search results from Qdrant
 * @returns {Array} - Formatted completion items for Monaco editor
 */
function formatCompletionItems(results) {
  if (!results || !Array.isArray(results)) {
    return [];
  }
  
  return results.map(result => {
    // Extract parameter information
    const params = result.parameterCount > 0 ? ' [with parameters]' : '';
    
    // Format the completion item
    return {
      label: result.commandName,
      kind: 'Function',
      detail: `PSADT v${result.version}${params}`,
      documentation: {
        value: formatDocumentation(result),
        isTrusted: true
      },
      insertText: formatInsertText(result),
      insertTextFormat: 'Snippet',
      sortText: String(1000 - (result.score * 1000)).padStart(4, '0'), // Higher scores come first
      filterText: `${result.commandName} ${result.description || ''}`,
      command: { id: 'editor.action.triggerParameterHints' }
    };
  });
}

/**
 * Format documentation for a completion item
 * @param {Object} result - The search result
 * @returns {string} - Markdown documentation
 */
function formatDocumentation(result) {
  let doc = `## ${result.commandName}\n\n`;
  
  if (result.description) {
    doc += `${result.description}\n\n`;
  }
  
  if (result.syntax) {
    doc += `**Syntax:**\n\`\`\`powershell\n${result.syntax}\n\`\`\`\n\n`;
  }
  
  if (result.notes) {
    doc += `**Notes:**\n${result.notes}\n\n`;
  }
  
  if (result.returnValue) {
    doc += `**Returns:**\n${result.returnValue}\n\n`;
  }
  
  // Add example if one exists
  if (result.exampleCount > 0 && result.code) {
    doc += `**Example:**\n\`\`\`powershell\n${result.code}\n\`\`\`\n\n`;
  }
  
  return doc;
}

/**
 * Format insert text for a completion item, with parameter placeholders
 * @param {Object} result - The search result
 * @returns {string} - Insert text with placeholders
 */
function formatInsertText(result) {
  // If this is just a basic command without parameters, just return the command name
  if (!result.syntax || result.parameterCount === 0) {
    return result.commandName;
  }
  
  // Extract parameter information from the syntax
  // This is a simplification - in a real implementation, we would parse the
  // parameters from the actual parameter data
  try {
    // Simple regex to find parameters in the syntax
    // This will capture both required and optional parameters
    const paramRegex = /-([A-Za-z0-9]+)(?:\s+(?:<([^>]+)>|\[([^\\]]+)\]))?/g;
    const matches = [...result.syntax.matchAll(paramRegex)];
    
    if (matches.length === 0) {
      return result.commandName;
    }
    
    // Build the insert text with placeholders
    let insertText = result.commandName;
    
    // Add each parameter as a placeholder
    matches.forEach((match, index) => {
      const paramName = match[1];
      const paramContent = match[2] || match[3] || 'value';
      
      // Add parameter
      insertText += ` -${paramName} \${${index + 1}:${paramContent}}`;
    });
    
    return insertText;
  } catch (error) {
    console.error('Error formatting insert text:', error);
    return result.commandName;
  }
}

export async function POST(request) {
  try {
    const { codeContext, options = {} } = await request.json();
    
    if (!codeContext) {
      return NextResponse.json(
        { error: 'Code context is required' },
        { status: 400 }
      );
    }
    
    // Process the code context
    const commandContext = extractCommandContext(codeContext);
    
    // Detect version if not specified
    const detectedVersion = options.version || detectPsadtVersion(codeContext);
    
    // Validate and prepare options
    const validOptions = {
      version: detectedVersion,
      limit: options.limit || 10,
      includeDeprecated: options.includeDeprecated || false,
      includeExamples: true, // Include examples by default for better context
    };
    
    // Initialize the Qdrant DB service
    const qdrantDb = getPsadtQdrantDb();
    
    // Get contextual suggestions for code completion
    const results = await qdrantDb.getContextualSuggestions(commandContext, validOptions);
    
    // Format the results for Monaco editor completion
    const completionItems = formatCompletionItems(results);
    
    return NextResponse.json({
      completionItems,
      context: {
        processedContext: commandContext,
        detectedVersion: detectedVersion,
        resultCount: results.length
      }
    });
  } catch (error) {
    console.error('Error providing code completions:', error);
    return NextResponse.json(
      { error: `Failed to get code completions: ${error.message}` },
      { status: 500 }
    );
  }
}
