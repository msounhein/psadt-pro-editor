"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft, Loader2, AlertCircle, CheckCircle, FileDown, Github, Download } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createLogger } from "@/lib/logger";
import { MarkdownDisplay } from "@/components/markdown-display";
import { PowerShellBreadcrumb, createPathSegments } from "@/components/powershell-breadcrumb";
import { TemplateDownloadDialog } from "@/components/template-download-dialog";
import { getServerSession } from "next-auth";
import { useToast } from "@/components/ui/use-toast";

const logger = createLogger('default-template/page.tsx');

interface Release {
  version: string;
  date: string;
  isLatest: boolean;
  downloadUrl: string;
  notes?: string;
}

interface Template {
  name: string;
  type: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
}

interface Asset {
  name: string;
  path: string;
  download_url: string;
  size?: number;
  download_count?: number;
}

export default function DefaultTemplatePage() {
  const pageLogger = logger.forFunction('DefaultTemplatePage');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>([
    { name: "PSADT Standard Template", type: "standard", status: 'idle' },
    { name: "PSADT Basic Template", type: "basic", status: 'idle' },
    { name: "PSADT Advanced Template", type: "advanced", status: 'idle' }
  ]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>("");
  const [releaseNotes, setReleaseNotes] = useState<string>("");
  const [redirecting, setRedirecting] = useState(false);
  
  // New state variables
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  
  // Add state for available assets
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([]);
  const [fetchingAssets, setFetchingAssets] = useState(false);
  
  const router = useRouter();
  const pathname = usePathname();

  // Fetch PSADT releases when the component mounts
  useEffect(() => {
    const fetchReleases = async () => {
      const fetchLogger = logger.forFunction('fetchReleases');
      try {
        setLoading(true);
        
        fetchLogger.info('Fetching PSADT versions');
        // Fetch releases from our API
        const response = await fetch('/api/psadt/versions', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch releases: ${response.statusText}`);
        }
        
        const data = await response.json();
        fetchLogger.info('Received PSADT versions response', {
          success: data.success,
          releaseCount: data.releases?.length,
          hasError: !!data.error
        });
        
        if (!data.releases || !Array.isArray(data.releases)) {
          fetchLogger.warn('Invalid or empty releases data, using fallback', {
            dataReceived: data
          });
          // If the API fails, use fallback data
          const fallbackReleases: Release[] = [
            { 
              version: '4.0.6', 
              date: '2025-03-15T00:00:00.000Z', 
              notes: '**Version 4.0.6 [2025-02-23]**\n\n### What\'s Changed?\n\n- Move session buffer adding/removing back to the Open/Close-ADTSession.\n- Update the `-Silent` parameter setup as it should only be forced on when its unbound.\n- Change "installation" for "deployment" in `Show-ADTInstallationWelcome`.\n- Replace bad reference to `AppDeployToolkitConfig.xml`.\n- Remove last remaining reference to `AppDeployToolkitConfig.xml` within comment-based help.\n- Fix bad cherry pick from 4.1.0 development track.\n- Fix missing space within `Set-ADTActiveSetup` preventing PowerShell scripts from firing.\n- Recompile developmental PSADT.dll file.', 
              isLatest: true,
              downloadUrl: 'https://github.com/PSAppDeployToolkit/PSAppDeployToolkit/archive/refs/tags/4.0.6.zip'
            },
            { 
              version: '4.0.5', 
              date: '2025-01-20T09:12:59.000Z', 
              notes: '**Version 4.0.5 [2025-01-20]**\n\n### Fixed\n- Update markdown help exports\n- Fix registry key handling with special characters\n\n### Added\n- Improved detection of application installations', 
              isLatest: false,
              downloadUrl: 'https://github.com/PSAppDeployToolkit/PSAppDeployToolkit/archive/refs/tags/4.0.5.zip'
            },
            { 
              version: '4.0.4', 
              date: '2024-12-19T22:31:00.000Z', 
              notes: '**Version 4.0.4 [2024-12-19]**\n\n### Fixed\n- Various bug fixes and improvements\n- Fixed user session detection\n\n### Added\n- New parameter handling for silent installations', 
              isLatest: false,
              downloadUrl: 'https://github.com/PSAppDeployToolkit/PSAppDeployToolkit/archive/refs/tags/4.0.4.zip'
            }
          ];
          
          setReleases(fallbackReleases);
          setSelectedVersion(fallbackReleases[0].version);
          setReleaseNotes(fallbackReleases[0].notes || "No release notes available.");
        } else {
          fetchLogger.info('Successfully processed releases data', {
            count: data.releases.length,
            versions: data.releases.map((r: Release) => r.version)
          });
          
          setReleases(data.releases);
          
          // Select the latest version by default
          const latestRelease = data.releases.find((r: Release) => r.isLatest) || data.releases[0];
          if (latestRelease) {
            fetchLogger.info('Setting selected version', {
              version: latestRelease.version,
              hasNotes: !!latestRelease.notes,
              noteLength: latestRelease.notes?.length,
              notesSample: latestRelease.notes?.substring(0, 100) + '...',
              rawNotes: latestRelease.notes
            });
            
            setSelectedVersion(latestRelease.version);
            setReleaseNotes(latestRelease.notes || "No release notes available.");
          }
        }
      } catch (error) {
        fetchLogger.error('Error fetching PSADT versions', {
          error: error instanceof Error ? error.message : String(error)
        });
        console.error("Error fetching releases:", error);
        setError(`Failed to fetch PSADT versions. ${error instanceof Error ? error.message : 'Please try again.'}`);
        
        // Use fallback data
        const fallbackReleases: Release[] = [
          { 
            version: '4.0.6', 
            date: '2025-03-15T00:00:00.000Z', 
            notes: '**Version 4.0.6 [2025-02-23]**\n\n### What\'s Changed?\n\n- Move session buffer adding/removing back to the Open/Close-ADTSession.\n- Update the `-Silent` parameter setup as it should only be forced on when its unbound.\n- Change "installation" for "deployment" in `Show-ADTInstallationWelcome`.\n- Replace bad reference to `AppDeployToolkitConfig.xml`.\n- Remove last remaining reference to `AppDeployToolkitConfig.xml` within comment-based help.\n- Fix bad cherry pick from 4.1.0 development track.\n- Fix missing space within `Set-ADTActiveSetup` preventing PowerShell scripts from firing.\n- Recompile developmental PSADT.dll file.', 
            isLatest: true,
            downloadUrl: 'https://github.com/PSAppDeployToolkit/PSAppDeployToolkit/archive/refs/tags/4.0.6.zip'
          },
          { 
            version: '4.0.5', 
            date: '2025-01-20T09:12:59.000Z', 
            notes: '**Version 4.0.5 [2025-01-20]**\n\n### Fixed\n- Update markdown help exports\n- Fix registry key handling with special characters\n\n### Added\n- Improved detection of application installations', 
            isLatest: false,
            downloadUrl: 'https://github.com/PSAppDeployToolkit/PSAppDeployToolkit/archive/refs/tags/4.0.5.zip'
          },
          { 
            version: '4.0.4', 
            date: '2024-12-19T22:31:00.000Z', 
            notes: '**Version 4.0.4 [2024-12-19]**\n\n### Fixed\n- Various bug fixes and improvements\n- Fixed user session detection\n\n### Added\n- New parameter handling for silent installations', 
            isLatest: false,
            downloadUrl: 'https://github.com/PSAppDeployToolkit/PSAppDeployToolkit/archive/refs/tags/4.0.4.zip'
          }
        ];
        
        setReleases(fallbackReleases);
        setSelectedVersion(fallbackReleases[0].version);
        setReleaseNotes(fallbackReleases[0].notes || "No release notes available.");
      } finally {
        setLoading(false);
      }
    };

    fetchReleases();
  }, []); // Empty dependency array to ensure it only runs once

  // Add a new effect to fetch available assets when version changes
  useEffect(() => {
    const fetchAssets = async () => {
      if (!selectedVersion) return;
      
      try {
        setFetchingAssets(true);
        
        // Fetch assets for the selected version
        const response = await fetch(`/api/github?type=assets`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch assets: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.data) {
          setAvailableAssets(data.data);
        } else {
          setAvailableAssets([]);
        }
      } catch (error) {
        console.error('Error fetching assets:', error);
        setAvailableAssets([]);
      } finally {
        setFetchingAssets(false);
      }
    };
    
    fetchAssets();
  }, [selectedVersion]);

  // Update release notes when a version is selected
  const handleVersionChange = (version: string) => {
    const changeLogger = logger.forFunction('handleVersionChange');
    changeLogger.info('Version selected', { version });
    
    setSelectedVersion(version);
    setAvailableAssets([]); // Clear assets when version changes
    
    const selectedRelease = releases.find(r => r.version === version);
    
    changeLogger.info('Setting release notes', {
      version,
      hasNotes: !!selectedRelease?.notes,
      noteLength: selectedRelease?.notes?.length
    });
    
    setReleaseNotes(selectedRelease?.notes || "No release notes available.");
  };

  // Updated to handle single template download
  const downloadSingleTemplate = async (template: Template) => {
    const downloadLogger = logger.forFunction('downloadSingleTemplate');
    
    try {
      downloadLogger.info(`Downloading template: ${template.name} (${template.type})`);
      
      // Update template status
      const updatedTemplates = templates.map(t => 
        t.type === template.type 
          ? { ...t, status: 'loading' as const }
          : t
      );
      setTemplates(updatedTemplates);
      
      // Get session info using fetch instead of getServerSession
      const sessionRes = await fetch('/api/auth/session', {
        credentials: 'include',
        // Add cache control to avoid stale session data
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (!sessionRes.ok) {
        throw new Error('Failed to get authentication session');
      }
      
      const session = await sessionRes.json();
      
      // Check if user is authenticated
      if (!session?.user?.id) {
        // Redirect to sign-in if not authenticated
        toast({
          title: "Authentication Required",
          description: "Please sign in to download templates",
          variant: "destructive",
        });
        router.push('/auth/signin');
        return;
      }
      
      const userId = session.user.id;
      
      // Make sure we have a valid version
      const version = selectedVersion || 'unknown';
      downloadLogger.info(`Using version: ${version}`);
      
      // Fetch template files
      const response = await fetch(`/api/github?type=${template.type}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch template: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch template data");
      }
      
      // Process the files
      const fileData = result.data;
      if (!fileData || (Array.isArray(fileData) && fileData.length === 0)) {
        throw new Error("No files found in template");
      }
      
      // Prepare files for download
      const filesToDownload = Array.isArray(fileData) 
        ? fileData.map(file => ({
            name: file.name,
            path: file.path,
            url: file.download_url
          }))
        : [{
            name: fileData.name,
            path: fileData.path,
            url: fileData.download_url
          }];
      
      // Create database entry first
      const createTemplateResponse = await fetch('/api/templates/default', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          templateName: template.name,
          templateType: template.type,
          files: filesToDownload,
          version
        }),
      });
      
      if (!createTemplateResponse.ok) {
        throw new Error(`Error saving template: ${createTemplateResponse.statusText}`);
      }
      
      const createTemplateResult = await createTemplateResponse.json();
      
      if (!createTemplateResult.success) {
        throw new Error(createTemplateResult.error || "Failed to save template");
      }
      
      const templateId = createTemplateResult.template?.id;
      downloadLogger.info("Template created in database:", { templateId });
      
      if (!templateId) {
        throw new Error("No template ID returned from server");
      }
      
      // Now download the files with the template ID already set
      const downloadResponse = await fetch('/api/github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          files: filesToDownload,
          templateName: template.name,
          userId,
          version,
          templateId
        }),
      });
      
      if (!downloadResponse.ok) {
        throw new Error(`Error downloading template: ${downloadResponse.statusText}`);
      }
      
      const downloadResult = await downloadResponse.json();
      
      if (!downloadResult.success) {
        throw new Error(downloadResult.error || "Failed to download template");
      }
      
      // Update UI to show complete status
      const finalTemplates = templates.map(t => 
        t.type === template.type 
          ? { 
              ...t, 
              status: 'success' as const,
              message: `Downloaded and saved ${downloadResult.filesProcessed.successful} files`
            }
          : t
      );
      setTemplates(finalTemplates);
      
      // Show toast notification
      toast({
        title: "Template Downloaded Successfully",
        description: `${template.name} (v${version}) has been added to your templates.`,
        variant: "default",
      });
      
      return downloadResult;
    } catch (err) {
      downloadLogger.error(`Error downloading template ${template.name}:`, err);
      
      // Update status to error
      const errorTemplates = templates.map(t => 
        t.type === template.type 
          ? {
              ...t,
              status: 'error' as const,
              message: err instanceof Error ? err.message : 'Unknown error'
            }
          : t
      );
      setTemplates(errorTemplates);
      
      // Show error toast
      toast({
        title: "Download Failed",
        description: err instanceof Error ? err.message : "Failed to download template",
        variant: "destructive",
      });
      
      throw err;
    }
  };
  
  // Handle showing the download dialog for a specific template
  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    setIsDialogOpen(true);
  };
  
  // Handle dialog close
  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedTemplate(null);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (error) {
      logger.error('Error formatting date', { dateString, error });
      return dateString;
    }
  };

  // Format file size for display
  const formatFileSize = (bytes?: number): string => {
    if (bytes === undefined) return 'Unknown size';
    
    const kb = bytes / 1024;
    if (kb < 1024) {
      return `${kb.toFixed(1)} KB`;
    }
    
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  // Function to download a specific asset
  const downloadAsset = async (asset: Asset) => {
    const downloadAssetLogger = logger.forFunction('downloadAsset');
    try {
      downloadAssetLogger.info(`Downloading asset: ${asset.name}`);
      
      // Get session info using fetch instead of getServerSession
      const sessionRes = await fetch('/api/auth/session', {
        credentials: 'include',
        // Add cache control to avoid stale session data
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (!sessionRes.ok) {
        throw new Error('Failed to get authentication session');
      }
      
      const session = await sessionRes.json();
      
      // Check if user is authenticated
      if (!session?.user?.id) {
        // Redirect to sign-in if not authenticated
        toast({
          title: "Authentication Required",
          description: "Please sign in to download templates",
          variant: "destructive",
        });
        router.push('/auth/signin');
        return;
      }
      
      const userId = session.user.id;
      
      // Extract version from asset name if possible or use selected version
      const assetVersion = asset.name.match(/v(\d+\.\d+\.\d+)/)?.[1] || selectedVersion || 'unknown';
      downloadAssetLogger.info(`Using version for asset: ${assetVersion}`);
      
      // Create database entry first to get template ID
      const createTemplateResponse = await fetch('/api/templates/default', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          templateName: asset.name.replace('.zip', ''),
          templateType: 'standard',
          files: [asset],
          version: assetVersion
        }),
      });
      
      if (!createTemplateResponse.ok) {
        throw new Error(`Error saving template: ${createTemplateResponse.statusText}`);
      }
      
      const createTemplateResult = await createTemplateResponse.json();
      
      if (!createTemplateResult.success) {
        throw new Error(createTemplateResult.error || "Failed to save template");
      }
      
      const templateId = createTemplateResult.template?.id;
      downloadAssetLogger.info("Template created in database:", { templateId });
      
      if (!templateId) {
        throw new Error("No template ID returned from server");
      }
      
      // Now download with the template ID
      const downloadResponse = await fetch('/api/github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          files: [asset],
          templateName: asset.name.replace('.zip', ''),
          userId,
          version: assetVersion,
          templateId
        }),
      });
      
      if (!downloadResponse.ok) {
        throw new Error(`Error downloading asset: ${downloadResponse.statusText}`);
      }
      
      const downloadResult = await downloadResponse.json();
      
      if (!downloadResult.success) {
        throw new Error(downloadResult.error || "Failed to download asset");
      }
      
      // Show toast notification
      toast({
        title: "Template Downloaded Successfully",
        description: `${asset.name} (v${assetVersion}) has been added to your Default templates.`,
        variant: "default",
      });
      
      return downloadResult;
    } catch (err) {
      downloadAssetLogger.error(`Error downloading asset ${asset.name}:`, err);
      
      // Show error toast
      toast({
        title: "Download Failed",
        description: err instanceof Error ? err.message : "Failed to download template",
        variant: "destructive",
      });
      
      throw err;
    }
  };

  return (
    <div className="container max-w-5xl mx-auto py-4 px-4 flex flex-col min-h-[calc(100vh-5rem)]">
      <div className="w-full flex flex-col flex-1">
        <div className="mb-4">
          <div className="bg-black py-1 px-3 rounded-md overflow-x-auto">
            <PowerShellBreadcrumb segments={createPathSegments(pathname || '/default-template')} />
          </div>
          <h1 className="text-3xl font-bold mt-4">Default Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Download official PSADT templates from GitHub to get started quickly
          </p>
        </div>

        {error && (
          <Card className="mb-4 border-red-300 bg-red-50 dark:bg-red-950/30 shadow-sm">
            <CardContent className="py-3 px-4">
              <div className="flex items-start">
                <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-red-600" />
                <div>
                  <p className="font-medium text-sm text-red-700 dark:text-red-400">Error</p>
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Version Selection */}
        <Card className="mb-4 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300">
          <CardContent className="p-4">
            <div className="flex flex-col space-y-2">
              <h2 className="text-lg font-semibold">PSADT Version</h2>
              <p className="text-sm text-muted-foreground">
                Select a PSADT version to see available templates:
              </p>
              
              <div className="flex flex-wrap items-end gap-4 pt-1">
                <div>
                  <Select 
                    value={selectedVersion} 
                    onValueChange={handleVersionChange}
                    disabled={loading || releases.length === 0}
                  >
                    <SelectTrigger id="version-select" className="w-96 focus:ring-2 focus:ring-primary/50 transition-shadow">
                      <SelectValue placeholder="Select a version" />
                    </SelectTrigger>
                    <SelectContent>
                      {releases.map((release) => (
                        <SelectItem 
                          key={release.version} 
                          value={release.version}
                        >
                          {release.version}{release.isLatest ? ' (Latest)' : ''} - {formatDate(release.date)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Available Assets */}
        {selectedVersion && (
          <Card className="mb-4 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-4">
              <div className="flex flex-col space-y-2">
                <h2 className="text-lg font-semibold">Available Templates</h2>
                <p className="text-sm text-muted-foreground">
                  Download templates for PSADT version {selectedVersion}:
                </p>
                
                {fetchingAssets ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="ml-3">Loading available templates...</span>
                  </div>
                ) : availableAssets.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2 mt-2">
                    {availableAssets.map((asset, index) => (
                      <Card 
                        key={index}
                        className="transition-all hover:bg-muted/30 border-muted"
                      >
                        <CardContent className="py-3 px-4 flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="bg-primary/10 rounded-full p-2">
                              <FileDown className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-medium text-sm">{asset.name}</h3>
                              <div className="flex items-center text-xs text-muted-foreground mt-0.5 space-x-3">
                                <span>{formatFileSize(asset.size)}</span>
                                <span>v{selectedVersion}</span>
                                {asset.download_count !== undefined && (
                                  <span>
                                    {asset.download_count.toLocaleString()} downloads
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="ml-auto h-8"
                            onClick={() => downloadAsset(asset)}
                          >
                            <Download className="h-3.5 w-3.5 mr-1" />
                            Download
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
                    <FileDown className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">No template files available for this version.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Release Notes */}
        {releaseNotes && (
          <Card className="mb-4 rounded-lg overflow-hidden flex-1 flex flex-col w-full shadow-md">
            <div className="p-4 space-y-2 flex-1 flex flex-col h-full">
              <h3 className="text-lg font-medium">Release Notes for {selectedVersion}</h3>
              <div className="bg-muted px-4 py-3 rounded-md overflow-auto flex-1 shadow-inner border border-border/40">
                <MarkdownDisplay 
                  markdown={releaseNotes} 
                  showDebug={false} 
                />
              </div>
            </div>
          </Card>
        )}
        
        {loading && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-xl flex flex-col items-center">
              <div className="bg-primary/10 p-3 rounded-full mb-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
              <h3 className="text-base font-semibold mb-1">Loading PSADT Data</h3>
              <p className="text-sm text-muted-foreground">Please wait...</p>
            </div>
          </div>
        )}
        
        {redirecting && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-xl flex flex-col items-center">
              <div className="bg-green-500/10 p-3 rounded-full mb-3">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <h3 className="text-base font-semibold mb-1">Template Downloaded Successfully!</h3>
              <p className="text-sm text-muted-foreground">Redirecting to home page...</p>
            </div>
          </div>
        )}
        
        {/* Template Download Dialog */}
        {selectedTemplate && (
          <TemplateDownloadDialog 
            isOpen={isDialogOpen}
            onClose={handleDialogClose}
            template={selectedTemplate}
            version={selectedVersion}
            onDownload={(template) => downloadSingleTemplate(template)}
          />
        )}
      </div>
    </div>
  );
} 