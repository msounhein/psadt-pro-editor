# Advanced Syntax Highlighting with Monaco Editor for PowerShell

This guide covers advanced customization of Monaco Editor syntax highlighting for PowerShell scripts, with special focus on PSADT (PowerShell App Deployment Toolkit) commands.

## Table of Contents

- [Introduction](#introduction)
- [Monaco Editor Basics](#monaco-editor-basics)
- [Custom Grammar for PowerShell](#custom-grammar-for-powershell)
- [Token-Based Styling](#token-based-styling)
- [PowerShell-Specific Patterns](#powershell-specific-patterns)
- [Highlighting Command Parameters](#highlighting-command-parameters)
- [Color Schemes and Visual Enhancements](#color-schemes-and-visual-enhancements)
- [Typography and Text Rendering](#typography-and-text-rendering)
- [Implementation Examples](#implementation-examples)
- [Best Practices](#best-practices)

## Introduction

Effective syntax highlighting significantly improves code readability and productivity. For PowerShell scripts, especially those using specialized frameworks like PSADT, custom syntax highlighting rules can highlight important elements such as command parameters and special variables.

## Monaco Editor Basics

Monaco Editor, the editor that powers VS Code, allows for extensive customization through its tokenization and theming APIs. The core components are:

1. **Languages Registration** - Defining a language identifier
2. **Monarch Tokenizer** - Specifying token patterns with regular expressions
3. **Theme Definition** - Assigning colors and styles to tokens
4. **Editor Configuration** - Setting visual properties and behaviors

## Custom Grammar for PowerShell

### Setting Up a Base Language Definition

The foundation of syntax highlighting is a robust language definition:

```javascript
// Register PowerShell language
monaco.languages.register({ id: 'powershell' });

// Define the tokenizer
monaco.languages.setMonarchTokensProvider('powershell', {
  tokenizer: {
    root: [
      // Token definitions will go here
    ]
  }
});
```

### Understanding Token Types

Token types should follow a hierarchical naming convention to allow for inheritance in themes:

- `keyword` - Language keywords (if, function, etc.)
- `keyword.control` - Flow control keywords
- `string` - String literals
- `comment` - Comments
- `variable` - Variables
- `function` - Function names
- `parameter` - Parameters
- Custom tokens for domain-specific concepts (e.g., `psadt.command`)

## Token-Based Styling

### Creating a Custom Theme

Define a theme that applies styles to your tokens:

```javascript
const powershellTheme = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    // Token styling rules
    { token: 'keyword', foreground: 'ff7b72', fontStyle: 'bold' },
    { token: 'string', foreground: 'a5d6ff' },
    { token: 'comment', foreground: '6a8aa3' },
    { token: 'variable', foreground: 'ffab70' },
    // Custom tokens for PSADT
    { token: 'psadt.command', foreground: '56d364', fontStyle: 'bold' },
    { token: 'psadt.parameter', foreground: 'ff8f00', fontStyle: 'bold' },
  ],
  colors: {
    // Theme colors for editor components
    'editor.background': '#0e1116',
    'editor.foreground': '#e6edf3',
    'editorLineNumber.foreground': '#4a5567',
    'editor.lineHighlightBackground': '#171b24',
  }
};

// Register the theme
monaco.editor.defineTheme('powershell-custom', powershellTheme);
```

## PowerShell-Specific Patterns

### Key PowerShell Elements to Highlight

1. **Variables with $ prefix**
   ```javascript
   [/\$[\w]+/, 'variable']
   ```

2. **Comments**
   ```javascript
   [/#.*$/, 'comment'],
   [/<#/, { token: 'comment', next: '@commentBlock' }]
   ```

3. **Type declarations**
   ```javascript
   [/\[.*?\]/, 'type']
   ```

4. **Function declarations**
   ```javascript
   [/\b(function)\s+([A-Za-z][\w-]*)/, ['keyword', 'function']]
   ```

5. **PowerShell cmdlets (verb-noun pattern)**
   ```javascript
   [/\b(Get|Set|New|Remove)-([\w]+)\b/i, ['verb.powershell', 'function']]
   ```

## Highlighting Command Parameters

### Basic Parameter Highlighting

Parameters in PowerShell are prefixed with a dash:

```javascript
// Basic parameter pattern
[/\s-([A-Za-z][\w]+)\b/, 'parameter']
```

### Enhanced Parameter Highlighting

For more granular control, identify specific parameter types:

```javascript
// Match parameters with different token types based on name
[/\s-([A-Za-z][\w]+)\b/, {
  cases: {
    '(CloseProcesses|PersistPrompt|CheckDiskSpace)': 'psadt.parameter.critical',
    '@default': 'parameter'
  }
}]
```

### Parameter Values

Highlighting values that follow parameters:

```javascript
// Numbers after parameters
[/(\s-[A-Za-z][\w]+)(\s+)(\d+)\b/, ['parameter', '', 'number.parameter']]
```

## Color Schemes and Visual Enhancements

### Color Selection Principles

1. **Contrast** - Ensure sufficient contrast between tokens and background
2. **Hierarchy** - More important elements should have more visual emphasis
3. **Consistency** - Similar elements should have similar colors
4. **Semantic meaning** - Colors should convey meaning (e.g., errors in red)

### Recommended Colors for PowerShell

- **Commands and Functions**: `#56d364` (bright green)
- **Parameters**: `#f7c777` (amber) for regular, `#ff8f00` (orange) for important ones
- **Variables**: `#ffab70` (peach)
- **Strings**: `#a5d6ff` (light blue)
- **Keywords**: `#ff7b72` (red)
- **Comments**: `#6a8aa3` (muted blue)
- **Types**: `#79c0ff` (blue)
- **Parameter Values**: `#3bf5c6` (teal)

## Typography and Text Rendering

### Font Selection

Choose a monospaced font with clear character differentiation:

- JetBrains Mono
- Fira Code
- Cascadia Code
- Source Code Pro

### Text Rendering Options

```javascript
options: {
  fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace',
  fontSize: 14,
  lineHeight: 1.6,
  letterSpacing: 0.5,
  fontLigatures: true,
  renderWhitespace: 'selection'
}
```

## Implementation Examples

### Complete PowerShell Grammar Implementation

Here's a comprehensive implementation for a PowerShell tokenizer with PSADT enhancements:

```javascript
const PowerShellGrammar = {
  tokenizer: {
    root: [
      // PSADT Commands with highest priority
      [/\b(Show-ADT|Start-ADT|Close-ADT|Execute-|Set-ADT|Get-ADT)[\w]+\b/, 'psadt.command'],
      
      // PowerShell variable with $ prefix
      [/\$[\w]+\b/, 'variable'],
      
      // PSADT Parameters with dash prefix
      [/\s-(?:CloseProcesses|CheckDiskSpace|PersistPrompt|iexplore|DeferTimes)\b/, 'psadt.parameter.critical'],
      
      // Regular PowerShell parameters
      [/\s-([A-Za-z][\w]+)\b/, 'parameter'],
      
      // Parameter values with numbers
      [/(\s-[A-Za-z][\w]+)(\s+)(\d+)\b/, ['parameter', '', 'number.parameter']],
      
      // Comments
      [/#.*$/, 'comment'],
      [/<#/, { token: 'comment', next: '@commentBlock' }],
      
      // Types
      [/\[.*?\]/, 'type'],
      
      // Control keywords
      [/\b(if|else|elseif|switch|foreach|for|while|return|try|catch)\b/i, 'keyword.control'],
      
      // Function declarations
      [/\b(function)\s+([A-Za-z][\w-]*)/i, ['keyword', 'function']],
      
      // PowerShell cmdlets
      [/\b(Get|Set|New|Remove|Add|Install)-[\w]+\b/i, 'function'],
      
      // Strings
      [/"(?:[^"$]|\$[^{]|\${\w+})*"/, 'string'],
      [/'[^']*'/, 'string'],
      
      // Numeric literals
      [/\b\d+\b/, 'number'],
      
      // Special PSADT markup
      [/##\s+MARK:.*$/, 'markup.heading'],
    ],
    commentBlock: [
      [/#>/, { token: 'comment', next: '@pop' }],
      [/./, 'comment']
    ]
  }
};
```

### Sample Theme Implementation

```javascript
const powershellTheme = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6a8aa3' },
    { token: 'keyword', foreground: 'ff7b72', fontStyle: 'bold' },
    { token: 'keyword.control', foreground: 'ff7b72', fontStyle: 'bold' },
    { token: 'string', foreground: 'a5d6ff' },
    { token: 'number', foreground: '79c0ff', fontStyle: 'italic' },
    { token: 'number.parameter', foreground: '3bf5c6', fontStyle: 'bold' },
    { token: 'variable', foreground: 'ffab70' },
    { token: 'type', foreground: '79c0ff', fontStyle: 'italic' },
    { token: 'function', foreground: 'c589ff', fontStyle: 'bold' },
    { token: 'parameter', foreground: 'f7c777' },
    { token: 'psadt.command', foreground: '56d364', fontStyle: 'bold' },
    { token: 'psadt.parameter.critical', foreground: 'ffd700', fontStyle: 'bold' },
    { token: 'markup.heading', foreground: '6a8aa3', fontStyle: 'bold' },
  ],
  colors: {
    'editor.background': '#0e1116',
    'editor.foreground': '#e6edf3',
    'editorCursor.foreground': '#58a6ff',
    'editor.lineHighlightBackground': '#171b24',
    'editorLineNumber.foreground': '#4a5567',
    'editorLineNumber.activeForeground': '#79c0ff',
    'editorIndentGuide.background': '#1d2230',
    'editorIndentGuide.activeBackground': '#3b4354',
  }
};
```

## Best Practices

1. **Prioritize Token Rules** - Place more specific patterns before general ones
2. **Test with Real Scripts** - Ensure your patterns match realistic code
3. **Avoid Overlapping Patterns** - Ensure patterns don't conflict
4. **Consider Performance** - Overly complex regexes can slow down the editor
5. **Maintain Visual Hierarchy** - Use color and styling to guide the eye to important elements
6. **Be Consistent** - Use the same color for the same types of tokens
7. **Support Color Blindness** - Don't rely solely on color differences; use font styles as well

By following these guidelines, you can create a highly effective custom syntax highlighting system in Monaco Editor that makes PowerShell scripts more readable and easier to work with, especially when dealing with specialized frameworks like PSADT.
