"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { FolderPlus, Search, Download, Info, Package, Server, Archive, FileText, Plus } from "lucide-react"
import { useRouter } from 'next/navigation'
import { ScrollArea } from '@/components/ui/scroll-area'

// VS Code color variables similar to documentation page
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
  tabBackground: '#161b22',         // Background for tab bar
  contentBackground: '#0e1116',     // Content area background
  cardShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',  // Material-like shadow
};

export default function Home() {
  const router = useRouter()
  const [hasTemplates, setHasTemplates] = useState<boolean | null>(null)
  const [hasDefaultTemplate, setHasDefaultTemplate] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [templates, setTemplates] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadSuccess, setDownloadSuccess] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  useEffect(() => {
    console.log("Home page mounted, checking for templates...");
    // Check if user has any templates
    const checkForTemplates = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/templates')
        const data = await response.json()
        
        console.log("Templates API response:", data);
        
        // Check if data is an array (direct templates response)
        const templatesArray = Array.isArray(data) ? data : data.templates || [];
        
        if (templatesArray.length > 0) {
          setHasTemplates(true)
          setTemplates(templatesArray)
          
          // Check if there's a default template by checking the isDefault property
          // either directly on the template or in its metadata
          const hasDefault = templatesArray.some((template: any) => {
            // Check direct isDefault property
            if (template.isDefault === true) {
              return true;
            }
            
            // Check metadata for isDefault
            try {
              if (template.metadata) {
                const metadata = JSON.parse(template.metadata);
                if (metadata.isDefault === true) {
                  return true;
                }
              }
            } catch (e) {
              console.error("Error parsing template metadata:", e);
            }
            
            return false;
          });
          
          if (hasDefault) {
            console.log("Found default template");
            setHasDefaultTemplate(true)
          } else {
            console.log("No default template found among", templatesArray.length, "templates");
          }
        } else {
          console.log("No templates found");
          setHasTemplates(false)
        }
      } catch (error) {
        console.error("Error checking templates:", error)
        setHasTemplates(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkForTemplates()
  }, [])

  // Download standard template directly from the home page
  const downloadDefaultTemplateToServer = async () => {
    try {
      // Show loading state
      setIsDownloading(true);
      setDownloadError(null);
      
      console.log("Starting download process...");
      
      // Step 1: Fetch latest release
      console.log("Fetching latest release info from GitHub...");
      const releaseResponse = await fetch('/api/github');
      if (!releaseResponse.ok) {
        throw new Error(`Error fetching releases: ${releaseResponse.statusText}`);
      }
      
      const releaseData = await releaseResponse.json();
      console.log("Release data:", releaseData);
      
      const latestVersion = releaseData.releaseInfo?.version || '4.0.6';
      console.log(`Latest version: ${latestVersion}`);
      
      // Step 2: Find the template zip in the release assets
      const templateAsset = releaseData.data?.find((asset: any) => 
        asset.name.includes("Template") || asset.name.includes("template")
      );
      
      if (!templateAsset) {
        throw new Error("Template ZIP file not found in release assets");
      }
      
      console.log("Found template asset:", templateAsset);
      
      // Step 3: Prepare files for download
      const files = [{
        name: templateAsset.name,
        path: templateAsset.path,
        url: templateAsset.download_url
      }];
      
      // Step 4: Save template to database
      console.log("Saving template to database...");
      const createTemplateResponse = await fetch('/api/templates/default', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateName: "Standard PSADT Template",
          templateType: "standard",
          files,
          version: latestVersion
        }),
      });
      
      if (!createTemplateResponse.ok) {
        throw new Error(`Error saving template: ${createTemplateResponse.statusText}`);
      }
      
      const createTemplateResult = await createTemplateResponse.json();
      console.log("Database save result:", createTemplateResult);
      
      if (!createTemplateResult.success) {
        throw new Error(createTemplateResult.error || "Failed to save template");
      }
      
      // Get template ID
      const templateId = createTemplateResult.template?.id;
      console.log("Template ID:", templateId);
      
      if (!templateId) {
        throw new Error("No template ID returned from server");
      }
      
      // Step 5: Download files with template ID
      console.log("Downloading template files with template ID...");
      const downloadResponse = await fetch('/api/github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files,
          templateName: "Standard PSADT Template",
          version: latestVersion,
          templateId
        }),
      });
      
      if (!downloadResponse.ok) {
        throw new Error(`Error downloading template: ${downloadResponse.statusText}`);
      }
      
      const downloadResult = await downloadResponse.json();
      console.log("Download result:", downloadResult);
      
      if (!downloadResult.success) {
        throw new Error(downloadResult.error || "Failed to download template");
      }
      
      // Success - update UI
      setDownloadSuccess(true);
      
    } catch (error) {
      console.error("Download failed:", error);
      setDownloadError(error instanceof Error ? error.message : "Unknown error occurred");
    } finally {
      setIsDownloading(false);
    }
  };

  // Filter templates based on search query
  const filteredTemplates = templates.filter((template: any) => 
    template.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="animate-pulse">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 h-full overflow-hidden m-2">
      {/* Main content area with VSCode styling */}
      <div className="flex-1 flex flex-col h-full m-2 rounded-xl"
        style={{ 
          backgroundColor: vscodePalette.sidebarBackground,
          boxShadow: vscodePalette.cardShadow,
          maxWidth: 'calc(100vw - 32px)',
          position: 'relative',
          overflow: 'hidden'
        }}>
        
        {/* Header area */}
        <div className="flex-shrink-0 rounded-xl" style={{ 
          backgroundColor: vscodePalette.tabBackground, 
          height: '56px',
          borderBottom: `1px solid ${vscodePalette.border}`
        }}>
          <div className="h-full px-4 flex items-center justify-between">
            <div className="flex items-center">
              <FileText className="h-5 w-5 mr-2 text-primary" />
              <h1 className="text-xl font-semibold">Templates</h1>
            </div>
            
            {!hasDefaultTemplate && (
              <Button 
                onClick={() => router.push('/templates/new')}
                style={{
                  backgroundColor: 'rgba(31, 111, 235, 0.1)',
                  color: vscodePalette.foreground
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Template
              </Button>
            )}
          </div>
        </div>
        
        {/* Content area with scroll */}
        <ScrollArea className="flex-1 h-full">
          <div className="p-6">
            {downloadSuccess && (
              <div className="mb-6 p-4 rounded-xl" style={{ 
                backgroundColor: 'rgba(46, 160, 67, 0.15)',
                border: '1px solid rgba(46, 160, 67, 0.4)'
              }}>
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-200">PSADT template downloaded successfully! Refreshing page...</p>
                  </div>
                </div>
              </div>
            )}
            
            {downloadError && (
              <div className="mb-6 p-4 rounded-xl" style={{ 
                backgroundColor: 'rgba(248, 81, 73, 0.15)',
                border: '1px solid rgba(248, 81, 73, 0.4)'
              }}>
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-200">Error downloading template: {downloadError}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Search bar styled like in documentation */}
            <div className="mb-6 rounded-xl p-2" style={{ backgroundColor: vscodePalette.inputBackground }}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search templates..." 
                  className="pl-10 bg-transparent border-transparent focus:border-primary focus:ring-0"
                  style={{ color: vscodePalette.foreground }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            {hasTemplates ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredTemplates.map((template: any) => (
                  <Card 
                    key={template.id} 
                    className="border-0 cursor-pointer transition-all duration-200 hover:translate-y-[-2px] overflow-hidden rounded-xl w-full" 
                    style={{ 
                      backgroundColor: '#161b22', // Lighter background color
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3), 0 1px 3px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                      position: 'relative'
                    }}
                    onClick={() => router.push(`/templates/${template.id}`)}
                  >
                    <div className="absolute inset-x-0 h-1 top-0 bg-gradient-to-r from-primary/40 to-primary/10"></div>
                    <CardContent className="p-6 relative">
                      {/* Template header section */}
                      <div className="flex mb-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg mr-3 flex-shrink-0" style={{ 
                          backgroundColor: 'rgba(33, 136, 255, 0.15)',
                          boxShadow: 'inset 0 0 0 1px rgba(33, 136, 255, 0.2)'
                        }}>
                          <Package className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          {/* Default badge */}
                          {(template.isDefault || (template.metadata && JSON.parse(template.metadata).isDefault)) && (
                            <div className="mb-1.5">
                              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-md font-medium" style={{
                                boxShadow: 'inset 0 0 0 1px rgba(33, 136, 255, 0.2)'
                              }}>Default</span>
                            </div>
                          )}
                          {/* Template name */}
                          <h3 className="text-xl font-semibold truncate leading-tight" style={{ color: vscodePalette.headingColor }}>{template.name}</h3>
                        </div>
                      </div>

                      {/* Template details section */}
                      <div style={{ 
                        borderBottom: `1px solid ${vscodePalette.border}`, 
                        borderTop: `1px solid ${vscodePalette.border}`,
                        padding: '12px 0',
                        margin: '12px 0',
                        boxShadow: `0 1px 0 rgba(255, 255, 255, 0.03), 0 -1px 0 rgba(255, 255, 255, 0.03)`
                      }}>
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground flex items-center">
                            <Server className="h-4 w-4 mr-2 opacity-80 flex-shrink-0 text-primary/70" />
                            <span className="truncate">Type: {template.packageType || 'Standard'}</span>
                          </p>
                          {template.version && (
                            <p className="text-sm text-muted-foreground flex items-center">
                              <Archive className="h-4 w-4 mr-2 opacity-80 flex-shrink-0 text-primary/70" />
                              <span className="truncate">Version: {template.version}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Footer section */}
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-muted-foreground">
                          Created: {new Date(template.createdAt).toLocaleDateString()}
                        </p>
                        <div className="text-xs text-primary/50 flex items-center">
                          <FileText className="h-3.5 w-3.5 mr-1" />
                          <span>View details</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card 
                className="border border-dashed rounded-xl overflow-hidden" 
                style={{ 
                  borderColor: vscodePalette.border,
                  backgroundColor: 'rgba(13, 17, 23, 0.5)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.05)' 
                }}
              >
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(31, 111, 235, 0.1)' }}>
                    <Info className="h-8 w-8 text-primary/80" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3" style={{ color: vscodePalette.headingColor }}>No Default Template Found</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    You need to download or create a default template to get started with PSADT package creation.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button 
                      onClick={() => router.push('/default-template')}
                      style={{ 
                        backgroundColor: 'rgba(31, 111, 235, 0.15)',
                        borderColor: 'rgba(31, 111, 235, 0.3)',
                        color: vscodePalette.foreground
                      }}
                      className="rounded-lg text-base font-medium px-5 py-2.5 hover:bg-primary/20 transition-colors"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Default Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
