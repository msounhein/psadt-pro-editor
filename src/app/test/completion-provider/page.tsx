"use client";

import React, { useState } from 'react';
import { MonacoEditor } from '@/components/ide/components/MonacoEditor';

// Sample PowerShell content with PSADT commands
const SAMPLE_PS1_CONTENT = `<#
.SYNOPSIS
    This is a test script for PSADT command completion.
.DESCRIPTION
    This PowerShell script demonstrates the AI-powered code completion for PSADT commands.
#>

[CmdletBinding()]
Param (
    [Parameter(Mandatory=$false)]
    [ValidateSet('Install','Uninstall','Repair')]
    [string]$DeploymentType = 'Install',
    [Parameter(Mandatory=$false)]
    [ValidateSet('Interactive','Silent','NonInteractive')]
    [string]$DeployMode = 'Interactive'
)

# Import the toolkit
. "$(Split-Path -Parent $MyInvocation.MyCommand.Definition)\\AppDeployToolkit\\AppDeployToolkitMain.ps1"

# Begin installation
Try {
    # Show installation welcome message
    Show-InstallationWelcome -CloseApps "notepad,chrome" -AllowDefer -DeferTimes 3
    
    # Show progress message
    Show-InstallationProgress -StatusMessage "Installing application..."
    
    # Example of command that will trigger completions
    # Try typing "Show-" or "Execute-" after this line to test completions
    
    
    # Install commands go here
    Execute-Process -Path "setup.exe" -Parameters "/silent"
    
    # Show installation complete dialog
    Show-InstallationPrompt -Message "Installation completed successfully!" -ButtonRightText "OK"
}
Catch {
    [int32]$mainExitCode = 60001
    Write-Log -Message "Error: $_" -Severity 3
    Show-DialogBox -Title "Installation Error" -Text "An error occurred during installation: $_" -Icon "Stop"
}
Finally {
    # Finish installation and cleanup
    Write-Log "Finishing installation..."
}

Exit $mainExitCode
`;

export default function CompletionProviderTestPage() {
  const [editorContent, setEditorContent] = useState(SAMPLE_PS1_CONTENT);
  
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setEditorContent(value);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">PSADT AI Completions Test</h1>
      <p className="mb-6">Type PSADT commands (e.g., "Show-", "Execute-") to test the AI-powered code completions</p>
      <div className="p-3 mb-4 bg-blue-100 border border-blue-400 text-blue-700 rounded-md">
        <p className="font-medium">🚀 Using Local Model: sentence-transformers/all-MiniLM-L6-v2</p>
        <p className="text-sm mt-1">This demo uses a locally running sentence-transformers model for high-quality semantic embeddings. The model runs on your GPU if available for fast performance.</p>
      </div>
      
      <div className="border rounded-md overflow-hidden" style={{ height: "70vh" }}>
        <MonacoEditor
          value={editorContent}
          language="powershell"
          onChange={handleEditorChange}
          theme="github-dark"
        />
      </div>
      
      <div className="mt-6 p-4 bg-gray-100 rounded-md text-sm">
        <h2 className="font-bold mb-2">Instructions:</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Type "Show-" on a new line to see PSADT command suggestions</li>
          <li>Press <code className="bg-gray-200 px-1 rounded">Ctrl+Space</code> to manually trigger suggestions</li>
          <li>Hover over PSADT commands for documentation</li>
          <li>Try "Execute-", "Close-", "Start-" or other PSADT command prefixes</li>
          <li>The AI Completions status indicator in the bottom right shows the current state</li>
        </ul>
      </div>
    </div>
  );
}
