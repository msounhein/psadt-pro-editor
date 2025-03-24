'use client';

import React, { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { FolderOpen, FileText, FileCode, Info, RefreshCw, ChevronRight, Terminal, Search, Filter } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { PowerShellBreadcrumb, createPathSegments } from '@/components/powershell-breadcrumb';
import { usePathname } from 'next/navigation';
import { serialize } from 'next-mdx-remote/serialize';
import { MDXRemote } from 'next-mdx-remote';
import matter from 'gray-matter';

// Fix for TypeScript styling issue with SyntaxHighlighter
const syntaxStyle = vscDarkPlus as { [key: string]: React.CSSProperties };

// VS Code color variables
const vscodePalette = {
  background: '#0e1116',            // Darker background matching the screenshot
  sidebarBackground: '#0e1116',     // Match main background
  foreground: '#e6edf3',            // Slightly brighter text for better contrast
  border: '#30363d',                // Slightly more visible border
  selectionBackground: '#143d79',   // Brighter blue selection
  activeBlue: '#2188ff',            // Brighter blue for active items
  hoverBackground: '#1c2128',       // Slightly brighter hover
  primaryColor: '#2188ff',          // GitHub blue
  errorColor: '#f85149',            // GitHub red
  warningColor: '#f0883e',          // GitHub orange
  infoColor: '#58a6ff',             // GitHub light blue
  docBlue: '#9CDCFE',               // PowerShell variable color
  headingColor: '#e6edf3',          // Match main text color
  inputBackground: '#0d1117',       // Darker input field
  badge: '#30363d',                 // Darker badge
  exampleBackground: '#2d333b',     // Dark background for examples
  filterButtonBg: '#21262d',        // Darker button background
  filterButtonActiveBg: '#1f6feb',  // GitHub button blue
  filterGroupBg: '#161b22',         // Background for the filter section
  navBackground: '#0d1117',         // Navigation panel background
  headerBackground: '#0d1117',      // Header background
  tabBackground: '#161b22',         // Background for tab bar
  contentBackground: '#0e1116',     // Content area background
  cardShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',  // Material-like shadow
};

interface DocMetadata {
  lastUpdated: string;
  branch: string;
  fileCount: number;
}

interface FileTreeType {
  [key: string]: string[];
}

export default function DocumentationPage() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fileTree, setFileTree] = useState<FileTreeType>({});
  const [metadata, setMetadata] = useState<DocMetadata | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [currentFilePath, setCurrentFilePath] = useState<string>('');
  const [fileType, setFileType] = useState<string>('md');
  const [activeDirectory, setActiveDirectory] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [commandPrefixes, setCommandPrefixes] = useState<string[]>([]);
  const [selectedPrefix, setSelectedPrefix] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<string>('preview');
  const [selectedCommand, setSelectedCommand] = useState<string>('');
  const { toast } = useToast();
  const pathname = usePathname();
  const breadcrumbSegments = createPathSegments(pathname);
  const [mdxSource, setMdxSource] = useState<any>(null);
  const [commandGroups, setCommandGroups] = useState<Record<string, string[]>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [lastClickedCommand, setLastClickedCommand] = useState<string>('');

  useEffect(() => {
    fetchDocumentationList();
  }, []);

  // New useEffect to automatically animate all commands on page load
  useEffect(() => {
    if (Object.keys(commandGroups).length > 0) {
      // Get the first available command from any group
      const firstGroupWithCommands = Object.keys(commandGroups).find(
        group => commandGroups[group].length > 0
      );
      
      if (firstGroupWithCommands) {
        // Expand the first group
        setExpandedGroups(prev => ({
          ...prev,
          [firstGroupWithCommands]: true
        }));
        
        // Set all commands as "clicked" so they all animate
        const allCommands = Object.values(commandGroups).flat();
        if (allCommands.length > 0) {
          setLastClickedCommand('ALL_COMMANDS');
          // Also set the first command as selected to trigger the gradient animation
          setSelectedCommand(allCommands[0]);
        }
      }
    }
  }, [commandGroups]);

  // Extract command prefixes from file names
  useEffect(() => {
    if (Object.keys(fileTree).length > 0) {
      const allFiles = Object.values(fileTree).flat();
      const prefixes = new Set<string>();
      const prefixMap: Record<string, string[]> = {};
      
      // First, collect all unique command prefixes
      allFiles.forEach(file => {
        const fileName = file.split('/').pop() || '';
        if (fileName.includes('-')) {
          const prefix = fileName.split('-')[0];
          if (prefix) {
            prefixes.add(prefix);
            
            // Group commands by prefix
            if (!prefixMap[prefix]) {
              prefixMap[prefix] = [];
            }
            
            // Extract the command name (e.g., "Add-ADTRegistryValue" -> "Add")
            const commandName = fileName.split('.')[0]; // Remove file extension
            if (commandName && !prefixMap[prefix].includes(commandName)) {
              prefixMap[prefix].push(commandName);
            }
          }
        }
      });
      
      setCommandPrefixes(['All', ...Array.from(prefixes).sort()]);
      setCommandGroups(prefixMap);
    }
  }, [fileTree]);

  const fetchDocumentationList = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/docs');
      const data = await response.json();
      
      if (data.success) {
        setFileTree(data.fileTree);
        setMetadata(data.metadata);
        
        // If there's a README.md file at the root, load it by default
        const rootFiles = data.fileTree[''] || [];
        const readmePath = rootFiles.find((file: string) => 
          file.toLowerCase() === 'readme.md');
        
        if (readmePath) {
          fetchDocumentationFile(readmePath);
        } else {
          // Add a slight delay to ensure the loading spinner is visible
          setTimeout(() => {
            setIsLoading(false);
          }, 1000);
        }
      } else {
        console.error('Failed to load documentation list:', data.error);
        toast({
          title: 'Error',
          description: 'Failed to load documentation list.',
          variant: 'destructive'
        });
        // Add a slight delay for the loading spinner
        setTimeout(() => {
          setIsLoading(false);
        }, 1000);
      }
    } catch (error) {
      console.error('Error fetching documentation list:', error);
      toast({
        title: 'Error',
        description: 'Failed to load documentation list.',
        variant: 'destructive'
      });
      // Add a slight delay for the loading spinner
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    }
  };

  const fetchDocumentationFile = async (filePath: string) => {
    try {
      // Start loading animation
      setFileContent('');
      setMdxSource(null);
      setCurrentFilePath(filePath);
      setIsLoading(true);
      
      // Set file type based on extension
      const ext = filePath.split('.').pop()?.toLowerCase() || 'md';
      setFileType(ext);
      
      // Extract the command name from the file path
      const fileName = filePath.split('/').pop() || '';
      const commandName = fileName.split('.')[0]; // Remove file extension
      setSelectedCommand(commandName);
      
      // If we have a command name with a prefix, auto-select the prefix and expand the group
      if (commandName.includes('-')) {
        const prefix = commandName.split('-')[0];
        if (commandPrefixes.includes(prefix)) {
          setSelectedPrefix(prefix);
          setExpandedGroups(prev => ({
            ...prev,
            [prefix]: true
          }));
        }
      }
      
      const response = await fetch(`/api/docs?path=${encodeURIComponent(filePath)}`);
      const data = await response.json();
      
      if (data.success) {
        setFileContent(data.content);
        
        // If it's an MDX file, serialize it for rendering
        if (ext === 'mdx' || ext === 'md') {
          try {
            // Parse frontmatter ourselves as a backup
            try {
              const { data: frontmatterData } = matter(data.content);
              console.log('Extracted frontmatter with gray-matter:', frontmatterData);
            } catch (matterError) {
              console.error('Error extracting frontmatter with gray-matter:', matterError);
            }
            
            const mdxSource = await serialize(data.content, {
              parseFrontmatter: true,
              mdxOptions: {
                rehypePlugins: [],
                remarkPlugins: [remarkGfm],
              },
            });
            
            // Log frontmatter to debug
            console.log('MDX Frontmatter:', mdxSource.frontmatter);
            
            setMdxSource(mdxSource);
          } catch (mdxError) {
            console.error('Error serializing MDX:', mdxError);
            // Fallback to regular markdown if MDX serialization fails
            setMdxSource(null);
          }
        }
        
        // Add a slight delay before removing the loading state
        setTimeout(() => {
          setIsLoading(false);
        }, 1000);
      } else {
        console.error('Failed to load file:', data.error);
        toast({
          title: 'Error',
          description: `Failed to load file: ${data.error}`,
          variant: 'destructive'
        });
        setFileContent('Error loading file content.');
        
        // Add a slight delay before removing the loading state
        setTimeout(() => {
          setIsLoading(false);
        }, 1000);
      }
    } catch (error) {
      console.error('Error fetching file:', error);
      toast({
        title: 'Error',
        description: 'Failed to load file content.',
        variant: 'destructive'
      });
      setFileContent('Error loading file content.');
      
      // Add a slight delay before removing the loading state
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    }
  };

  // Get an appropriate icon based on file name/extension
  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    const iconStyle = {
      filter: 'drop-shadow(0 1px 1px rgba(0, 0, 0, 0.3))',
      transition: 'transform 0.2s ease',
    };
    
    if (extension === 'md') {
      return (
        <div className="flex items-center justify-center w-5 h-5 rounded-lg" style={{ backgroundColor: 'rgba(117, 190, 255, 0.1)' }}>
          <FileText size={14} style={{ color: '#75beff', ...iconStyle }} />
        </div>
      );
    } else if (extension === 'mdx') {
      return (
        <div className="flex items-center justify-center w-5 h-5 rounded-lg" style={{ backgroundColor: 'rgba(77, 171, 247, 0.1)' }}>
          <FileText size={14} style={{ color: '#4dabf7', ...iconStyle }} />
        </div>
      );
    } else if (extension === 'ps1' || extension === 'psm1') {
      return (
        <div className="flex items-center justify-center w-5 h-5 rounded-lg" style={{ backgroundColor: 'rgba(103, 150, 230, 0.1)' }}>
          <Terminal size={14} style={{ color: '#6796e6', ...iconStyle }} />
        </div>
      );
    } else if (extension === 'js' || extension === 'jsx' || extension === 'ts' || extension === 'tsx') {
      return (
        <div className="flex items-center justify-center w-5 h-5 rounded-lg" style={{ backgroundColor: 'rgba(230, 216, 116, 0.1)' }}>
          <FileCode size={14} style={{ color: '#e6d874', ...iconStyle }} />
        </div>
      );
    } else {
      return (
        <div className="flex items-center justify-center w-5 h-5 rounded-lg" style={{ backgroundColor: 'rgba(204, 204, 204, 0.1)' }}>
          <FileText size={14} style={{ color: '#cccccc', ...iconStyle }} />
        </div>
      );
    }
  };

  const formatLastUpdated = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const refreshDocumentation = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    toast({
      title: 'Refreshing documentation',
      description: 'Please wait while we update the documentation...'
    });
    
    try {
      // Call the API endpoint to trigger the PowerShell script
      const response = await fetch('/api/docs/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Documentation refreshed',
          description: 'Documentation has been successfully updated.',
          variant: 'default'
        });
        
        // Reload the documentation list
        await fetchDocumentationList();
      } else {
        console.error('Failed to refresh documentation:', data.error);
        toast({
          title: 'Error',
          description: `Failed to refresh documentation: ${data.error}`,
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error refreshing documentation:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh documentation.',
        variant: 'destructive'
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Toggle a group's expanded state
  const toggleGroupExpanded = (prefix: string, event?: React.MouseEvent) => {
    // Stop event propagation if called from a click event
    if (event) {
      event.stopPropagation();
    }
    
    setExpandedGroups(prev => ({
      ...prev,
      [prefix]: !prev[prefix]
    }));
  };

  // Function to filter files by specific command
  const filterFilesByCommand = (command: string) => {
    setSelectedCommand(command);
    setLastClickedCommand(command); // Set the last clicked command for animation
    
    // Keep the selected command visible in the UI
    setTimeout(() => {
      const commandElements = document.querySelectorAll('.command-item');
      commandElements.forEach(el => {
        // Cast the element to HTMLElement to access style property
        const element = el as HTMLElement;
        // Ensure all command elements are visible
        element.style.opacity = '1';
        element.style.visibility = 'visible';
        element.style.display = 'flex';
      });
    }, 10);
    
    const filteredFiles = Object.values(fileTree).flat().filter(file => {
      const fileName = file.split('/').pop() || '';
      return fileName.startsWith(command);
    });
    
    if (filteredFiles.length > 0) {
      // Load the first matching file
      fetchDocumentationFile(filteredFiles[0]);
      
      // Find the directory this file is in and expand it
      const directory = Object.keys(fileTree).find(dir => 
        (fileTree[dir] || []).some(file => file.split('/').pop()?.startsWith(command))
      );
      
      if (directory !== undefined) {
        setActiveDirectory(directory);
      }
    }
  };

  // Filter files based on search term and selected prefix
  const filterFiles = (files: string[]) => {
    let filteredFiles = files;
    
    // Apply search filter
    if (searchTerm) {
      filteredFiles = filteredFiles.filter(file => 
        file.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply prefix filter
    if (selectedPrefix !== 'All') {
      filteredFiles = filteredFiles.filter(file => {
        const fileName = file.split('/').pop() || '';
        return fileName.startsWith(`${selectedPrefix}-`);
      });
    }
    
    return filteredFiles;
  };

  // Render the command filter bar
  const renderCommandFilterBar = () => {
    if (commandPrefixes.length <= 1) return null;
    
    // We'll use grouped buttons by prefix instead of grid rows
    const prefixesWithoutAll = commandPrefixes.filter(p => p !== 'All');
    
    return (
      // This is the command filter bar
      <div className="flex flex-col space-y-4" style={{ 
        borderRadius: '8px', 
        padding: '5px 5px', 
        width: '100%',
        maxWidth: '100%',
        overflowX: 'hidden',
        minWidth: 0
      }}>
        {/* 'All' button removed */}
        
        {/* Section divider */}
        <div className="flex items-center gap-2 w-full overflow-hidden">
          <div className="h-px flex-grow bg-gradient-to-r from-transparent via-[rgba(65,130,255,0.3)] to-transparent"></div>
          <span className="text-xs opacity-50 whitespace-nowrap flex-shrink-0">By Prefix</span>
          <div className="h-px flex-grow bg-gradient-to-r from-transparent via-[rgba(65,130,255,0.3)] to-transparent"></div>
        </div>
        
        {/* Command groups by prefix */}
        <div className="space-y-2 w-full overflow-hidden" style={{ minWidth: 0 }}>
          {prefixesWithoutAll.map((prefix, groupIndex, groupArray) => {
            const isExpanded = expandedGroups[prefix] || false;
            const isSelected = selectedPrefix === prefix;
            const commandsInGroup = commandGroups[prefix] || [];
            const isLastGroup = groupIndex === groupArray.length - 1;
            
            return (
              <React.Fragment key={`group-${prefix}`}>
                <div className="command-group space-y-0">
                  {/* Group header with chevron */}
                  <div 
                    className={`group-header relative flex items-center cursor-pointer ${
                      isSelected ? 'active-prefix' : ''
                    }`}
                    onClick={() => {
                      setSelectedPrefix(prefix);
                      toggleGroupExpanded(prefix);
                    }}
                    style={{
                      borderRadius: '8px',
                      padding: '5px 5px 5px 5px',
                      transition: 'all 0.3s ease',
                      marginLeft: isSelected ? '-0px' : '0',
                      width: '100%',
                      maxWidth: '100%',
                      overflow: 'hidden',
                      minWidth: 0, // Required for proper flex children sizing
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'flex-start'
                    }}
                  >
                    <div className="flex items-center mb-0 w-full overflow-hidden" style={{ minWidth: 0 }}>
                      <div className="w-4 h-4 mr-1 flex-shrink-0 flex items-center justify-center">
                        <ChevronRight 
                          size={14} 
                          className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                          style={{ 
                            color: isSelected ? 'rgba(65, 130, 255, 0.8)' : 'rgba(255, 255, 255, 0.4)',
                            opacity: isSelected ? 1 : 0.7
                          }}
                        />
                      </div>
                      <div className="w-1.5 h-1.5 rounded-full mr-2 flex-shrink-0" style={{ 
                        backgroundColor: isSelected ? 'rgba(65, 130, 255, 0.8)' : 'rgba(65, 130, 255, 0.3)',
                        boxShadow: isSelected ? '0 0 2px rgba(65, 130, 255, 0.4)' : 'none'
                      }}></div>
                      <span className="text-sm font-medium uppercase tracking-wider truncate" style={{ 
                        color: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
                        textShadow: isSelected ? 'none' : 'none',
                        maxWidth: 'calc(100% - 50px)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: '1 1 auto',
                        minWidth: 0
                      }}>
                        {prefix}
                      </span>
                      <span className="bg-[rgba(33,136,255,0.15)] ml-auto px-1.5 py-0.5 rounded text-xs relative flex-shrink-0">
                        {commandsInGroup.length}
                      </span>
                    </div>
                  </div>
                  
                  {/* Individual command list (shown when expanded) */}
                  {isExpanded && commandsInGroup.length > 0 && (
                    <div className="ml-2 mt-2 space-y-0 overflow-hidden transition-all duration-600 animate-fadeIn" style={{
                      width: "100%",
                      maxWidth: "100%",
                      minWidth: 0,
                      paddingRight: "5px",
                      opacity: 1,
                      visibility: "visible"
                    }}>
                      {commandsInGroup.map((command, index, arr) => {
                        // Find matching files for this command
                        const matchingFiles = Object.values(fileTree).flat().filter(file => {
                          const fileName = file.split('/').pop() || '';
                          return fileName.startsWith(command);
                        });
                        
                        const isCommandSelected = selectedCommand === command;
                        const shouldAnimate = lastClickedCommand === command;
                        const isLastItem = index === arr.length - 1;
                        
                        return (
                          <React.Fragment key={command}>
                            <div 
                              className={`command-item text-sm py-3 px-4 rounded-xl flex items-center justify-between cursor-pointer hover transition-all m2 ${isCommandSelected ? 'selected-command' : ''}`}
                              style={{
                                backgroundColor: isCommandSelected 
                                  ? 'rgba(65, 130, 255, 0.15)' 
                                  : 'rgba(13, 17, 23, 0.5)',
                                border: `1px solid ${isCommandSelected 
                                  ? 'rgba(65, 130, 255, 0.4)' 
                                  : 'rgba(48, 54, 61, 0.25)'}`,
                                color: isCommandSelected 
                                  ? '#ffffff' 
                                  : `${vscodePalette.foreground}cc`,
                                boxShadow: isCommandSelected 
                                  ? (shouldAnimate ? '0 1px 3px rgba(65, 130, 255, 0.3)' : 'none')
                                : 'none',
                                backdropFilter: 'blur(4px)',
                                transform: isCommandSelected && shouldAnimate ? 'translateX(4px)' : 'none',
                                position: 'relative',
                                overflow: 'hidden',
                                fontSize: '13.2px',
                                paddingRight: '80px',
                                zIndex: isCommandSelected ? 10 : 0,
                                width: '100%',
                                minWidth: 0,
                                marginBottom: '1px',
                                transition: 'all 0.3s ease-out',
                                animationDelay: `${lastClickedCommand === 'ALL_COMMANDS' ? index * 0.05 : 0}s`,
                                opacity: 1,
                                visibility: 'visible',
                                display: 'flex'
                              }}
                              onClick={() => {
                                filterFilesByCommand(command);
                              }}
                            >
                              {(isCommandSelected && shouldAnimate || lastClickedCommand === 'ALL_COMMANDS') && (
                                <div className="absolute inset-0 bg-gradient-to-r from-[rgba(65,130,255,0.1)] to-transparent opacity-50 m4" 
                                  style={{ 
                                    borderRadius: '8px',
                                    animation: 'gradientPulse 2s ease-in-out infinite',
                                    backgroundSize: '200% 100%'
                                  }}
                                ></div>
                              )}
                              <div className="flex items-center relative z-10 overflow-hidden flex-grow mr-2" style={{ minWidth: 0 }}>
                                <div className="w-1 h-5 rounded-full mr-2 flex-shrink-0" style={{ 
                                  backgroundColor: isCommandSelected 
                                    ? 'rgba(65, 130, 255, 0.8)' 
                                    : 'rgba(65, 130, 255, 0.3)',
                                  boxShadow: isCommandSelected 
                                    ? '0 0 3px rgba(65, 130, 255, 0.3)' 
                                    : 'none'
                                }}></div>
                                <span className="truncate" style={{ 
                                  maxWidth: 'calc(100% - 20px)', 
                                  fontSize: '13.2px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  flex: '1 1 auto',
                                  minWidth: 0
                                }}>{command}</span>
                              </div>
                              {isCommandSelected && (
                                <div className="text-xs relative z-10 bg-[rgba(33,136,255,0.2)] px-1.5 py-0.5 rounded-sm active-badge" style={{ 
                                  position: 'absolute', 
                                  right: '12px', 
                                  top: '50%', 
                                  transform: 'translateY(-50%)',
                                  whiteSpace: 'nowrap'
                                }}>
                                  active
                                </div>
                              )}
                            </div>
                            {!isLastItem && (
                              <div 
                                className="divider-line mx-auto" 
                                style={{ 
                                  height: '1px', 
                                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                  width: 'calc(100% - 20px)',
                                  margin: '2px auto'
                                }}
                              />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}
                </div>
                
                {/* Add divider between group headers */}
                {!isLastGroup && (
                  <div 
                    className="group-divider mx-auto" 
                    style={{ 
                      height: '1px', 
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      width: 'calc(100% - 16px)',
                      margin: '8px auto 8px auto'
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  // Function to render the file tree
  const renderFileTree = () => {
    // Filter directories and files based on search term and selected prefix
    const directories = Object.keys(fileTree)
      .filter(dir => !searchTerm || dir.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort();
    
    return (
      <div>
        {directories.map((directory, i) => {
          const files = filterFiles(fileTree[directory] || []);
          
          if (files.length === 0) return null;
          
          const displayDirectory = directory || 'root';
          const isActive = directory === activeDirectory;
          const dirKey = `dir-${i}-${displayDirectory}`;
          
          return (
            <div key={dirKey} className="mb-3">
              {/* Directory header */}
              <div 
                className="flex items-center py-2 px-3 rounded-xl text-sm font-medium cursor-pointer transition-colors duration-200"
                style={{ 
                  backgroundColor: isActive ? vscodePalette.hoverBackground : 'transparent',
                  color: isActive ? vscodePalette.primaryColor : vscodePalette.foreground,
                  boxShadow: isActive ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none',
                  letterSpacing: '0.01em'
                }}
                onClick={() => setActiveDirectory(isActive ? '' : directory)}
              >
                <div className="flex items-center justify-center w-5 h-5 mr-2">
                  <ChevronRight 
                    size={16} 
                    className={`transition-transform duration-200 ${isActive ? 'rotate-90' : ''}`}
                    style={{ color: isActive ? vscodePalette.primaryColor : 'rgba(230, 237, 243, 0.6)' }}
                  />
                </div>
                <div 
                  className="flex items-center justify-center w-6 h-6 mr-2 rounded-lg"
                  style={{ 
                    backgroundColor: isActive ? 'rgba(33, 136, 255, 0.1)' : 'rgba(33, 136, 255, 0.05)',
                  }}
                >
                  <FolderOpen 
                    size={14} 
                    style={{ color: isActive ? vscodePalette.primaryColor : '#2188ff' }}
                  />
                </div>
                <span className="truncate">{displayDirectory}</span>
                <span 
                  className="ml-2 px-1.5 py-0.5 text-xs rounded-lg font-normal"
                  style={{ 
                    backgroundColor: isActive ? 'rgba(33, 136, 255, 0.2)' : 'rgba(230, 237, 243, 0.1)',
                    color: isActive ? vscodePalette.primaryColor : 'rgba(230, 237, 243, 0.6)'
                  }}
                >
                  {files.length}
                </span>
              </div>
              
              {/* Files in directory */}
              {isActive && (
                <div className="ml-6 mt-2 space-y-1.5">
                  {files.map((file, j) => {
                    const fileName = file.split('/').pop() || '';
                    const isActiveFile = file === currentFilePath;
                    const fileKey = `file-${i}-${j}-${fileName}`;
                    
                    return (
                      <div 
                        key={fileKey}
                        className="flex items-center py-1.5 px-3 text-base rounded-xl cursor-pointer transition-all duration-200 hover:translate-x-1"
                        style={{ 
                          backgroundColor: isActiveFile ? vscodePalette.selectionBackground : 'transparent',
                          color: isActiveFile ? vscodePalette.foreground : `${vscodePalette.foreground}cc`,
                          boxShadow: isActiveFile ? '0 1px 3px rgba(0, 0, 0, 0.15)' : 'none',
                          fontWeight: isActiveFile ? '500' : '400',
                          letterSpacing: '0.01em'
                        }}
                        onClick={() => fetchDocumentationFile(file)}
                      >
                        <div className="mr-2">
                          {getFileIcon(fileName)}
                        </div>
                        <span className="truncate">{fileName}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Custom components for ReactMarkdown with VS Code-inspired styling
  const markdownComponents = {
    code({className, children, ...props}: any) {
      const match = /language-(\w+)/.exec(className || '');
      return match ? (
        <SyntaxHighlighter
          style={syntaxStyle}
          language={match[1]}
          PreTag="div"
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
          className="syntax-highlighter-transition"
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code 
          className="px-1.5 py-0.5 rounded text-sm" 
          style={{ 
            background: 'var(--vscode-textPreformat-background, #3c3c3c)',
            color: 'var(--vscode-textPreformat-foreground, #d0d0d0)',
            fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
            letterSpacing: '0.01em'
          }}
          {...props}
        >
          {children}
        </code>
      );
    },
    // Style inline code (backticks)
    inlineCode({children}: any) {
      return (
        <code 
          className="px-1.5 py-0.5 rounded text-sm"
          style={{ 
            background: 'var(--vscode-textCodeBlock-background, #2b2b2b)',
            color: 'var(--vscode-textPreformat-foreground, #d0d0d0)',
            fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
            letterSpacing: '0.01em'
          }}
        >
          {children}
        </code>
      );
    },
    // Add custom styling for headings
    h1({children}: any) {
      return <h1 className="text-2xl font-bold mt-6 mb-4" style={{ color: vscodePalette.headingColor }}>{children}</h1>;
    },
    h2({children}: any) {
      return <h2 className="text-xl font-bold mt-5 mb-3" style={{ color: vscodePalette.headingColor }}>{children}</h2>;
    },
    h3({children}: any) {
      // Style section headers (DESCRIPTION, PARAMETERS, EXAMPLES, etc.) 
      const text = typeof children === 'string' ? children : '';
      if (['DESCRIPTION', 'PARAMETERS', 'EXAMPLES', 'EXAMPLE 1', 'SYNTAX', 'NOTES'].includes(text)) {
        return <h3 className="text-lg font-bold mt-4 mb-2" style={{ color: vscodePalette.docBlue }}>{children}</h3>;
      }
      return <h3 className="text-lg font-bold mt-4 mb-2" style={{ color: vscodePalette.headingColor }}>{children}</h3>;
    },
    // Style list items
    li({children}: any) {
      return <li className="mb-1">{children}</li>;
    },
    // Style block quotes
    blockquote({children}: any) {
      return (
        <blockquote 
          className="pl-4 border-l-4 my-4" 
          style={{ 
            borderColor: 'var(--vscode-textBlockQuote-border, #616161)',
            background: 'var(--vscode-textBlockQuote-background, #2b2b2b)'
          }}
        >
          {children}
        </blockquote>
      );
    },
    // Add spacing for paragraph elements
    p({children}: any) {
      return <p className="mb-4">{children}</p>;
    },
    // Style links
    a({children, href}: any) {
      return (
        <a 
          href={href} 
          className="underline hover:no-underline" 
          style={{ color: 'var(--vscode-textLink-foreground, #4daafc)' }}
          target="_blank" 
          rel="noopener noreferrer"
        >
          {children}
        </a>
      );
    },
    // Style strong text elements
    strong({children}: any) {
      return <strong style={{ color: vscodePalette.docBlue }}>{children}</strong>;
    },
    // Add custom styling for tables
    table({children}: any) {
      return (
        <div className="overflow-x-auto my-4">
          <table className="min-w-full border-collapse">{children}</table>
        </div>
      );
    },
    th({children}: any) {
      return (
        <th 
          className="px-4 py-2 text-left font-medium text-sm" 
          style={{ 
            borderBottom: `1px solid ${vscodePalette.border}`,
            color: vscodePalette.docBlue
          }}
        >
          {children}
        </th>
      );
    },
    td({children}: any) {
      return (
        <td 
          className="px-4 py-2 text-sm" 
          style={{ borderBottom: `1px solid ${vscodePalette.border}` }}
        >
          {children}
        </td>
      );
    }
  };

  // Format the stylesheet for the ReactMarkdown component
  const markdownStyles = `
    .markdown-body * {
      max-width: 100%;
    }
    .markdown-body {
      color: ${vscodePalette.foreground};
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      font-size: 15.4px;
      line-height: 1.7;
      word-wrap: break-word;
      overflow-wrap: break-word;
      word-break: break-word;
      max-width: 100%;
      font-weight: 400;
      letter-spacing: -0.011em;
      overflow: hidden;
    }
    
    /* Content transition effects */
    @keyframes blurFadeIn {
      0% {
        opacity: 0;
        filter: blur(10px);
        transform: scale(0.98);
      }
      100% {
        opacity: 1;
        filter: blur(0px);
        transform: scale(1);
      }
    }
    
    /* Tab transition effects */
    @keyframes tabTransition {
      0% {
        opacity: 0;
        filter: blur(5px);
      }
      100% {
        opacity: 1;
        filter: blur(0px);
      }
    }
    
    .tab-content-appear {
      animation: tabTransition 0.3s ease-out forwards;
    }
    
    .content-transition {
      animation: blurFadeIn 0.4s ease-out forwards;
      will-change: opacity, filter, transform;
    }
    
    /* Add a slight delay for the markdown body for a staggered effect */
    .markdown-body {
      animation: blurFadeIn 0.5s ease-out forwards;
      animation-delay: 0.1s;
      opacity: 0;
    }
    .markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4, .markdown-body h5, .markdown-body h6 {
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
      color: ${vscodePalette.headingColor};
      letter-spacing: -0.02em;
      line-height: 1.3;
    }
    .markdown-body h1 {
      font-size: 2em;
      border-bottom: 1px solid ${vscodePalette.border};
      padding-bottom: 0.3em;
    }
    .markdown-body h2 {
      font-size: 1.5em;
      border-bottom: 1px solid ${vscodePalette.border};
      padding-bottom: 0.3em;
    }
    .markdown-body h3 {
      font-size: 1.25em;
    }
    .markdown-body p, .markdown-body blockquote, .markdown-body ul, .markdown-body ol, 
    .markdown-body dl, .markdown-body table, .markdown-body pre {
      margin-top: 0;
      margin-bottom: 16px;
      line-height: 1.6;
    }
    .markdown-body hr {
      height: 1px;
      padding: 0;
      margin: 24px 0;
      background-color: ${vscodePalette.border};
      border: 0;
    }
    .markdown-body blockquote {
      padding: 0.5em 1em;
      color: ${vscodePalette.foreground}cc;
      border-left: 0.25em solid ${vscodePalette.border};
      background-color: rgba(255, 255, 255, 0.03);
      border-radius: 0 12px 12px 0;
    }
    .markdown-body pre {
      background-color: #0d1117;
      border-radius: 12px;
      padding: 16px;
      overflow: auto;
      max-width: 100%;
      white-space: pre-wrap;
      word-break: break-all;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
    }
    .markdown-body code {
      font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 93.5%;
      padding: 0.2em 0.4em;
      margin: 0;
      background-color: rgba(110, 118, 129, 0.1);
      border-radius: 8px;
    }
    .markdown-body pre code {
      padding: 0;
      background-color: transparent;
      border-radius: 0;
    }
    .markdown-body table {
      width: 100%;
      border-collapse: collapse;
      border-spacing: 0;
      overflow: auto;
      margin-top: 0;
      margin-bottom: 16px;
      border-radius: 12px;
      overflow: hidden;
      display: block;
      max-width: 100%;
    }
    .markdown-body table th, .markdown-body table td {
      padding: 8px 13px;
      border: 1px solid ${vscodePalette.border};
      word-break: break-word;
      max-width: 300px;
    }
    .markdown-body table tr {
      background-color: ${vscodePalette.background};
      border-top: 1px solid ${vscodePalette.border};
    }
    .markdown-body table tr:nth-child(2n) {
      background-color: ${vscodePalette.tabBackground};
    }
    .markdown-body table th {
      font-weight: 600;
      background-color: rgba(255, 255, 255, 0.03);
    }
    .markdown-body img {
      max-width: 100%;
      box-sizing: border-box;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }
    .markdown-body .hljs {
      display: block;
      overflow-x: auto;
      padding: 1em;
      color: ${vscodePalette.foreground};
      background: #0d1117;
      border-radius: 12px;
    }
    .markdown-body ul, .markdown-body ol {
      padding-left: 2em;
    }
    .markdown-body li + li {
      margin-top: 0.25em;
    }
    .markdown-body a {
      color: #58a6ff;
      text-decoration: none;
      border-bottom: 1px solid rgba(88, 166, 255, 0.4);
      transition: border-color 0.2s ease;
    }
    .markdown-body a:hover {
      border-color: rgba(88, 166, 255, 0.8);
    }
    .glow-button {
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% {
        box-shadow: 0 0 5px rgba(33, 136, 255, 0.4), inset 0 0 2px rgba(33, 136, 255, 0.2);
      }
      70% {
        box-shadow: 0 0 12px rgba(33, 136, 255, 0.6), inset 0 0 7px rgba(33, 136, 255, 0.4);
      }
      100% {
        box-shadow: 0 0 5px rgba(33, 136, 255, 0.4), inset 0 0 2px rgba(33, 136, 255, 0.2);
      }
    }
    
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-5px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .animate-fadeIn {
      animation: fadeIn 0.3s ease-out forwards;
    }
    
    @keyframes fadeSlideIn {
      from {
        opacity: 0;
        transform: translateX(-8px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
    
    /* Updated animation for selected commands */
    @keyframes commandSelectedAnimation {
      0% {
        transform: translateX(0);
        background-color: rgba(65, 130, 255, 0.15);
      }
      50% {
        transform: translateX(4px);
        background-color: rgba(65, 130, 255, 0.25);
      }
      100% {
        transform: translateX(2px);
        background-color: rgba(65, 130, 255, 0.2);
      }
    }
    
    .command-item {
      animation: fadeSlideIn 0.2s ease-out forwards;
      opacity: 1 !important;
      visibility: visible !important;
      animation-fill-mode: both;
    }
    
    /* Apply the updated animation to selected commands */
    .selected-command {
      animation: commandSelectedAnimation 0.5s ease-out forwards !important;
      opacity: 1 !important;
      visibility: visible !important;
      display: flex !important;
    }
    
    @keyframes subtleHighlight {
      0% {
        background-color: rgba(31, 111, 235, 0.05);
      }
      50% {
        background-color: rgba(31, 111, 235, 0.12);
      }
      100% {
        background-color: rgba(31, 111, 235, 0.05);
      }
    }
    
    .active-prefix {
      animation: subtleHighlight 3s ease-in-out infinite;
      position: relative;
    }
    
    .active-prefix::after {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 2px;
      background-color: rgba(65, 130, 255, 0.8);
    }
    
    .filter-section {
      position: relative;
      z-index: 1;
    }
    
    .filter-section::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: 
        radial-gradient(
          circle at 50% 50%, 
          transparent 85%, 
          rgba(33, 136, 255, 0.1) 100%
        );
      z-index: -1;
    }
    
    .filter-section::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: 
        linear-gradient(90deg, 
          transparent 0%, 
          rgba(33, 136, 255, 0.05) 50%, 
          transparent 100%
        );
      z-index: -1;
      animation: scanline 4s linear infinite;
    }
    
    @keyframes scanline {
      0% {
        transform: translateX(-100%);
        opacity: 0;
      }
      50% {
        opacity: 1;
      }
      100% {
        transform: translateX(100%);
        opacity: 0;
      }
    }
    
    @keyframes commandPulse {
      0% {
        box-shadow: 0 0 8px rgba(65, 130, 255, 0.3), inset 0 0 5px rgba(65, 130, 255, 0.1);
        border-color: rgba(65, 130, 255, 0.6);
      }
      50% {
        box-shadow: 0 0 15px rgba(65, 130, 255, 0.5), inset 0 0 8px rgba(65, 130, 255, 0.3);
        border-color: rgba(65, 130, 255, 0.9);
      }
      100% {
        box-shadow: 0 0 8px rgba(65, 130, 255, 0.3), inset 0 0 5px rgba(65, 130, 255, 0.1);
        border-color: rgba(65, 130, 255, 0.6);
      }
    }
    
    .selected-command::before {
      content: '';
      position: absolute;
      left: -1px;
      top: 0;
      bottom: 0;
      width: 3px;
      background: rgba(65, 130, 255, 0.8);
      border-radius: 0 2px 2px 0;
    }
    
    .animate-command::before {
      animation: subtlePulse 3s ease-in-out infinite;
    }
    
    @keyframes subtlePulse {
      0% {
        opacity: 0.7;
      }
      50% {
        opacity: 1;
      }
      100% {
        opacity: 0.7;
      }
    }
    /* Line numbers styling */
    .linenumber {
      display: inline-block;
      min-width: 40px;
      padding-right: 10px;
      text-align: right;
      color: rgba(235, 235, 235, 0.4);
      user-select: none;
    }
    /* Code line styling */
    .react-syntax-highlighter-line {
      white-space: pre-wrap;
      word-break: break-all;
      word-wrap: break-word;
    }
    /* Command groups by prefix */
    .command-group {
      width: 100%;
      position: relative;
      overflow: hidden;
    }
    
    /* Fix for command items to prevent text overflow */
    .command-item {
      width: calc(100% - 5px) !important; 
      box-sizing: border-box;
    }
    
    /* Ensure active badge stays visible */
    .command-item .active-badge {
      right: 12px;
      transition: opacity 0.3s ease;
    }
    
    @keyframes gradientPulse {
      0% {
        opacity: 0.3;
        background-position: 0% 50%;
      }
      50% {
        opacity: 0.6;
        background-position: 100% 50%;
      }
      100% {
        opacity: 0.3;
        background-position: 0% 50%;
      }
    }
    
    /* Syntax highlighter transition */
    .syntax-highlighter-transition {
      animation: blurFadeIn 0.5s ease-out forwards;
      opacity: 0;
    }
    
    /* Additional transition for code blocks */
    .markdown-body pre {
      opacity: 0;
      animation: blurFadeIn 0.6s ease-out forwards;
      animation-delay: 0.2s;
    }
    
    /* Stagger animations for better visual effect */
    .markdown-body h1, .markdown-body h2 {
      opacity: 0;
      animation: blurFadeIn 0.4s ease-out forwards;
      animation-delay: 0.05s;
    }
    
    .markdown-body h3, .markdown-body h4, .markdown-body h5 {
      opacity: 0;
      animation: blurFadeIn 0.45s ease-out forwards;
      animation-delay: 0.1s;
    }
    
    .markdown-body p, .markdown-body ul, .markdown-body ol {
      opacity: 0;
      animation: blurFadeIn 0.5s ease-out forwards;
      animation-delay: 0.15s;
    }
    
    /* Command item selection effect */
    @keyframes commandSelected {
      0% {
        transform: translateX(0);
        background-color: rgba(65, 130, 255, 0.05);
      }
      50% {
        transform: translateX(8px);
        background-color: rgba(65, 130, 255, 0.2);
      }
      100% {
        transform: translateX(4px);
        background-color: rgba(65, 130, 255, 0.15);
      }
    }
    
    /* Ensure selected commands stay visible */
    .selected-command {
      animation: commandSelected 0.5s ease-out forwards;
      opacity: 1 !important;
      visibility: visible !important;
    }
    
    /* Prevent fadeout of commands */
    .command-item {
      opacity: 1 !important;
      visibility: visible !important;
    }
  `;

  // Custom components for MDX with VS Code-inspired styling
  const mdxComponents = {
    // Use all the markdown components we already defined
    ...markdownComponents,
    // Add any MDX-specific components here
    wrapper: ({ children, frontmatter }: any) => {
      console.log('MDX wrapper received frontmatter:', frontmatter);
      return (
        <div className="markdown-body">
          {frontmatter && typeof frontmatter === 'object' && Object.keys(frontmatter).length > 0 && (
            <div className="mb-6 py-3 px-5 rounded-xl relative" style={{ 
              backgroundColor: 'rgba(13, 17, 23, 0.8)',
              border: `1px solid ${vscodePalette.border}`,
              fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
              fontSize: '0.9em',
              lineHeight: '1.5',
              boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.2)'
            }}>
              <div className="absolute -top-2.5 left-3 px-2 rounded-lg text-xs font-medium" style={{ 
                backgroundColor: vscodePalette.tabBackground,
                color: '#777',
                border: `1px solid ${vscodePalette.border}`,
                letterSpacing: '0.05em',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
              }}>
                FRONTMATTER
              </div>
              <div className="mb-2" style={{ color: '#777' }}>---</div>
              {Object.entries(frontmatter).map(([key, value]) => (
                <div key={key} className="mb-1 pl-2" style={{ color: vscodePalette.foreground, fontSize: '15.4px' }}>
                  <span style={{ color: '#569CD6' }}>{key}</span>: {
                    typeof value === 'boolean' 
                      ? <span style={{ color: '#4FC1FF' }}>{String(value)}</span>
                      : <span style={{ color: '#CE9178' }}>{String(value)}</span>
                  }
                </div>
              ))}
              <div className="mt-2" style={{ color: '#777' }}>---</div>
            </div>
          )}
          {children}
        </div>
      );
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Documentation interface */}
      <div className="flex flex-1 h-full overflow-hidden">
        {/* Left side: File tree and filters - increase width, add rounded corners and padding */}
        <div className="w-[460px] flex flex-col h-full m-2 mr-2 rounded-xl" style={{ 
          backgroundColor: vscodePalette.sidebarBackground,
          borderColor: vscodePalette.border,
          boxShadow: vscodePalette.cardShadow,
          overflow: 'hidden'
        }}>
          {/* File Search */}
          <div 
            className="p-3 flex items-center justify-between rounded-xl" 
            style={{ 
              borderBottom: `1px solid ${vscodePalette.border}`,
              height: '56px', // Match the height of the tabs section
              backgroundColor: vscodePalette.tabBackground // Match tab header color
            }}
          >
            <div className="flex-1 flex items-center rounded-xl relative" style={{ backgroundColor: vscodePalette.inputBackground }}>
              <Search size={15} className="absolute left-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search documentation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full py-2 px-9 text-sm bg-transparent border border-transparent focus:border-blue-500 focus:ring-0 rounded-xl"
                style={{ color: vscodePalette.foreground, fontSize: '13.2px' }}
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshDocumentation}
              disabled={isRefreshing}
              className="text-xs flex items-center gap-2 h-8 px-4 ml-2"
              style={{ 
                color: vscodePalette.foreground,
                backgroundColor: isRefreshing ? vscodePalette.filterButtonActiveBg : 'rgba(33, 136, 255, 0.1)',
                borderRadius: '12px'
              }}
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
          
          {/* Filter section */}
          <div className="filter-section flex-1 h-full" style={{ 
            backgroundColor: vscodePalette.filterGroupBg,
            borderBottom: `1px solid ${vscodePalette.border}`
          }}>
            <div className="mx-2 my-3">
              <div className="relative pt-2 pb-1 px-3">
                <div className="flex items-center mb-3 gap-1.5">
                  <div className="flex items-center justify-center p-1 rounded-lg" 
                    style={{ 
                      backgroundColor: 'rgba(33, 136, 255, 0.1)',
                      border: '1px solid rgba(33, 136, 255, 0.2)',
                      boxShadow: '0 0 5px rgba(33, 136, 255, 0.2)'
                    }}>
                    <Filter size={14} style={{ color: '#4dabf7' }} />
                  </div>
                  <span className="text-xs font-medium tracking-wider" style={{ 
                    color: '#ffffff',
                    textShadow: '0 0 5px rgba(33, 136, 255, 0.5)'
                  }}>
                    FILTER COMMANDS
                  </span>
                </div>
                <div className="absolute h-[2px] bottom-[-1px] left-0 w-[40%]" style={{
                  background: 'linear-gradient(90deg, rgba(33, 136, 255, 0.8), transparent)',
                  boxShadow: '0 0 8px rgba(33, 136, 255, 0.5)'
                }}></div>
              </div>
            </div>
            {/* Command filter bar - make it scrollable */}
            <ScrollArea className="px-3 pb-3 h-full overflow-y-auto" style={{ width: '100%', maxWidth: '100%' }}>
              {renderCommandFilterBar()}
            </ScrollArea>
          </div>
          
          {/* File Tree section removed as requested */}
        </div>
        
        {/* Content Area with Tabs */}
        <div className="flex-1 flex flex-col overflow-hidden m-2 ml-2 rounded-xl"
          style={{ 
            backgroundColor: vscodePalette.sidebarBackground,
            boxShadow: vscodePalette.cardShadow,
            maxWidth: 'calc(100vw - 530px)',
            position: 'relative',
            overflow: 'hidden'
          }}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            {/* Tabs Header */}
            <div className="flex-shrink-0 rounded-xl" style={{ 
              backgroundColor: vscodePalette.tabBackground, 
              height: '56px' // Match the height of the search section
            }}>
              <TabsList 
                className="border-b rounded-none h-12 bg-transparent px-2 justify-start" 
                style={{ 
                  backgroundColor: 'transparent',
                  borderBottom: `1px solid ${vscodePalette.border}`
                }}
              >
                <TabsTrigger 
                  value="preview" 
                  className="text-base rounded-lg data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:shadow-none px-6"
                  style={{ 
                    color: activeTab === 'preview' ? vscodePalette.foreground : `${vscodePalette.foreground}99`,
                    backgroundColor: activeTab === 'preview' ? 'rgba(31, 111, 235, 0.1)' : 'transparent',
                    margin: '0 4px',
                    transition: 'all 0.2s ease',
                    fontWeight: activeTab === 'preview' ? '500' : '400',
                    letterSpacing: '0.01em'
                  }}
                >
                  Preview
                </TabsTrigger>
                <TabsTrigger 
                  value="raw" 
                  className="text-base rounded-lg data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:shadow-none px-6"
                  style={{ 
                    color: activeTab === 'raw' ? vscodePalette.foreground : `${vscodePalette.foreground}99`,
                    backgroundColor: activeTab === 'raw' ? 'rgba(31, 111, 235, 0.1)' : 'transparent',
                    margin: '0 4px',
                    transition: 'all 0.2s ease',
                    fontWeight: activeTab === 'raw' ? '500' : '400',
                    letterSpacing: '0.01em'
                  }}
                >
                  Raw
                </TabsTrigger>
              </TabsList>
            </div>
            
            {/* File Content - Use ScrollArea properly */}
            <TabsContent 
              value="preview" 
              className="flex-1 overflow-hidden p-0 mt-0 border-none outline-none ring-0 tab-content-appear"
            >
              <ScrollArea className="h-full">
                <div className="p-5" style={{ 
                  backgroundColor: vscodePalette.contentBackground,
                  overflowWrap: 'break-word',
                  wordWrap: 'break-word',
                  wordBreak: 'break-word',
                  maxWidth: '100%',
                  overflow: 'hidden'
                }}>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <div className="flex flex-col items-center">
                        <div 
                          className="animate-spin rounded-full h-12 w-12 border-b-2" 
                          style={{ borderColor: vscodePalette.activeBlue }}
                        ></div>
                        <p className="mt-4 text-lg" style={{ color: vscodePalette.foreground }}>
                          Loading documentation...
                        </p>
                      </div>
                    </div>
                  ) : fileContent ? (
                    <>
                      <style dangerouslySetInnerHTML={{ __html: markdownStyles }} />
                      <style jsx global>{`
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
                      `}</style>
                      <div className="content-transition">
                        {/* Display manually extracted frontmatter if it's an MDX file */}
                        {(fileType === 'mdx' || fileType === 'md') && !mdxSource && (() => {
                          try {
                            const { data: extractedFrontmatter } = matter(fileContent);
                            if (extractedFrontmatter && Object.keys(extractedFrontmatter).length > 0) {
                              return (
                                <div className="mb-6 py-3 px-5 rounded-xl relative" style={{ 
                                  backgroundColor: 'rgba(13, 17, 23, 0.8)',
                                  border: `1px solid ${vscodePalette.border}`,
                                  fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
                                  fontSize: '0.9em',
                                  lineHeight: '1.5',
                                  boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.2)'
                                }}>
                                  <div className="absolute -top-2.5 left-3 px-2 rounded-lg text-xs font-medium" style={{ 
                                    backgroundColor: vscodePalette.tabBackground,
                                    color: '#777',
                                    border: `1px solid ${vscodePalette.border}`,
                                    letterSpacing: '0.05em',
                                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
                                  }}>
                                    FRONTMATTER
                                  </div>
                                  <div className="mb-2" style={{ color: '#777' }}>---</div>
                                  {Object.entries(extractedFrontmatter).map(([key, value]) => (
                                    <div key={key} className="mb-1 pl-2" style={{ color: vscodePalette.foreground, fontSize: '15.4px' }}>
                                      <span style={{ color: '#569CD6' }}>{key}</span>: {
                                        typeof value === 'boolean' 
                                          ? <span style={{ color: '#4FC1FF' }}>{String(value)}</span>
                                          : <span style={{ color: '#CE9178' }}>{String(value)}</span>
                                      }
                                    </div>
                                  ))}
                                  <div className="mt-2" style={{ color: '#777' }}>---</div>
                                </div>
                              );
                            }
                            return null;
                          } catch (error) {
                            console.error('Error rendering manual frontmatter:', error);
                            return null;
                          }
                        })()}
                        
                        {(fileType === 'md' || fileType === 'mdx') ? (
                          mdxSource ? (
                            <>
                              {/* Fallback frontmatter rendering if wrapper component doesn't catch it */}
                              {mdxSource.frontmatter && Object.keys(mdxSource.frontmatter).length > 0 && (
                                <div className="mb-6 py-3 px-5 rounded-xl relative" style={{ 
                                  backgroundColor: 'rgba(13, 17, 23, 0.8)',
                                  border: `1px solid ${vscodePalette.border}`,
                                  fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
                                  fontSize: '0.9em',
                                  lineHeight: '1.5',
                                  boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.2)'
                                }}>
                                  <div className="absolute -top-2.5 left-3 px-2 rounded-lg text-xs font-medium" style={{ 
                                    backgroundColor: vscodePalette.tabBackground,
                                    color: '#777',
                                    border: `1px solid ${vscodePalette.border}`,
                                    letterSpacing: '0.05em',
                                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
                                  }}>
                                    FRONTMATTER
                                  </div>
                                  <div className="mb-2" style={{ color: '#777' }}>---</div>
                                  {Object.entries(mdxSource.frontmatter).map(([key, value]) => (
                                    <div key={key} className="mb-1 pl-2" style={{ color: vscodePalette.foreground, fontSize: '15.4px' }}>
                                      <span style={{ color: '#569CD6' }}>{key}</span>: {
                                        typeof value === 'boolean' 
                                          ? <span style={{ color: '#4FC1FF' }}>{String(value)}</span>
                                          : <span style={{ color: '#CE9178' }}>{String(value)}</span>
                                      }
                                    </div>
                                  ))}
                                  <div className="mt-2" style={{ color: '#777' }}>---</div>
                                </div>
                              )}
                              <MDXRemote 
                                {...mdxSource} 
                                components={mdxComponents} 
                              />
                            </>
                          ) : (
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={markdownComponents}
                            >
                              {fileContent}
                            </ReactMarkdown>
                          )
                        ) : (
                          <SyntaxHighlighter
                            language={fileType === 'ps1' ? 'powershell' : fileType === 'js' ? 'javascript' : fileType}
                            style={syntaxStyle}
                            showLineNumbers={true}
                            customStyle={{
                              backgroundColor: '#0d1117',
                              margin: 0,
                              padding: '1.25em',
                              borderRadius: '12px',
                              fontSize: '13px',
                              lineHeight: '1.5',
                              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
                              fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
                              letterSpacing: '0.01em',
                              maxWidth: '100%',
                              overflowX: 'auto',
                              wordWrap: 'break-word',
                              whiteSpace: 'pre-wrap'
                            }}
                            className="syntax-highlighter-transition"
                          >
                            {fileContent}
                          </SyntaxHighlighter>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center rounded-xl p-8" style={{ 
                        color: `${vscodePalette.foreground}99`,
                        backgroundColor: 'rgba(255, 255, 255, 0.03)'
                      }}>
                        <FileText size={56} className="mx-auto mb-5 opacity-20" />
                        <p className="text-sm">Select a documentation file to view</p>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent 
              value="raw" 
              className="flex-1 overflow-hidden p-0 mt-0 border-none outline-none ring-0 tab-content-appear"
            >
              <ScrollArea className="h-full" style={{ overflowX: 'hidden' }}>
                <div className="p-5 font-mono text-sm" style={{ 
                  backgroundColor: vscodePalette.contentBackground,
                  overflow: 'hidden',
                  maxWidth: '100%'
                }}>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <div className="flex flex-col items-center">
                        <div 
                          className="animate-spin rounded-full h-12 w-12 border-b-2" 
                          style={{ borderColor: vscodePalette.activeBlue }}
                        ></div>
                        <p className="mt-4 text-lg" style={{ color: vscodePalette.foreground }}>
                          Loading documentation...
                        </p>
                      </div>
                    </div>
                  ) : fileContent ? (
                    <div className="code-container content-transition" style={{
                      maxWidth: '100%',
                      overflow: 'hidden'
                    }}>
                      <style jsx global>{`
                        .code-container pre {
                          max-width: 100% !important;
                          overflow-x: hidden !important;
                        }
                        .react-syntax-highlighter-line {
                          white-space: pre-wrap !important;
                          word-break: break-word !important;
                          overflow-wrap: break-word !important;
                        }
                        .token {
                          white-space: pre-wrap !important;
                          word-break: break-word !important;
                          overflow-wrap: break-word !important;
                        }
                      `}</style>
                      {(fileType === 'md' || fileType === 'mdx') ? (
                        <SyntaxHighlighter
                          language="markdown"
                          style={syntaxStyle}
                          showLineNumbers={true}
                          customStyle={{
                            backgroundColor: '#0d1117',
                            margin: 0,
                            padding: 0,
                            borderRadius: '8px',
                            fontSize: '14.3px',
                            lineHeight: '1.4',
                            maxWidth: '100%',
                            overflow: 'auto',
                            wordWrap: 'break-word',
                            whiteSpace: 'pre-wrap'
                          }}
                          className="syntax-highlighter-transition"
                        >
                          {fileContent}
                        </SyntaxHighlighter>
                      ) : (
                        <SyntaxHighlighter
                          language={fileType === 'ps1' ? 'powershell' : fileType === 'js' ? 'javascript' : fileType}
                          style={syntaxStyle}
                          showLineNumbers={true}
                          customStyle={{
                            backgroundColor: '#0d1117',
                            margin: 0,
                            padding: '1.25em',
                            borderRadius: '12px',
                            fontSize: '13px',
                            lineHeight: '1.5',
                            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
                            fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
                            letterSpacing: '0.01em',
                            maxWidth: '100%',
                            overflowX: 'auto',
                            wordWrap: 'break-word',
                            whiteSpace: 'pre-wrap'
                          }}
                          className="syntax-highlighter-transition"
                        >
                          {fileContent}
                        </SyntaxHighlighter>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center rounded-xl p-8" style={{ 
                        color: `${vscodePalette.foreground}99`,
                        backgroundColor: 'rgba(255, 255, 255, 0.03)'
                      }}>
                        <FileText size={56} className="mx-auto mb-5 opacity-20" />
                        <p className="text-sm">Select a documentation file to view</p>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
          
          {/* File Path Footer */}
          {currentFilePath && (
            <div 
              className="p-3 px-4 text-xs border-t flex items-center justify-between"
              style={{ 
                borderColor: vscodePalette.border, 
                backgroundColor: vscodePalette.tabBackground,
                color: `${vscodePalette.foreground}99`,
                borderBottomLeftRadius: '12px',
                borderBottomRightRadius: '12px',
                letterSpacing: '0.01em',
                height: '42px'
              }}
            >
              <div className="flex items-center">
                {fileType === 'ps1' && <Terminal size={14} className="mr-2 opacity-60" />}
                {fileType === 'md' && <FileText size={14} className="mr-2 opacity-60" />}
                {(fileType === 'mdx') && <FileText size={14} className="mr-2 opacity-60 text-blue-400" />}
                {fileType === 'js' && <FileCode size={14} className="mr-2 opacity-60" />}
                <span>{currentFilePath.split('/').pop()} - {fileType.toUpperCase()}</span>
              </div>
              <div className="flex items-center rounded-lg px-2 py-1" style={{ 
                backgroundColor: 'rgba(33, 136, 255, 0.1)',
                border: '1px solid rgba(33, 136, 255, 0.15)'
              }}>
                <div className="text-[10px] text-blue-300">PSADT</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 