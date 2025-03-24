import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { createLogger } from '@/lib/logger';
import fs from 'fs';
import path from 'path';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const logger = createLogger('api/github/route.ts');

// Define the default GitHub repository to fetch from
const GITHUB_REPO = 'PSAppDeployToolkit/PSAppDeployToolkit';
const GITHUB_API_BASE = 'https://api.github.com';

// Storage path for downloaded files
const STORAGE_PATH = process.env.FILE_STORAGE_PATH || './storage/templates';

// Create storage directory if it doesn't exist
if (!fs.existsSync(STORAGE_PATH)) {
  fs.mkdirSync(STORAGE_PATH, { recursive: true });
}

// Type interfaces
interface GitHubReleaseAsset {
  name: string;
  browser_download_url: string;
  size?: number;
  created_at?: string;
  download_count?: number;
  content_type?: string;
  state?: string;
  url?: string;
}

interface GitHubFile {
  name: string;
  path: string;
  download_url: string;
}

interface DownloadedFile {
  name: string;
  path: string;
  status: 'success' | 'failed';
  reason?: string;
  localPath?: string;
}

/**
 * GET handler for fetching templates from GitHub
 */
export async function GET(request: NextRequest) {
  const getHandler = logger.forFunction('GET');
  
  /**
   * Helper function to fallback to static URLs if the GitHub API fails
   */
  function fallbackToStaticUrls(templateTypeParam: string) {
    getHandler.info(`Using fallback static URLs for template type: ${templateTypeParam}`);
    
    // Define direct download URLs for the released templates
    const templateFiles: Record<string, GitHubFile[]> = {
      standard: [
        { 
          name: "PSAppDeployToolkit.zip", 
          path: "releases/download/4.0.6/PSAppDeployToolkit.zip", 
          download_url: "https://github.com/PSAppDeployToolkit/PSAppDeployToolkit/releases/download/4.0.6/PSAppDeployToolkit.zip" 
        }
      ],
      basic: [
        { 
          name: "PSAppDeployToolkit_Basic.zip", 
          path: "releases/download/4.0.6/PSAppDeployToolkit_Basic.zip", 
          download_url: "https://github.com/PSAppDeployToolkit/PSAppDeployToolkit/releases/download/4.0.6/PSAppDeployToolkit.zip" 
        }
      ],
      advanced: [
        { 
          name: "PSAppDeployToolkit_Advanced.zip", 
          path: "releases/download/4.0.6/PSAppDeployToolkit_Advanced.zip", 
          download_url: "https://github.com/PSAppDeployToolkit/PSAppDeployToolkit/releases/download/4.0.6/PSAppDeployToolkit.zip" 
        }
      ]
    };
    
    const filesToReturn = templateFiles[templateTypeParam as keyof typeof templateFiles] || templateFiles.standard;
    
    return NextResponse.json({ 
      success: true, 
      data: filesToReturn,
      templateType: templateTypeParam,
      fromFallback: true
    });
  }
  
  try {
    // Extract template type from query
    const searchParams = request.nextUrl.searchParams;
    const templateType = searchParams.get('type') || 'standard';
    
    getHandler.info(`Fetching template type: ${templateType}`);
    
    // Fetch the latest releases from GitHub
    const releasesUrl = `${GITHUB_API_BASE}/repos/${GITHUB_REPO}/releases`;
    getHandler.info(`Fetching releases from: ${releasesUrl}`);
    
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      ...(process.env.GITHUB_TOKEN && {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`
      })
    };
    
    const releasesResponse = await axios.get(releasesUrl, { headers });
    
    if (!releasesResponse.data || !Array.isArray(releasesResponse.data) || releasesResponse.data.length === 0) {
      getHandler.warn('No releases found, falling back to predefined URLs');
      // Fall back to predefined URLs if no releases found
      return fallbackToStaticUrls(templateType);
    }
    
    // Get all releases with their assets
    const releases = releasesResponse.data;
    getHandler.info(`Found ${releases.length} releases from GitHub API`);
    
    // Log the structure of the first release to help debug
    if (releases.length > 0) {
      getHandler.info('First release structure example:', {
        tag_name: releases[0].tag_name,
        published_at: releases[0].published_at,
        assets_count: releases[0].assets?.length || 0,
        asset_names: releases[0].assets?.map((asset: any) => asset.name) || []
      });
    }
    
    // Filter to get the latest non-draft, non-prerelease version
    const latestRelease = releases.find(release => 
      !release.draft && 
      !release.prerelease && 
      release.assets && 
      Array.isArray(release.assets) && 
      release.assets.length > 0
    );
    
    if (!latestRelease) {
      getHandler.warn('No suitable release with assets found, falling back to predefined URLs');
      return fallbackToStaticUrls(templateType);
    }
    
    getHandler.info(`Found latest release: ${latestRelease.tag_name} with ${latestRelease.assets.length} assets`);
    
    // Extract all assets available in this release
    const allAssets = latestRelease.assets.map((asset: GitHubReleaseAsset) => ({
      name: asset.name,
      browser_download_url: asset.browser_download_url,
      size: asset.size,
      created_at: asset.created_at,
      download_count: asset.download_count
    }));
    
    getHandler.info(`Available assets in release ${latestRelease.tag_name}:`, {
      assetCount: allAssets.length,
      assets: allAssets.map((a: { name: string }) => a.name)
    });
    
    // Return all available assets for the UI to display
    return NextResponse.json({ 
      success: true, 
      data: allAssets.map((asset: GitHubReleaseAsset) => ({
        name: asset.name,
        path: `releases/${latestRelease.tag_name}/${asset.name}`,
        download_url: asset.browser_download_url,
        size: asset.size,
        download_count: asset.download_count
      })),
      templateType,
      releaseInfo: {
        version: latestRelease.tag_name,
        publishedAt: latestRelease.published_at,
        name: latestRelease.name,
        body: latestRelease.body // Release notes
      },
      availableAssets: allAssets
    });
  } catch (error) {
    getHandler.error('Error fetching from GitHub', {
      error: error instanceof Error ? error.message : String(error),
      axios: axios.isAxiosError(error) ? {
        status: error.response?.status,
        data: error.response?.data
      } : undefined
    });
    
    // Fall back to predefined URLs in case of error
    const templateType = request.nextUrl.searchParams.get('type') || 'standard';
    return fallbackToStaticUrls(templateType);
  }
}

/**
 * Helper function to download a file and save it locally
 */
async function downloadFile(file: any, templateName: string, userId: string, version = 'unknown', templateId = '', origin = 'http://localhost:3000'): Promise<DownloadedFile> {
  const downloadLogger = logger.forFunction('downloadFile');
  try {
    // Parse file information
    const fileName = file.name;
    const fileUrl = file.download_url || file.url;
    
    if (!fileUrl) {
      throw new Error(`No download URL available for file: ${fileName}`);
    }
    
    downloadLogger.info(`Downloading file: ${fileName}`, { 
      url: fileUrl, 
      templateId, 
      userId,
      templateName,
      version
    });
    
    // Create user directory if it doesn't exist
    const userDir = path.join(STORAGE_PATH, userId);
    const defaultDir = path.join(userDir, 'Default');
    
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    
    if (!fs.existsSync(defaultDir)) {
      fs.mkdirSync(defaultDir, { recursive: true });
    }
    
    // For ZIP files, download directly to Default directory, then extract to a subfolder
    const isZipFile = fileName.toLowerCase().endsWith('.zip');
    let filePath: string;
    let extractDir: string | null = null;
    
    if (isZipFile) {
      // Add version to the file name for ZIP files
      const fileNameWithVersion = version !== 'unknown' 
        ? `${fileName.replace('.zip', '')}_v${version}.zip`
        : fileName;
      
      // Save ZIP file directly to Default directory
      filePath = path.join(defaultDir, fileNameWithVersion);
      
      // Define extraction directory (will create after saving)
      const sanitizedTemplateName = templateName.replace(/[<>:"\/\\|?*]+/g, '_');
      extractDir = path.join(defaultDir, sanitizedTemplateName);
    } else {
      // For non-ZIP files, use the original path structure
      const templateDir = path.join(defaultDir, templateName.replace(/[<>:"\/\\|?*]+/g, '_'));
      
      if (!fs.existsSync(templateDir)) {
        fs.mkdirSync(templateDir, { recursive: true });
      }
      
      filePath = path.join(templateDir, fileName);
    }
    
    // Download the file
    const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    
    // Save file locally
    fs.writeFileSync(filePath, response.data);
    
    downloadLogger.info(`File downloaded successfully: ${fileName}`, { path: filePath });
    
    // Extract ZIP file if applicable
    if (isZipFile && extractDir) {
      downloadLogger.info(`Extracting ZIP file: ${fileName} to ${extractDir}`);
      
      // Delete the extraction directory if it already exists to ensure clean extraction
      if (fs.existsSync(extractDir)) {
        downloadLogger.info(`Removing existing extraction directory: ${extractDir}`);
        fs.rmSync(extractDir, { recursive: true, force: true });
      }
      
      // Create extraction directory
      fs.mkdirSync(extractDir, { recursive: true });
      
      try {
        // Create a temporary PowerShell script file (without variable modification)
        const scriptContent = `
# Set strict error handling
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$zipFile = '${filePath.replace(/\\/g, '\\\\').replace(/'/g, "''")}'
$extractPath = '${extractDir.replace(/\\/g, '\\\\').replace(/'/g, "''")}'
$version = '${version}'
$templateId = '${templateId}'
$apiUrl = '${origin}/api/extraction-status'

