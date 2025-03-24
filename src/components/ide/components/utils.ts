"use client";

import { FileNode } from './FileTree';

// Utility to convert a flat file list to a hierarchical structure
export const organizeFiles = (fileList: string[]): FileNode[] => {
  const root: Record<string, FileNode> = {};
  
  // First pass: create all file and directory nodes
  fileList.forEach(path => {
    const parts = path.split('/');
    const fileName = parts.pop() || '';
    const dirPath = parts.join('/');
    
    // Create parent directories if they don't exist
    let currentPath = '';
    for (const part of parts) {
      const prevPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      
      if (!root[currentPath]) {
        root[currentPath] = {
          name: part,
          path: currentPath,
          type: 'directory',
          children: []
        };
        
        // Add to parent's children
        if (prevPath && root[prevPath]) {
          root[prevPath].children = root[prevPath].children || [];
          root[prevPath].children.push(root[currentPath]);
        }
      }
    }
    
    // Create file node
    const filePath = dirPath ? `${dirPath}/${fileName}` : fileName;
    root[filePath] = {
      name: fileName,
      path: filePath,
      type: 'file'
    };
    
    // Add to parent's children
    if (dirPath && root[dirPath]) {
      root[dirPath].children = root[dirPath].children || [];
      root[dirPath].children.push(root[filePath]);
    }
  });
  
  // Second pass: assemble the root nodes (those without parents)
  const rootNodes: FileNode[] = [];
  
  Object.values(root).forEach(node => {
    // If this is a top-level node (no slash in path or parent doesn't exist)
    const parentPath = node.path.split('/').slice(0, -1).join('/');
    if (!parentPath || !root[parentPath]) {
      rootNodes.push(node);
    }
  });
  
  return rootNodes;
};

// Get file extension from path
export const getFileExtension = (path: string): string => {
  return path.split('.').pop()?.toLowerCase() || '';
};

// Determine language for Monaco Editor based on file extension
export const determineLanguage = (filePath: string): string => {
  const extension = getFileExtension(filePath);
  
  switch (extension) {
    case 'ps1':
    case 'psm1':
    case 'psd1':
      return 'powershell';
    case 'json':
      return 'json';
    case 'js':
      return 'javascript';
    case 'ts':
      return 'typescript';
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    case 'xml':
      return 'xml';
    case 'md':
      return 'markdown';
    case 'txt':
    case 'log':
      return 'plaintext';
    default:
      return 'plaintext';
  }
};

// Mock API for loading file content
export const fetchFileContent = async (path: string, templateId: string): Promise<string> => {
  try {
    // In a real application, this would make an API call
    // For this example, we'll return mock content
    if (templateId) {
      const response = await fetch(`/api/templates/${templateId}/files/content?filepath=${encodeURIComponent(path)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch file content: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.content || '';
    }
    
    return `# Mock content for ${path}\n\n# This is a placeholder for the actual file content\n`;
  } catch (error) {
    console.error('Error fetching file content:', error);
    return `# Error loading file content\n# ${error instanceof Error ? error.message : 'Unknown error'}\n`;
  }
}; 