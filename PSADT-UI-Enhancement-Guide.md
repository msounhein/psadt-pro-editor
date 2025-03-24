# PSADT Pro UI Enhancement Implementation Guide

This guide outlines the steps to implement the enhancements we've developed for the PSADT Pro UI editor:

1. Automated Documentation Parser
2. PowerShell Linting Integration
3. Resizable File Panel

## Prerequisites

Before starting, make sure you have:

- Node.js (version 14 or later)
- npm or yarn
- Git

## Getting Started

### 1. Update Dependencies

First, run the dependency update script to add the required packages:

```bash
node scripts/update-dependencies.js
npm install
```

This will add the necessary packages for the Monaco language client, PowerShell linting, and documentation parsing.

### 2. Implementing the Features

#### A. Automated Documentation Parser

The documentation parser automatically extracts PSADT commands and parameters from documentation to generate a comprehensive syntax highlighting ruleset.

To use it:

1. Configure the parser in `scripts/documentation-parser.js` to point to your documentation source.
2. Run the parser to generate an updated PowerShellGrammar.ts file:

```bash
npm run update-grammar
```

3. The parser will generate:
   - Updated PowerShellGrammar.ts file with commands and parameters
   - JSON file with extracted commands (docs/psadt-commands.json)
   - Validation report (docs/psadt-command-report.md)

#### B. PowerShell Linting Integration

The PowerShell linting integration provides syntax validation and PSADT command/parameter completion.

Implementation notes:

1. The `PowerShellLinting.ts` file has been added to `src/components/ide/components/`
2. The `MonacoEditor.tsx` file has been updated to use the linting module

If you need to modify linting rules, edit the `psadtLintingRules` array in `PowerShellLinting.ts`.

#### C. Resizable File Panel

The resizable file panel replaces the current fixed-width file explorer with a draggable version.

Implementation notes:

1. The `ResizableFilePanel.tsx` component has been created in `src/components/ide/components/`
2. CSS styles have been added in `src/components/ide/styles/resizable-panel-styles.css`

To use this component, replace the current file panel with `ResizableFilePanel` in `simple-editor.tsx`:

```jsx
<ResizableFilePanel
  files={fileStructure}
  selectedFile={selectedFile}
  onFileSelect={handleFileSelect}
  expandedFolders={expandedFolders}
  onFolderToggle={handleFolderToggle}
  isLoading={isLoadingFiles}
/>
```

## Implementation Approach

For a smooth integration process, we recommend following this phased approach:

### Phase 1: Resizable Panel (Low Risk)

1. Add the CSS file to your project
2. Implement the ResizableFilePanel component
3. Replace the file explorer in simple-editor.tsx

This provides immediate UX improvements with minimal risk.

### Phase 2: Documentation Parser (Medium Risk)

1. Run the update-dependencies script
2. Configure and test the documentation parser
3. Review the generated PowerShellGrammar.ts file

This is an offline tool that doesn't affect runtime behavior.

### Phase 3: PowerShell Linting (Higher Complexity)

1. Implement the PowerShellLinting module
2. Update MonacoEditor.tsx to use the module
3. Test the linting features with various PSADT scripts

This adds advanced functionality but has more complex integration requirements.

## Testing

After implementation, test the following:

1. **Documentation Parser:**
   - Run parser and verify it generates correct PowerShellGrammar.ts
   - Check report for any missing or deprecated commands

2. **PowerShell Linting:**
   - Open a PowerShell file and verify syntax highlighting
   - Test parameter completion by typing '-'
   - Test command completion by typing 'Show-ADT'
   - Check hover documentation on commands and parameters

3. **Resizable Panel:**
   - Drag the resize handle and verify panel resizes smoothly
   - Check that min/max constraints are working
   - Test double-click to reset width
   - Test on different screen sizes (especially mobile)

## Fallback Plan

If issues are encountered during integration:

1. **Documentation Parser:**
   - Fall back to manually updating PowerShellGrammar.ts
   - Add logging to identify parsing issues

2. **PowerShell Linting:**
   - If language server integration fails, use rules-only implementation
   - Disable problematic rules individually

3. **Resizable Panel:**
   - Revert to current implementation
   - Try simplified resize-only version without storage

## Conclusion

These enhancements significantly improve the PSADT Pro UI editor experience by providing better syntax highlighting, intelligent code assistance, and improved workspace customization.

If you have any questions or need further assistance with the implementation, please feel free to reach out!