# Create a log file for tracking extraction status
$logFile = Join-Path -Path (Split-Path -Path $extractPath -Parent) -ChildPath ".extraction_log_$(Get-Date -Format 'yyyyMMddHHmmss').txt"
"Extraction started at $(Get-Date)" | Out-File -FilePath $logFile
"Source: $zipFile" | Out-File -FilePath $logFile -Append
"Destination: $extractPath" | Out-File -FilePath $logFile -Append 
"Template ID: $templateId" | Out-File -FilePath $logFile -Append
"API URL: $apiUrl" | Out-File -FilePath $logFile -Append

Write-Output "======== EXTRACTION DETAILS ========"
Write-Output "Source ZIP: $zipFile"
Write-Output "Extraction Path: $extractPath" 
Write-Output "Version: $version"
Write-Output "Template ID: $templateId"
Write-Output "API URL: $apiUrl"
Write-Output "Log File: $logFile"
Write-Output "======================================"

# Get parent directory information
$parentDir = Split-Path -Path $extractPath -Parent
Write-Output "Parent Directory: $parentDir"
Write-Output "Parent Directory Contents:"
Get-ChildItem -Path $parentDir | ForEach-Object {
    Write-Output "  $($_.Name)"
}

# Make sure zip file exists
if (-not (Test-Path -Path $zipFile)) {
    Write-Error "ZIP file does not exist: $zipFile"
    "ERROR: ZIP file does not exist: $zipFile" | Out-File -FilePath $logFile -Append
    exit 1
}

