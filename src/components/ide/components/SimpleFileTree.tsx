"use client";

import React from 'react';
import { FolderIcon, FileIcon, ChevronDownIcon, ChevronRightIcon } from 'lucide-react';

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
}

interface SimpleFileTreeProps {
  nodes: FileNode[];
  onSelectFile: (path: string) => void;
  selectedFile?: string;
  level?: number;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
}

export const SimpleFileTree: React.FC<SimpleFileTreeProps> = ({ 
  nodes, 
  onSelectFile, 
  selectedFile, 
  level = 0, 
  expandedFolders,
  onToggleFolder
}) => {
  // Sort nodes - folders first, then files
  const sortedNodes = [...nodes].sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="pl-4">
      {sortedNodes.map((node) => {
        const isExpanded = node.isDirectory && expandedFolders.has(node.path);
        const isSelected = selectedFile === node.path;
        
        return (
          <div key={node.path}>
            <div 
              className={`flex items-center py-1 px-1 rounded text-sm ${isSelected ? 'bg-blue-600/30' : 'hover:bg-gray-500/30'} cursor-pointer`}
              onClick={() => node.isDirectory ? onToggleFolder(node.path) : onSelectFile(node.path)}
            >
              {node.isDirectory && (
                <span className="mr-1 inline-block w-4">
                  {isExpanded ? (
                    <ChevronDownIcon className="h-3 w-3" />
                  ) : (
                    <ChevronRightIcon className="h-3 w-3" />
                  )}
                </span>
              )}
              
              {node.isDirectory ? (
                <FolderIcon className="h-4 w-4 mr-2 text-yellow-400" />
              ) : (
                <FileIcon className="h-4 w-4 mr-2 text-blue-400" />
              )}
              
              <span className="truncate">{node.name}</span>
            </div>
            
            {node.isDirectory && isExpanded && node.children && (
              <SimpleFileTree
                nodes={node.children}
                onSelectFile={onSelectFile}
                selectedFile={selectedFile}
                level={level + 1}
                expandedFolders={expandedFolders}
                onToggleFolder={onToggleFolder}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
