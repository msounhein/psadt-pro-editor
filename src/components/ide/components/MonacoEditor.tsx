"use client";

import React, { useRef, useState, useEffect } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

export type MonacoEditorProps = {
  value: string;
  language?: string;
  height?: string;
  readOnly?: boolean;
  theme?: string;
  onChange?: (value: string | undefined) => void;
};

export type EditorInstance = {
  getValue: () => string;
  setValue: (value: string) => void;
  focus: () => void;
};

// Define a GitHub-style dark theme
const githubDarkTheme = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '8b949e' },
    { token: 'keyword', foreground: 'ff7b72' },
    { token: 'string', foreground: 'a5d6ff' },
    { token: 'number', foreground: '79c0ff' },
    { token: 'delimiter', foreground: 'e6edf3' },
    { token: 'variable', foreground: 'ffa657' },
    { token: 'type', foreground: '79c0ff' },
    { token: 'function', foreground: 'd2a8ff' },
  ],
  colors: {
    'editor.background': '#0e1116',
    'editor.foreground': '#e6edf3',
    'editorCursor.foreground': '#e6edf3',
    'editor.selectionBackground': '#264f78',
    'editor.lineHighlightBackground': '#001122',
    'editorLineNumber.foreground': '#6e7681',
    'editorIndentGuide.background': '#001122',
    'editor.inactiveSelectionBackground': '#264f7880',
    'editorWhitespace.foreground': '#484f58',
    'editorGroupHeader.tabsBackground': '#0e1116',
    'tab.activeBackground': '#0e1116',
    'tab.inactiveBackground': '#0e1116',
    'tab.activeForeground': '#e6edf3',
    'tab.inactiveForeground': '#8b949e',
    'tab.border': '#30363d',
    'editorWidget.background': '#0e1116',
    'input.background': '#0e1116',
    'input.border': '#30363d',
    'input.foreground': '#e6edf3',
    'scrollbarSlider.background': '#484f5880',
    'scrollbarSlider.hoverBackground': '#484f58a0',
    'scrollbarSlider.activeBackground': '#484f58c0',
    'editor.lineHighlightBorder': '#001122',
    'editorBracketMatch.background': '#264f7840',
    'editorBracketMatch.border': '#264f78',
    'editor.selectionHighlightBackground': '#264f7840',
    'editor.wordHighlightBackground': '#264f7840',
    'editor.wordHighlightStrongBackground': '#264f7880',
    'editorOverviewRuler.border': '#30363d',
    'editorGutter.background': '#0e1116',
    'editorLineNumber.activeForeground': '#e6edf3',
  }
};

// Define other theme options
export const editorThemes = [
  { name: 'GitHub Dark', value: 'github-dark' },
  { name: 'Dark', value: 'vs-dark' },
  { name: 'Light', value: 'light' },
  { name: 'High Contrast', value: 'hc-black' }
];