# Clear destination if it exists
if (Test-Path -Path $extractPath) {
    Write-Output "Removing existing extraction directory: $extractPath"
    Remove-Item -Path "$extractPath\\*" -Recurse -Force -ErrorAction SilentlyContinue
}

# Make sure the destination exists
if (-not (Test-Path -Path $extractPath)) {
    Write-Output "Creating extraction directory: $extractPath"
    New-Item -Path $extractPath -ItemType Directory -Force | Out-Null
}

# Extract using Expand-Archive
try {
    Write-Output "Extracting ZIP using Expand-Archive..."
    Expand-Archive -Path $zipFile -DestinationPath $extractPath -Force
}
catch {
    Write-Error "Error extracting with Expand-Archive: $_"
    
    # Try alternate extraction method
    try {
        Write-Output "Trying alternate .NET extraction method..."
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        [System.IO.Compression.ZipFile]::ExtractToDirectory($zipFile, $extractPath)
    }
    catch {
        Write-Error "Alternate extraction also failed: $_"
        
        # Update status to failed if we have a template ID
        if ($templateId) {
            try {
                Write-Output "Updating extraction status to 'failed'"
                $body = @{
                    templateId = $templateId
                    status = "failed"
                    extractionPath = "$extractPath"
                } | ConvertTo-Json
                
                Write-Output "Sending status update to: $apiUrl with body: $body"
                Invoke-WebRequest -Uri $apiUrl -Method Post -Body $body -ContentType "application/json" -UseBasicParsing
            } catch {
                Write-Output "Failed to update extraction status: $_"
            }
        }
        
        exit 2
    }
}

