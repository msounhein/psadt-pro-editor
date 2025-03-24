"use client";

import React, { useState, useEffect } from 'react';
import { MonacoEditor, editorThemes } from './components/MonacoEditor';
import { FileTree, FileNode } from './components/FileTree';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { organizeFiles, fetchFileContent, determineLanguage } from './components/utils';
import { Loader2 } from 'lucide-react';

// Sample file list for demonstration
const SAMPLE_FILES = [
  'Deploy-Application.ps1',
  'AppDeployToolkit/AppDeployToolkitMain.ps1',
  'AppDeployToolkit/AppDeployToolkitExtensions.ps1',
  'Files/Config.json',
  'SupportFiles/README.md',
  'SupportFiles/Resources/banner.png',
];

// Sample PowerShell content
const SAMPLE_PS1_CONTENT = `<#
.SYNOPSIS
    This is a sample PowerShell script for the PSADT Pro UI.
.DESCRIPTION
    This PowerShell script demonstrates the new Monaco editor integration.
.EXAMPLE
    Deploy-Application.ps1
.NOTES
    Toolkit Version: 3.9.0
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
    # Main application installation
    If ($deploymentType -eq 'Install') {
        Write-Log "Installing application..."
        
        # Install commands go here
        Execute-Process -Path "setup.exe" -Parameters "/silent"
        
        Write-Log "Installation completed successfully!"
    }
    # Uninstallation
    ElseIf ($deploymentType -eq 'Uninstall') {
        Write-Log "Uninstalling application..."
        
        # Uninstall commands go here
        Execute-Process -Path "uninstall.exe" -Parameters "/silent"
        
        Write-Log "Uninstallation completed successfully!"
    }
    # Repair
    ElseIf ($deploymentType -eq 'Repair') {
        Write-Log "Repairing application..."
        
        # Repair commands go here
        Execute-Process -Path "repair.exe" -Parameters "/silent"
        
        Write-Log "Repair completed successfully!"
    }
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

interface SimpleEditorProps {
  templateId?: string;
  templateName?: string;
  templateVersion?: string;
  height?: string;
  initialValue?: string;
  onToggleFullScreen?: () => void;
  isFullScreen?: boolean;
  files?: string[];
}

export const SimpleEditor: React.FC<SimpleEditorProps> = ({ 
  templateId = "", 
  templateName = "PowerShell Script",
  templateVersion,
  height = "100%",
  initialValue = "",
  onToggleFullScreen,
  isFullScreen = false,
  files = SAMPLE_FILES 
}) => {
  // State
  const [fileStructure, setFileStructure] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [editorTheme, setEditorTheme] = useState<string>(editorThemes[0].value);

  // Initialize file structure
  useEffect(() => {
    if (files && files.length > 0) {
      const organized = organizeFiles(files);
      setFileStructure(organized);
      
      // Select first file automatically if none is selected
      if (!selectedFile && files.length > 0) {
        const firstFile = files.find(f => !f.endsWith('/'));
        if (firstFile) {
          handleFileSelect(firstFile);
        }
      }
    }
  }, [files, selectedFile]);

  // Load file content when a file is selected
  const handleFileSelect = async (filePath: string) => {
    if (filePath === selectedFile) return;
    
    setIsLoading(true);
    setSelectedFile(filePath);
    
    try {
      // For demo purposes, return sample content for the first file
      if (filePath === 'Deploy-Application.ps1') {
        setFileContent(SAMPLE_PS1_CONTENT);
      } else {
        const content = await fetchFileContent(filePath, templateId);
        setFileContent(content);
      }
    } catch (error) {
      console.error('Error loading file content:', error);
      setFileContent(`# Error loading file: ${filePath}\n# ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle folder toggle (expand/collapse)
  const handleFolderToggle = (folderPath: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderPath)) {
        newSet.delete(folderPath);
      } else {
        newSet.add(folderPath);
      }
      return newSet;
    });
  };

  // Handle editor content change
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setFileContent(value);
    }
  };

  // Handle theme change
  const handleThemeChange = (theme: string) => {
    setEditorTheme(theme);
  };

  return (
    <div className="flex h-full border rounded-md overflow-hidden">
      {/* File tree sidebar */}
      <div className="w-72 border-r bg-background flex flex-col h-full">
        <div className="p-2 font-medium text-muted-foreground text-sm flex items-center justify-between border-b bg-muted/50">
          Files
        </div>
        <div className="overflow-auto flex-grow">
          <FileTree 
            files={fileStructure}
            selectedFile={selectedFile}
            onFileSelect={handleFileSelect}
            onFolderToggle={handleFolderToggle}
            expandedFolders={expandedFolders}
          />
        </div>
      </div>
      
      {/* Editor section */}
      <div className="flex-grow flex flex-col h-full">
        <div className="flex items-center justify-between p-2 border-b bg-muted/50">
          {/* File name display */}
          <div className="text-sm font-medium truncate">
            {selectedFile || 'No file selected'}
          </div>
          
          {/* Theme switcher */}
          <ThemeSwitcher 
            currentTheme={editorTheme} 
            onThemeChange={handleThemeChange} 
          />
        </div>
        
        {/* Editor container */}
        <div className="flex-grow relative">
          {isLoading ? (
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedFile ? (
            <MonacoEditor
              value={fileContent}
              language={determineLanguage(selectedFile)}
              height="100%"
              theme={editorTheme}
              readOnly={false}
              onChange={handleEditorChange}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              Select a file to view and edit
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 