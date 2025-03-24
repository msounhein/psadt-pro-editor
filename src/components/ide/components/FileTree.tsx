"use client";

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, FileCode, File, FileText, Folder, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export interface FileTreeProps {
  files: FileNode[];
  selectedFile?: string | null;
  onFileSelect: (filePath: string) => void;
  onFolderToggle?: (folderPath: string) => void;
  expandedFolders?: Set<string>;
}

export const FileTree: React.FC<FileTreeProps> = ({
  files,
  selectedFile,
  onFileSelect,
  onFolderToggle,
  expandedFolders = new Set()
}) => {
  // Get appropriate icon for files
  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'ps1':
      case 'psm1':
      case 'psd1':
        return <FileCode className="h-4 w-4 mr-2 text-blue-400" />;
      case 'txt':
      case 'md':
      case 'log':
        return <FileText className="h-4 w-4 mr-2 text-gray-400" />;
      default:
        return <File className="h-4 w-4 mr-2 text-[#cccccc]" />;
    }
  };

  // Render a single file item
  const renderFile = (file: FileNode) => (
    <div
      key={file.path}
      className={cn(
        "flex items-center px-2 py-1.5 rounded cursor-pointer",
        selectedFile === file.path ? "bg-blue-500/20" : "hover:bg-slate-800/50"
      )}
      onClick={() => onFileSelect(file.path)}
    >
      {getFileIcon(file.name)}
      <span className="text-sm truncate">{file.name}</span>
    </div>
  );

  // Render a directory with its children
  const renderDirectory = (dir: FileNode, level = 0) => {
    const isExpanded = expandedFolders.has(dir.path);
    const hasChildren = dir.children && dir.children.length > 0;
    
    return (
      <div key={dir.path} className="mb-1">
        <div
          className={cn(
            "flex items-center px-2 py-1.5 rounded cursor-pointer",
            isExpanded ? "bg-slate-800/50" : "hover:bg-slate-800/30"
          )}
          onClick={() => onFolderToggle && onFolderToggle(dir.path)}
          style={{ paddingLeft: `${(level * 8) + 8}px` }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 mr-1 flex-shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 mr-1 flex-shrink-0" />
            )
          ) : (
            <div className="w-4 mr-1" /> // Empty space for alignment
          )}
          
          {isExpanded ? (
            <FolderOpen className="h-4 w-4 mr-2 text-yellow-400" />
          ) : (
            <Folder className="h-4 w-4 mr-2 text-yellow-400" />
          )}
          
          <span className="text-sm truncate">{dir.name}</span>
        </div>
        
        {isExpanded && dir.children && (
          <div className="ml-6">
            {dir.children
              .sort((a, b) => {
                // Directories first, then alphabetically
                if (a.type === 'directory' && b.type === 'file') return -1;
                if (a.type === 'file' && b.type === 'directory') return 1;
                return a.name.localeCompare(b.name);
              })
              .map(child => {
                if (child.type === 'directory') {
                  return renderDirectory(child, level + 1);
                } else {
                  return renderFile(child);
                }
              })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-2 h-full overflow-y-auto bg-[#0e1116] text-[#e6edf3]">
      {files.length === 0 ? (
        <div className="text-sm text-gray-400 p-2">No files available</div>
      ) : (
        <div>
          {files
            .sort((a, b) => {
              // Directories first, then alphabetically
              if (a.type === 'directory' && b.type === 'file') return -1;
              if (a.type === 'file' && b.type === 'directory') return 1;
              return a.name.localeCompare(b.name);
            })
            .map(item => {
              if (item.type === 'directory') {
                return renderDirectory(item);
              } else {
                return renderFile(item);
              }
            })}
        </div>
      )}
    </div>
  );
}; 