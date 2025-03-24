# Documentation Component Wrapping Fixes

## Overview
This document outlines the changes made to fix code wrapping issues in the documentation viewer component, specifically ensuring that long lines of code wrap properly in both the Preview and Raw tabs.

## Problem Statement
The documentation page was experiencing layout issues where long lines of code would extend beyond the visible area, causing horizontal scrolling and page shifting. This was particularly noticeable in the Raw tab and in code blocks within the Preview tab.

## Solution Implemented

### Global Styling Approach
Added global styles to ensure consistent text wrapping across all code elements:

```css
.markdown-body pre,
.react-syntax-highlighter,
.react-syntax-highlighter-line {
  white-space: pre-wrap !important;
  word-break: break-word !important;
  overflow-wrap: break-word !important;
  max-width: 100% !important;
}

.token {
  white-space: pre-wrap !important;
  word-break: break-word !important;
  overflow-wrap: break-word !important;
}
```

### Raw Tab Improvements

1. **Container Modifications**
   - Replaced basic `pre` element with a styled `div` container
   - Added overflow handling: `overflow: 'hidden'`
   - Applied max-width constraints: `maxWidth: '100%'`

2. **SyntaxHighlighter Enhancements**
   - Used SyntaxHighlighter for all code formats instead of raw text
   - Applied consistent styling to all code instances:
   ```jsx
   <SyntaxHighlighter
     language={fileType === 'ps1' ? 'powershell' : fileType === 'js' ? 'javascript' : fileType}
     style={syntaxStyle}
     showLineNumbers={true}
     customStyle={{
       backgroundColor: '#0d1117',
       margin: 0,
       padding: 0,
       borderRadius: '8px',
       fontSize: '13px',
       lineHeight: '1.4',
       maxWidth: '100%',
       overflow: 'auto',
       wordWrap: 'break-word',
       whiteSpace: 'pre-wrap'
     }}
   >
     {fileContent}
   </SyntaxHighlighter>
   ```

3. **Line Number Styling**
   ```css
   .linenumber {
     display: inline-block;
     min-width: 40px;
     padding-right: 10px;
     text-align: right;
     color: rgba(235, 235, 235, 0.4);
     user-select: none;
   }
   ```

### Preview Tab Improvements

1. **Markdown Container**
   - Added overflow handling: `overflow: 'hidden'`
   - Enhanced wrapper properties:
   ```jsx
   <div className="p-5" style={{ 
     backgroundColor: vscodePalette.contentBackground,
     overflowWrap: 'break-word',
     wordWrap: 'break-word',
     wordBreak: 'break-word',
     maxWidth: '100%',
     overflow: 'hidden'
   }}>
   ```

2. **Code Block Rendering**
   - Updated the `code` function in `markdownComponents`:
   ```jsx
   customStyle={{
     borderRadius: '12px',
     fontSize: '13px',
     lineHeight: '1.5',
     fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
     letterSpacing: '0.01em',
     maxWidth: '100%',
     overflow: 'auto',
     wordWrap: 'break-word',
     whiteSpace: 'pre-wrap'
   }}
   ```

3. **Markdown Styles**
   - Enhanced the base markdown-body class:
   ```css
   .markdown-body {
     color: ${vscodePalette.foreground};
     font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
     font-size: 14px;
     line-height: 1.7;
     word-wrap: break-word;
     overflow-wrap: break-word;
     word-break: break-word;
     max-width: '100%';
     font-weight: 400;
     letter-spacing: -0.011em;
     overflow: hidden;
   }
   ```

## Results
These changes ensure that all content, including complex code blocks with long lines, is properly contained within the viewport width, preventing the page from shifting horizontally while maintaining code readability through proper wrapping.

## Technical Implementation Details

1. **CSS Properties Used**
   - `white-space: pre-wrap` - Preserves line breaks but wraps text when needed
   - `word-break: break-word` - Allows words to break when needed to prevent overflow
   - `overflow-wrap: break-word` - Similar to word-break but with slightly different rules
   - `max-width: 100%` - Ensures elements don't expand beyond their container
   - `overflow: hidden/auto` - Controls how overflow content is handled

2. **Component Hierarchy**
   - Applied styles at multiple levels to ensure consistent wrapping:
     - Container elements
     - SyntaxHighlighter components
     - Individual code lines and tokens
     - Global CSS rules

This multi-layered approach ensures that text wrapping works consistently across different types of content and in different views. 