export const MonacoEditor: React.FC<MonacoEditorProps> = ({
  value,
  language = 'powershell',
  height = '100%',
  readOnly = false,
  theme = 'github-dark',
  onChange
}) => {
  const editorRef = useRef<EditorInstance | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);

  // Handle editor mount
  const handleEditorDidMount: OnMount = (editor, monacoInstance) => {
    // Register themes
    monacoInstance.editor.defineTheme('github-dark', githubDarkTheme as any);
    
    // Set editor reference
    editorRef.current = {
      getValue: () => editor.getValue(),
      setValue: (value) => editor.setValue(value),
      focus: () => editor.focus()
    };
    
    // Register PowerShell language if needed
    if (!monacoInstance.languages.getLanguages().some((lang: any) => lang.id === 'powershell')) {
      monacoInstance.languages.register({ id: 'powershell' });
      
      // Basic syntax highlighting for PowerShell
      monacoInstance.languages.setMonarchTokensProvider('powershell', {
        tokenizer: {
          root: [
            [/\$[\w]+/, 'variable'],
            [/#.*$/, 'comment'],
            [/\[.*\]/, 'type'],
            [/\b(function|param|if|else|foreach|for|while|switch|return|try|catch|finally)\b/, 'keyword'],
            [/\b(Get|Set|New|Remove|Add|Install|Uninstall|Import|Export|Start|Stop|Write|Read)-[\w]+\b/, 'function'],
            [/".*?"/, 'string'],
            [/'.*?'/, 'string'],
          ]
        }
      });
    }
    
    // Set theme
    monacoInstance.editor.setTheme(theme);
    
    // Set up change event
    editor.onDidChangeModelContent(() => {
      if (onChange) {
        onChange(editor.getValue());
      }
    });

    // --- Add Completion Provider ---
    const completionProvider = monacoInstance.languages.registerCompletionItemProvider('powershell', {
      // Trigger on common PowerShell characters and letters
      triggerCharacters: ['-', '$', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
      provideCompletionItems: async (model, position) => {
        const textUntilPosition = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });

        // Basic check: Don't trigger immediately after a space if the previous char wasn't a trigger like '-'
        const lastChar = textUntilPosition.charAt(textUntilPosition.length - 2);
        if (textUntilPosition.endsWith(' ') && lastChar !== '-') {
           // console.log("Skipping completion after space (unless after hyphen)");
           // return { suggestions: [] }; // Optionally disable suggestions after space
        }

        // Get the word being typed to determine the replacement range
        const wordInfo = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: wordInfo.startColumn,
          endColumn: wordInfo.endColumn,
        };

        console.log(`Completion triggered. Context: "${textUntilPosition}"`);

        try {
          const response = await fetch('/api/ide/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              context: textUntilPosition, // Send text up to cursor
              language: model.getLanguageId(),
            }),
          });

          if (!response.ok) {
            console.error("Completion API error:", response.status, await response.text());
            return { suggestions: [] };
          }

          const apiResult = await response.json();

          if (!apiResult || !Array.isArray(apiResult.suggestions)) {
             console.error("Invalid completion API response format:", apiResult);
             return { suggestions: [] };
          }

          // Add the mandatory 'range' property to each suggestion
          const suggestionsWithRange = apiResult.suggestions.map((suggestion: any) => ({
            ...suggestion,
            range: range, // Tell Monaco what text to replace
            // Ensure kind is a valid enum value (provide default if necessary)
            kind: suggestion.kind ?? monaco.languages.CompletionItemKind.Text,
          }));
          
          console.log(`Received ${suggestionsWithRange.length} suggestions`);

          return { suggestions: suggestionsWithRange };

        } catch (error) {
          console.error("Error fetching completions:", error);
          return { suggestions: [] }; // Return empty suggestions on error
        }
      },
    });
    // --- End Completion Provider ---
    
    setIsEditorReady(true);

    // Clean up the provider when the component unmounts or editor remounts
    return () => {
      completionProvider.dispose();
    };
  };

  // Update theme when it changes
  useEffect(() => {
    if (isEditorReady && typeof window !== 'undefined' && 'monaco' in window) {
      (window as any).monaco.editor.setTheme(theme);
    }
  }, [theme, isEditorReady]);

  return (
    <div className="editor-container h-full w-full">
      <Editor
        height={height}
        defaultLanguage={language}
        value={value}
        options={{
          readOnly,
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          lineNumbers: 'on',
          glyphMargin: true,
          folding: true,
          fontSize: 14,
          fontFamily: 'Consolas, "Liberation Mono", Menlo, Courier, monospace',
          renderLineHighlight: 'all',
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          wordWrap: 'on',
          padding: { top: 16 },
          guides: {
            indentation: true,
            bracketPairs: true,
          },
        }}
        onMount={handleEditorDidMount}
        theme={theme}
        loading={
          <div className="flex items-center justify-center h-full bg-slate-900">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
              <p className="mt-4 text-sm text-gray-300">Loading editor...</p>
            </div>
          </div>
        }
      />
    </div>
  );
}; 