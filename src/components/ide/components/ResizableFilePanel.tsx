"use client";

/**
 * ResizableFilePanel.tsx
 * 
 * A resizable file explorer panel component for the PSADT Pro UI editor.
 * This component allows users to resize the file panel and Monaco editor
 * to improve workspace customization.
 */

import React, { useState, useEffect, useRef } from 'react';
import { FileTree, FileNode } from './FileTree';
import { Loader2 } from 'lucide-react';

interface ResizableFilePanelProps {
  files: FileNode[];
  selectedFile: string | null;
  onFileSelect: (filePath: string) => void;
  expandedFolders: Set<string>;
  onFolderToggle: (folderPath: string) => void;
  isLoading?: boolean;
}

export const ResizableFilePanel: React.FC<ResizableFilePanelProps> = ({ 
  files, 
  selectedFile, 
  onFileSelect,
  expandedFolders,
  onFolderToggle,
  isLoading = false
}) => {
  // Default panel width in pixels
  const defaultWidth = 280;
  const minWidth = 200;
  const maxWidth = 600;
  
  // State for current panel width
  const [panelWidth, setPanelWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  // Refs for tracking resize state
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  
  // Set mounted state to ensure we only access localStorage in the browser
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Initialize panel width from localStorage if available (client-side only)
  useEffect(() => {
    if (!isMounted) return;
    
    try {
      const savedWidth = localStorage.getItem('psadt-file-panel-width');
      if (savedWidth) {
        const parsedWidth = parseInt(savedWidth);
        if (!isNaN(parsedWidth) && parsedWidth >= minWidth && parsedWidth <= maxWidth) {
          setPanelWidth(parsedWidth);
        }
      }
    } catch (error) {
      console.warn('Error accessing localStorage:', error);
    }
  }, [isMounted]);

  // Save panel width to localStorage when it changes (client-side only)
  useEffect(() => {
    if (!isMounted) return;
    
    try {
      localStorage.setItem('psadt-file-panel-width', panelWidth.toString());
    } catch (error) {
      console.warn('Error storing in localStorage:', error);
    }
  }, [panelWidth, isMounted]);

  // Handle mouse down on resize handle
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    
    // Add event listeners for mouse move and mouse up
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  // Handle mouse move during resizing
  const handleResize = (e: MouseEvent) => {
    if (!isResizing || !panelRef.current) return;
    
    // Calculate new width based on mouse position
    const panelRect = panelRef.current.getBoundingClientRect();
    const newWidth = e.clientX - panelRect.left;
    
    // Enforce min and max width constraints
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setPanelWidth(newWidth);
    }
  };

  // Handle mouse up to end resize operation
  const handleResizeEnd = () => {
    setIsResizing(false);
    
    // Remove event listeners
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', handleResizeEnd);
  };
  
  // Double-click handler to reset to default width
  const handleDoubleClick = () => {
    setPanelWidth(defaultWidth);
  };

  // Update document cursor during resize
  useEffect(() => {
    if (!isMounted) return;
    
    if (isResizing) {
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    
    // Clean up on component unmount
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isResizing, isMounted]);

  return (
    <div 
      ref={panelRef}
      className="file-panel h-full bg-slate-800 border-r border-slate-700 flex flex-col overflow-hidden relative"
      style={{ 
        width: `${panelWidth}px`,
        minWidth: `${panelWidth}px`,
        maxWidth: `${panelWidth}px`,
        transition: isResizing ? 'none' : 'width 0.1s ease-out'
      }}
    >
      {/* Panel header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-700 bg-slate-900">
        <h2 className="text-sm font-medium text-white">Files</h2>
        <div className="flex items-center space-x-1">
          {/* File panel toolbar could go here */}
        </div>
      </div>
      
      {/* File Explorer */}
      <div className="flex-grow overflow-auto">
        {isLoading ? (
          <div className="p-4 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <FileTree 
            files={files} 
            selectedFile={selectedFile} 
            onFileSelect={onFileSelect}
            expandedFolders={expandedFolders}
            onFolderToggle={onFolderToggle}
          />
        )}
      </div>
      
      {/* Resize handle */}
      <div
        ref={resizeHandleRef}
        className={`resize-handle absolute top-0 right-0 h-full w-2 cursor-ew-resize hover:bg-blue-500 transition-colors ${isResizing ? 'bg-blue-500' : ''}`}
        onMouseDown={handleResizeStart}
        onDoubleClick={handleDoubleClick}
        title="Drag to resize. Double-click to reset."
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          height: '100%',
          width: '4px',
          cursor: 'ew-resize',
          background: isResizing ? 'rgba(59, 130, 246, 0.8)' : 'transparent',
          zIndex: 10
        }}
      />
    </div>
  );
};

export default ResizableFilePanel;
