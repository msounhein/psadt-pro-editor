# PSADT Pro UI Enhancement Implementation Guide (Updated)

This guide outlines the steps to implement the enhancements we've developed for the PSADT Pro UI editor, with specific attention to Next.js server-side rendering (SSR) compatibility issues.

## Next.js SSR Compatibility

The code has been updated to address the "window is not defined" error that occurs during server-side rendering. The key changes include:

1. Using Next.js `dynamic` imports with `{ ssr: false }` for browser-specific modules
2. Adding safety checks for browser-only code
3. Implementing proper component mounting logic
4. Avoiding accessing browser APIs during module initialization

These changes ensure that the code works correctly in both server-side rendering and client-side contexts.

## Detailed Implementation Steps

### 1. MonacoEditor.tsx

The MonacoEditor component has been updated to:

- Dynamically import PowerShellLinting to avoid SSR issues
- Add client-side mounting detection
- Include safe checks for browser-only APIs (like `window` and `localStorage`)
- Render a simple placeholder during server-side rendering

### 2. PowerShellLinting.ts

The PowerShellLinting module has been modified to:

- Avoid accessing PowerShellGrammar at module scope
- Create linting rules within functions rather than at module scope
- Add safety checks for server-side rendering
- Return a no-op disposable when used in a server context

### 3. ResizableFilePanel.tsx

The ResizableFilePanel component now includes:

- Client-side mounting detection before accessing localStorage
- Error handling for browser storage operations
- Safe access to DOM APIs

## Integration Instructions

To integrate these components into your codebase:

1. Replace the existing MonacoEditor.tsx with the updated version
2. Add the new PowerShellLinting.ts file
3. Add the ResizableFilePanel.tsx component
4. Add the resizable-panel-styles.css to your styles directory
5. Update import statements in your SimpleEditor component to use the new ResizableFilePanel

Example changes to SimpleEditor.tsx:

```jsx
// Import the new components
import { ResizableFilePanel } from './components/ResizableFilePanel';
import './styles/resizable-panel-styles.css';

// Replace the existing file panel with the resizable version
<ResizableFilePanel
  files={fileStructure}
  selectedFile={selectedFile}
  onFileSelect={handleFileSelect}
  expandedFolders={expandedFolders}
  onFolderToggle={handleFolderToggle}
  isLoading={isLoadingFiles}
/>
```

## Documentation Parser

The documentation parser script should be run as a build step rather than being integrated directly into the Next.js application:

```bash
node scripts/documentation-parser.js
```

This script generates the PowerShellGrammar.ts file with the latest PSADT commands and parameters.

## Testing and Troubleshooting

### Common Issues and Solutions

1. **SSR-related errors:**
   - If you still encounter "window is not defined" errors, ensure that all browser-specific code is wrapped in useEffect hooks and that components are imported using dynamic imports with { ssr: false }.

2. **Module import errors:**
   - Make sure all paths in import statements are correct for your project structure.

3. **Styling issues:**
   - Verify that the CSS has been properly imported and that the class names match those used in the components.

### Validation Steps

After implementation, test the following:

1. Server-side rendering works without errors
2. Editor loads correctly on the client side
3. Syntax highlighting works for PSADT-specific commands
4. File panel can be resized without issues
5. Panel width is saved and restored between sessions

## Conclusion

With these updates, the PSADT Pro UI enhancements should now work correctly with Next.js server-side rendering, providing:

- Enhanced PowerShell syntax highlighting with PSADT-specific rules
- Code intelligence through PowerShell linting and command completion
- Improved workspace customization with the resizable file panel
- Seamless integration with your existing Next.js application

If you have any questions or encounter any issues during implementation, please let me know!
