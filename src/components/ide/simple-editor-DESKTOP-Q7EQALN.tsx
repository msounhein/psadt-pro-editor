"use client";

import React, { useState, useEffect } from 'react';
import { MonacoEditor, editorThemes } from './components/MonacoEditor';
import { FileTree, FileNode } from './components/FileTree';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { organizeFiles, fetchFileContent, determineLanguage } from './components/utils';
import { Loader2, RefreshCw } from 'lucide-react';

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
  isFullScreen = false
}) => {
  // State
  const [fileStructure, setFileStructure] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [editorTheme, setEditorTheme] = useState<string>(editorThemes[0].value);
  const [filePaths, setFilePaths] = useState<string[]>([]);
  const [fileLoadingError, setFileLoadingError] = useState<string | null>(null);
  const [debugApiResponse, setDebugApiResponse] = useState<any>(null);

  // Fetch files from API
  useEffect(() => {
    if (templateId) {
      fetchFileList();
    }
  }, [templateId]);

  const fetchFileList = async () => {
    setIsLoading(true);
    setFileLoadingError(null);
    setDebugApiResponse(null);
    
    try {
      console.log("Fetching files for template:", templateId);
      const response = await fetch(`/api/templates/${templateId}/files`);
      
      // Store the response status for debugging
      const responseStatus = {
        status: response.status,
        statusText: response.statusText
      };
      
      let responseData = null;
      
      try {
        responseData = await response.json();
        setDebugApiResponse({ ...responseStatus, data: responseData });
      } catch (jsonError) {
        setDebugApiResponse({ ...responseStatus, parseError: "Failed to parse JSON response" });
        throw new Error(`Failed to parse API response: ${jsonError}`);
      }
      
      if (!response.ok) {
        // Try to get more error details
        let errorMessage = `Failed to fetch files: ${response.status} ${response.statusText}`;
        if (responseData && responseData.error) {
          errorMessage += ` - ${responseData.error}`;
          if (responseData.message) {
            errorMessage += `: ${responseData.message}`;
          }
        }
        
        throw new Error(errorMessage);
      }
      
      console.log("Files API response:", responseData);
      
      if (responseData.files && Array.isArray(responseData.files)) {
        // Map the file paths to the format needed for organizeFiles
        const paths = responseData.files.map((file: string) => file);
        setFilePaths(paths);
        
        // Select the main Deploy-Application.ps1 file by default if it exists
        const mainFile = paths.find(path => path.endsWith('Deploy-Application.ps1') || path === 'Deploy-Application.ps1');
        if (mainFile) {
          handleFileSelect(mainFile);
        } else if (paths.length > 0) {
          // Otherwise select the first file
          const firstFile = paths.find(path => !path.endsWith('/'));
          if (firstFile) {
            handleFileSelect(firstFile);
          }
        }
      } else {
        setFilePaths([]);
        setFileLoadingError("No files found for this template");
      }
    } catch (error) {
      console.error("Error fetching files:", error);
      setFileLoadingError(`Error loading files: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setFilePaths([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize file structure
  useEffect(() => {
    if (filePaths && filePaths.length > 0) {
      const organized = organizeFiles(filePaths);
      setFileStructure(organized);
    }
  }, [filePaths]);

  // Load file content when a file is selected
  const handleFileSelect = async (filePath: string) => {
    if (filePath === selectedFile) return;
    
    setIsLoading(true);
    setSelectedFile(filePath);
    
    try {
      const content = await fetchFileContent(filePath, templateId);
      setFileContent(content);
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

  // Handle file refresh
  const handleRefresh = () => {
    fetchFileList();
  };

  return (
    <div className="flex h-full border rounded-md overflow-hidden">
      {/* File tree sidebar */}
      <div className="w-72 border-r bg-background flex flex-col h-full">
        <div className="p-2 font-medium text-muted-foreground text-sm flex items-center justify-between border-b bg-muted/50">
          <span>Files</span>
          <button 
            onClick={handleRefresh} 
            className="p-1 hover:bg-slate-800 rounded-sm"
            title="Refresh file list"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
        
        {/* Debug info section */}
        <div className="p-2 border-b border-gray-600 bg-gray-800 text-xs">
          <div><strong>Template ID:</strong> {templateId}</div>
          {templateName && <div><strong>Name:</strong> {templateName}</div>}
          {templateVersion && <div><strong>Version:</strong> {templateVersion}</div>}
        </div>
        
        <div className="overflow-auto flex-grow">
          {isLoading && filePaths.length === 0 ? (
            <div className="w-full h-24 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : fileLoadingError ? (
            <div className="p-2 text-sm">
              <div className="text-red-400 mb-2">{fileLoadingError}</div>
              
              {debugApiResponse && (
                <div className="bg-gray-900 p-2 rounded text-xs mb-2 text-gray-300">
                  <div><strong>Status:</strong> {debugApiResponse.status} {debugApiResponse.statusText}</div>
                  {debugApiResponse.data && (
                    <div className="mt-1">
                      <div><strong>Response:</strong></div>
                      <pre className="text-red-300 whitespace-pre-wrap overflow-auto max-h-24">
                        {JSON.stringify(debugApiResponse.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
              
              <div className="mt-2">
                <button 
                  onClick={handleRefresh}
                  className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : (
            <FileTree 
              files={fileStructure}
              selectedFile={selectedFile}
              onFileSelect={handleFileSelect}
              onFolderToggle={handleFolderToggle}
              expandedFolders={expandedFolders}
            />
          )}
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
          {isLoading && selectedFile ? (
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