# Verify extraction worked
$files = Get-ChildItem -Path $extractPath -Recurse
$fileCount = ($files | Measure-Object).Count

Write-Output "Extracted $fileCount files/directories"

# List top-level directories
$topItems = Get-ChildItem -Path $extractPath
Write-Output "Top level items: $($topItems.Name -join ', ')"

if ($fileCount -eq 0) {
    Write-Error "Extraction failed - no files were extracted"
    
    # Update status to failed if we have a template ID
    if ($templateId) {
        try {
            Write-Output "Updating extraction status to 'failed'"
            $body = @{
                templateId = $templateId
                status = "failed"
                extractionPath = "$extractPath"
            } | ConvertTo-Json
            
            Write-Output "Sending status update to: $apiUrl with body: $body"
            Invoke-WebRequest -Uri $apiUrl -Method Post -Body $body -ContentType "application/json" -UseBasicParsing
        } catch {
            Write-Output "Failed to update extraction status: $_"
        }
    }
    
    exit 3
}

# Create versioned folder name
$parentDir = Split-Path -Path $extractPath -Parent
$folderName = Split-Path -Path $extractPath -Leaf
$versionedFolderName = "$folderName" + "_v$version"
$versionedPath = Join-Path -Path $parentDir -ChildPath $versionedFolderName

Write-Output "Renaming extracted folder to include version:"
Write-Output "  From: $extractPath" 
Write-Output "  To: $versionedPath"

# Remove versioned folder if it exists
if (Test-Path -Path $versionedPath) {
    Write-Output "Removing existing versioned folder: $versionedPath"
    Remove-Item -Path $versionedPath -Recurse -Force
}

# Rename the extraction folder to include version
Rename-Item -Path $extractPath -NewName $versionedFolderName
Write-Output "Renamed folder successfully"

# Verify the renamed folder exists
if (Test-Path -Path $versionedPath) {
    Write-Output "Verified versioned folder exists: $versionedPath"
} else {
    Write-Output "ERROR: Versioned folder does not exist after renaming!"
}

# Try to remove the original ZIP file
try {
    Write-Output "Removing original ZIP file: $zipFile"
    Remove-Item -Path $zipFile -Force
    Write-Output "ZIP file deleted"
} catch {
    Write-Output "Failed to delete ZIP file: $_"
}

# Show parent directory contents after extraction
Write-Output "Parent Directory Contents After Extraction:"
Get-ChildItem -Path $parentDir | ForEach-Object {
    Write-Output "  $($_.Name)"
}

# Success
Write-Output "Extraction completed successfully with $fileCount files/directories"
Write-Output "Final extraction path: $versionedPath"

# Write success file for tracking
$successFile = Join-Path -Path $parentDir -ChildPath ".extraction_complete"
"Extraction completed at $(Get-Date)" | Out-File -FilePath $successFile

