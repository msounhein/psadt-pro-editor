"use client";

import { useEffect, useState } from 'react';
import { editor } from 'monaco-editor';

interface CompletionProviderProps {
  monaco: any;
  editorInstance: editor.IStandaloneCodeEditor | null;
  version?: number;
}

/**
 * Gets the current code context before the cursor position
 * @param model The editor model
 * @param position The cursor position
 * @param contextLength How many characters of context to include
 * @returns The code context
 */
const getCodeContext = (
  model: editor.ITextModel,
  position: { lineNumber: number; column: number },
  contextLength: number = 200
): string => {
  // Get current position details
  const lineCount = model.getLineCount();
  const startLine = Math.max(1, position.lineNumber - 5); // Get 5 lines above
  
  // Build context from surrounding lines
  let context = '';
  for (let i = startLine; i <= position.lineNumber; i++) {
    // For the cursor line, only get text up to the cursor
    if (i === position.lineNumber) {
      context += model.getValueInRange({
        startLineNumber: i,
        startColumn: 1,
        endLineNumber: i,
        endColumn: position.column
      });
    } else {
      context += model.getLineContent(i) + '\n';
    }
  }
  
  // If the context is too long, trim it
  if (context.length > contextLength) {
    context = context.substring(context.length - contextLength);
  }
  
  return context;
};

/**
 * Formats a suggested command for the editor
 * @param suggestion The command suggestion
 * @returns A formatted snippet with placeholders
 */
const formatCommandSnippet = (suggestion: any): string => {
  const { commandName, parameters = [] } = suggestion;
  
  // If no parameters, just return the command name
  if (!parameters.length) {
    return commandName;
  }
  
  // Start with the command name
  let snippet = commandName;
  
  // Add required parameters first with placeholders
  const requiredParams = parameters.filter((p: any) => p.isRequired);
  const optionalParams = parameters.filter((p: any) => !p.isRequired);
  
  let tabIndex = 1;
  
  // Add required parameters
  requiredParams.forEach((param: any) => {
    const paramText = param.defaultValue 
      ? ` -${param.name} \${${tabIndex}:${param.defaultValue}}`
      : ` -${param.name} \${${tabIndex}:}`;
      
    snippet += paramText;
    tabIndex++;
  });
  
  // Add a few important optional parameters based on frequency or importance
  const criticalOptionalParams = optionalParams.filter((p: any) => p.isCritical).slice(0, 2);
  criticalOptionalParams.forEach((param: any) => {
    const paramText = param.defaultValue 
      ? ` \${${tabIndex}:-${param.name} ${param.defaultValue}}`
      : ` \${${tabIndex}:-${param.name}}`;
      
    snippet += paramText;
    tabIndex++;
  });
  
  return snippet;
};

/**
 * Creates documentation markdown for the hover tooltip
 * @param suggestion The command suggestion
 * @returns Markdown formatted documentation
 */
const createDocumentation = (suggestion: any): string => {
  const { commandName, description, syntax, parameters = [] } = suggestion;
  
  let markdown = `### ${commandName}\n\n`;
  
  if (description) {
    markdown += `${description}\n\n`;
  }
  
  if (syntax) {
    markdown += `**Syntax:**\n\`\`\`powershell\n${syntax}\n\`\`\`\n\n`;
  }
  
  if (parameters.length > 0) {
    markdown += `**Parameters:**\n`;
    
    parameters.forEach((param: any) => {
      const required = param.isRequired ? '(required)' : '(optional)';
      const critical = param.isCritical ? ' **[CRITICAL]**' : '';
      markdown += `- \`-${param.name}\` ${required}${critical}: ${param.description || 'No description'}\n`;
    });
  }
  
  return markdown;
};

/**
 * PSADT Completion Provider
 * Provides intelligent code completions based on the current context
 */