# Update status to complete if we have a template ID
if ($templateId) {
    try {
        Write-Output "Updating extraction status to 'complete'"
        $relativeVersionedFolder = $versionedFolderName
        $body = @{
            templateId = $templateId
            status = "complete"
            extractionPath = "$($userId)/Default/$relativeVersionedFolder"
        } | ConvertTo-Json
        
        Write-Output "Sending status update to: $apiUrl"
        Write-Output "Request body: $body"

        # Log the update request
        "Updating extraction status:" | Out-File -FilePath $logFile -Append
        "Request URL: $apiUrl" | Out-File -FilePath $logFile -Append
        "Request body: $body" | Out-File -FilePath $logFile -Append
        
        $result = Invoke-WebRequest -Uri $apiUrl -Method Post -Body $body -ContentType "application/json" -UseBasicParsing
        Write-Output "Status update response: $($result.StatusCode) $($result.StatusDescription)"
        Write-Output "Response content: $($result.Content)"

        # Log the response
        "Response: $($result.StatusCode) $($result.StatusDescription)" | Out-File -FilePath $logFile -Append
        "Response content: $($result.Content)" | Out-File -FilePath $logFile -Append
    } catch {
        Write-Output "Failed to update extraction status: $_"
        "ERROR: Failed to update extraction status: $_" | Out-File -FilePath $logFile -Append
    }
} else {
    Write-Output "No template ID provided, skipping status update"
    "WARNING: No template ID provided, extraction status not updated" | Out-File -FilePath $logFile -Append
    
    # Create a marker file for later status update
    $successMarker = Join-Path -Path $parentDir -ChildPath ".extraction_complete_$versionedFolderName"
    "Extraction completed at $(Get-Date)" | Out-File -FilePath $successMarker
    "Path: $versionedPath" | Out-File -FilePath $successMarker -Append
    "File count: $fileCount" | Out-File -FilePath $successMarker -Append
    
    Write-Output "Created marker file for later status update: $successMarker"
}
`;

        // Write script to temp file
        const scriptPath = path.join(STORAGE_PATH, `extract_${Date.now()}.ps1`);
        fs.writeFileSync(scriptPath, scriptContent);
        downloadLogger.info(`Created extraction script at: ${scriptPath}`);
        
        // Execute the script
        const { execSync } = require('child_process');
        try {
          const output = execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`, { 
            encoding: 'utf8',
            stdio: 'pipe',
            maxBuffer: 10 * 1024 * 1024 // 10MB buffer
          });
          
          downloadLogger.info(`Extraction completed successfully:`, { 
            output,
            templateName,
            userId,
            version,
            templateId: templateId || 'null'
          });
          
          // Construct the versioned extraction dir path
          const extractDirName = path.basename(extractDir);
          const parentDir = path.dirname(extractDir);
          const versionedExtractDirName = `${extractDirName}_v${version}`;
          const versionedExtractDir = path.join(parentDir, versionedExtractDirName);
          
          // Verify extraction
          if (fs.existsSync(versionedExtractDir)) {
            const extractedFiles = fs.readdirSync(versionedExtractDir);
            if (extractedFiles.length === 0) {
              throw new Error("Extraction failed: directory is empty");
            }
            
            downloadLogger.info(`Extracted files: ${extractedFiles.join(', ')}`);
            
          } else {
            downloadLogger.error(`Versioned extraction directory not found: ${versionedExtractDir}`);
          }
          
        } catch (execError: any) {
          const errorMessage = execError.stdout?.toString() || execError.stderr?.toString() || execError.message;
          downloadLogger.error(`PowerShell extraction failed: ${errorMessage}`);
          throw new Error(`Extraction failed: ${errorMessage}`);
        } finally {
          // Clean up the temp script
          try {
            fs.unlinkSync(scriptPath);
          } catch (cleanupError: any) {
            downloadLogger.warn(`Failed to clean up script file: ${cleanupError.message}`);
          }
        }
      } catch (extractError) {
        downloadLogger.error(`Failed to extract ZIP file: ${fileName}`, { 
          error: extractError instanceof Error ? extractError.message : String(extractError),
          extractDir
        });
        
        // Try an absolute last resort - extracting with 7zip if available
        try {
          downloadLogger.info(`Attempting emergency extraction with 7-Zip for ${fileName}`);
          
          const emergencyScript = `
# Emergency extraction with 7-Zip
$ErrorActionPreference = 'Stop'
$zipFile = '${filePath.replace(/\\/g, '\\\\').replace(/'/g, "''")}'
$extractPath = '${extractDir.replace(/\\/g, '\\\\').replace(/'/g, "''")}'
$version = '${version}'
$templateId = '${templateId}'
$apiUrl = '${origin}/api/extraction-status'

# Try to find 7-Zip
$7zipPath = 'C:\\Program Files\\7-Zip\\7z.exe'
if (Test-Path $7zipPath) {
  Write-Output "Found 7-Zip, using it to extract..."
  & "$7zipPath" x -y "$zipFile" -o"$extractPath" | Out-String
  
  # Create versioned folder name
  $parentDir = Split-Path -Path $extractPath -Parent
  $folderName = Split-Path -Path $extractPath -Leaf
  $versionedFolderName = "$folderName" + "_v$version"
  $versionedPath = Join-Path -Path $parentDir -ChildPath $versionedFolderName

  # Rename to add version
  if (Test-Path -Path $versionedPath) {
    Remove-Item -Path $versionedPath -Recurse -Force
  }
  Rename-Item -Path $extractPath -NewName $versionedFolderName
  
  # Try to remove the original ZIP file
  Remove-Item -Path $zipFile -Force
  
  # Update status if we have a template ID
  if ($templateId) {
    try {
      Write-Output "Updating extraction status to 'complete'"
      $body = @{
        templateId = $templateId
        status = "complete"
        extractionPath = "$versionedFolderName"
      } | ConvertTo-Json
      
      Invoke-WebRequest -Uri $apiUrl -Method Post -Body $body -ContentType "application/json" -UseBasicParsing
    } catch {
      Write-Output "Failed to update extraction status: $_"
    }
  }
  
  exit $LASTEXITCODE
} else {
  Write-Output "7-Zip not found at standard location"
  exit 1
}
`;
          
          const emergencyScriptPath = path.join(STORAGE_PATH, `emergency_extract_${Date.now()}.ps1`);
          fs.writeFileSync(emergencyScriptPath, emergencyScript);
          
          const { execSync } = require('child_process');
          try {
            const output = execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${emergencyScriptPath}"`, { 
              encoding: 'utf8',
              stdio: 'pipe'
            });
            
            downloadLogger.info(`7-Zip extraction completed: ${output}`);
            
            // Construct the versioned extraction dir path
            const extractDirName = path.basename(extractDir);
            const parentDir = path.dirname(extractDir);
            const versionedExtractDirName = `${extractDirName}_v${version}`;
            const versionedExtractDir = path.join(parentDir, versionedExtractDirName);
            
            // Verify 7zip extraction worked
            if (fs.existsSync(versionedExtractDir)) {
              const extractedFiles = fs.readdirSync(versionedExtractDir);
              downloadLogger.info(`7-Zip extracted files: ${extractedFiles.join(', ')}`);
            } else {
              downloadLogger.error(`Versioned extraction directory not found after 7-Zip extraction: ${versionedExtractDir}`);
            }
          } catch (execError: any) {
            downloadLogger.error(`7-Zip execution failed: ${execError.message}`);
          } finally {
            // Clean up script
            try {
              fs.unlinkSync(emergencyScriptPath);
            } catch (err) {
              // Ignore cleanup errors
            }
          }
        } catch (lastResortError) {
          downloadLogger.error(`All extraction methods failed: ${lastResortError instanceof Error ? lastResortError.message : String(lastResortError)}`);
        }
      }
    }
    
    return {
      name: fileName,
      path: file.path,
      status: 'success',
      localPath: filePath
    };
  } catch (error) {
    downloadLogger.error(`Error downloading file: ${file.name}`, {
      error: error instanceof Error ? error.message : String(error)
    });
    
    return {
      name: file.name,
      path: file.path,
      status: 'failed',
      reason: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * POST handler for downloading files
 */
export async function POST(request: NextRequest) {
  const postHandler = logger.forFunction('POST');
  
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    
    // Require authentication for all requests
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { files, templateName, version = 'unknown', templateId = null } = body;
    const userId = session.user.id;
    
    postHandler.info(`Processing download request for template: ${templateName}`, { 
      fileCount: files?.length, 
      userId,
      version,
      templateId
    });
    
    if (!files || !Array.isArray(files) || files.length === 0) {
      postHandler.warn('No files provided for download');
      return NextResponse.json({ 
        success: false, 
        error: 'No files provided for download' 
      }, { status: 400 });
    }
    
    // Get the origin for API calls
    const origin = request.headers.get('origin') || 'http://localhost:3000';
    
    // Log the templateId to ensure it's being passed correctly
    postHandler.info(`Template ID before download: ${templateId || 'null'}`);
    
    // Actually download the files
    const downloadPromises = files.map(file => 
      downloadFile(file, templateName, userId, version, templateId || '', origin)
    );
    const downloadedFiles = await Promise.all(downloadPromises);
    
    // Count successful and failed downloads
    const successful = downloadedFiles.filter(file => file.status === 'success').length;
    const failed = downloadedFiles.length - successful;
    
    postHandler.info(`Successfully processed ${successful} files for template: ${templateName}`, {
      templateId: templateId || 'null'
    });
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: `Successfully processed ${successful} files.`,
      templateName,
      version,
      templateId,
      filesProcessed: {
        total: files.length,
        successful,
        failed
      },
      downloadedFiles,
      temporaryId: Date.now().toString() // Add a temporary ID to track this request
    });
  } catch (error) {
    postHandler.error('Error processing download', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 });
  }
}