export const PsadtCompletionProvider: React.FC<CompletionProviderProps> = ({ 
  monaco, 
  editorInstance,
  version = 4 // Default to PSADT v4
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [completionStatus, setCompletionStatus] = useState<string>('Initializing...');
  
  useEffect(() => {
    if (!monaco || !editorInstance || isInitialized) return;
    
    // Register the completion provider
    const disposable = monaco.languages.registerCompletionItemProvider('powershell', {
      triggerCharacters: [' ', '-', '$', '.'],
      provideCompletionItems: async (model: editor.ITextModel, position: editor.Position) => {
        try {
          setCompletionStatus('Analyzing context...');
          
          // Get the current context from the editor
          const context = getCodeContext(model, position);
          
          if (!context || context.trim().length < 3) {
            setCompletionStatus('Ready');
            return { suggestions: [] };
          }
          
          setCompletionStatus('Fetching suggestions...');
          
          try {
            console.log('Fetching suggestions with context:', context.substring(0, 100) + '...');
            
            // Query the API for context-based suggestions
            const response = await fetch('/api/psadt-qdrant/context-suggestions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                context,
                limit: 10,
                version,
                includeDeprecated: false
              })
            });
            
            console.log('API response status:', response.status);
            
            // Try to get the response text for debugging
            const responseText = await response.text();
            console.log('Response body:', responseText);
            
            // If not OK, throw error
            if (!response.ok) {
              throw new Error(`${response.status} ${response.statusText}: ${responseText}`);
            }
            
            // Parse JSON from the response text
            let data;
            try {
              data = JSON.parse(responseText);
            } catch (jsonError) {
              console.error('Failed to parse JSON response:', jsonError);
              setCompletionStatus(`Error: Invalid JSON response`);
              return { suggestions: [] };
            }
            
            setCompletionStatus(`${data.suggestions?.length || 0} suggestions`);
            
            if (!data.suggestions || !Array.isArray(data.suggestions)) {
              console.warn('No suggestions returned:', data);
              return { suggestions: [] };
            }
            
            // Transform API results into Monaco completion items
            const completionItems = data.suggestions.map((suggestion: any) => {
              const { commandName, description, score = 0 } = suggestion;
              
              return {
                label: commandName,
                kind: monaco.languages.CompletionItemKind.Function,
                documentation: {
                  value: createDocumentation(suggestion),
                  isTrusted: true
                },
                insertText: formatCommandSnippet(suggestion),
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                sortText: `${String.fromCharCode(0x30 + Math.min(9, Math.floor(score * 10)))}${commandName}`,
                detail: `PSADT v${version} Command (${Math.round(score * 100)}% match)`
              };
            });
            
            return {
              suggestions: completionItems
            };
          } catch (apiError) {
            console.error('API call failed:', apiError);
            setCompletionStatus(`Error: ${apiError.message}`);
            return { suggestions: [] };
          }
        } catch (error) {
          console.error('Error in completion provider:', error);
          setCompletionStatus('Error');
          return { suggestions: [] };
        }
      }
    });
    
    // Register the hover provider for enhanced documentation
    const hoverDisposable = monaco.languages.registerHoverProvider('powershell', {
      provideHover: async (model: editor.ITextModel, position: editor.Position) => {
        try {
          // Get the word at the current position
          const word = model.getWordAtPosition(position);
          if (!word) return null;
          
          // Get the full line to check if this is a PSADT command
          const lineContent = model.getLineContent(position.lineNumber);
          
          // Simple check if this might be a PSADT command (starts with a known prefix)
          const psadtPrefixes = ['Show-', 'Install-', 'Execute-', 'Get-', 'Set-', 'Close-', 'Start-'];
          const isLikelyPsadtCommand = psadtPrefixes.some(prefix => 
            word.word.startsWith(prefix) || lineContent.includes(`${prefix}${word.word}`)
          );
          
          if (!isLikelyPsadtCommand) return null;
          
          try {
            console.log('Fetching hover data for command:', word.word);
            
            // Query the API for this specific command
            const response = await fetch('/api/psadt-qdrant/search', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: word.word,
                limit: 1,
                version,
                includeDeprecated: true
              })
            });
            
            console.log('Hover API response status:', response.status);
            
            // If not OK, return null
            if (!response.ok) {
              console.warn(`Hover API returned ${response.status} ${response.statusText}`);
              return null;
            }
            
            // Try to get the response text for debugging
            const responseText = await response.text();
            console.log('Hover response body:', responseText);
            
            // Parse JSON from the response text
            let data;
            try {
              data = JSON.parse(responseText);
            } catch (jsonError) {
              console.error('Failed to parse JSON hover response:', jsonError);
              return null;
            }
            
            console.log('Hover data received:', data ? 'yes' : 'no');
            
            if (!data || !data.length) {
              console.warn('No hover data returned for:', word.word);
              return null;
            }
            
            const command = data[0];
            
            return {
              contents: [
                { value: createDocumentation(command) }
              ],
              range: {
                startLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endLineNumber: position.lineNumber,
                endColumn: word.endColumn
              }
            };
          } catch (hoverError) {
            console.error('Hover API error:', hoverError);
            return null;
          }
        } catch (error) {
          console.error('Error in hover provider:', error);
          return null;
        }
      }
    });
    
    // Add a status indicator to the editor
    const statusIndicator = document.createElement('div');
    statusIndicator.className = 'psadt-completion-status';
    statusIndicator.style.position = 'absolute';
    statusIndicator.style.bottom = '5px';
    statusIndicator.style.right = '20px';
    statusIndicator.style.fontSize = '12px';
    statusIndicator.style.padding = '3px 6px';
    statusIndicator.style.backgroundColor = 'rgba(14, 17, 22, 0.7)';
    statusIndicator.style.color = '#e6edf3';
    statusIndicator.style.borderRadius = '3px';
    statusIndicator.style.zIndex = '1000';
    statusIndicator.textContent = 'PSADT AI Completions (Local Model): Ready';
    
    // Check if Qdrant is working by making a test request
    (async () => {
      try {
        setCompletionStatus('Checking Qdrant status...');
        const response = await fetch('/api/psadt-qdrant/debug');
        
        if (!response.ok) {
          setCompletionStatus('Error: Qdrant check failed');
          statusIndicator.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
          return;
        }
        
        const debugInfo = await response.json();
        
        if (!debugInfo.qdrantConnection) {
          setCompletionStatus('Error: No Qdrant connection');
          statusIndicator.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
          return;
        }
        
        if (debugInfo.collectionInfo && debugInfo.collectionInfo.vectorCount === 0) {
          setCompletionStatus('Warning: Qdrant DB is empty');
          statusIndicator.style.backgroundColor = 'rgba(255, 255, 0, 0.3)';
          return;
        }
        
        setCompletionStatus('Ready');
      } catch (error) {
        console.error('Failed to check Qdrant status:', error);
        setCompletionStatus('Error: Could not verify Qdrant');
        statusIndicator.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
      }
    })();
    
    const editorDomNode = editorInstance.getDomNode();
    if (editorDomNode) {
      editorDomNode.appendChild(statusIndicator);
      
      // Update the status when it changes
      const statusObserver = setInterval(() => {
        statusIndicator.textContent = `PSADT AI Completions: ${completionStatus}`;
      }, 500);
      
      // Clear the interval on component unmount
      return () => {
        clearInterval(statusObserver);
        if (editorDomNode.contains(statusIndicator)) {
          editorDomNode.removeChild(statusIndicator);
        }
        disposable.dispose();
        hoverDisposable.dispose();
      };
    }
    
    setIsInitialized(true);
    
    // Cleanup on unmount
    return () => {
      disposable.dispose();
      hoverDisposable.dispose();
    };
  }, [monaco, editorInstance, version, isInitialized, completionStatus]);
  
  return null; // This component doesn't render anything
};

export default PsadtCompletionProvider;