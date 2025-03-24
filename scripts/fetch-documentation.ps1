# PowerShell Script to fetch PSAppDeployToolkit documentation from GitHub
# This script downloads the documentation from the specified GitHub repository
# and saves it to the appropriate location for the Next.js application

# Parameters
param (
    [string]$RepoUrl = "https://github.com/PSAppDeployToolkit/PSAppDeployToolkit",
    [string]$Branch = "master",
    [string]$DocsPath = "docs",
    [string]$OutputPath = (Join-Path (Get-Location) "public/docs"),
    [switch]$Force = $false
)

# Setup logging
$LogFile = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "fetch-documentation.log"
function Write-Log {
    param (
        [string]$Message,
        [string]$Level = "INFO"
    )
    
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogEntry = "$Timestamp [$Level] $Message"
    
    # Write to console
    switch ($Level) {
        "ERROR" { Write-Host $LogEntry -ForegroundColor Red }
        "WARNING" { Write-Host $LogEntry -ForegroundColor Yellow }
        "SUCCESS" { Write-Host $LogEntry -ForegroundColor Green }
        default { Write-Host $LogEntry }
    }
    
    # Write to log file
    Add-Content -Path $LogFile -Value $LogEntry
}

Write-Log "Starting documentation fetch process"

# Create output directory if it doesn't exist
if (-not (Test-Path -Path $OutputPath)) {
    Write-Log "Creating output directory: $OutputPath"
    New-Item -Path $OutputPath -ItemType Directory -Force | Out-Null
}

# Set temporary path for downloading the repo
$TempPath = Join-Path $env:TEMP "PSADT-Docs-Temp"
$TempZipFile = Join-Path $env:TEMP "psadt-repo.zip"

# Clean up temp directory if it exists
if (Test-Path -Path $TempPath) {
    Write-Log "Cleaning up existing temp directory"
    Remove-Item -Path $TempPath -Recurse -Force
}

# Create temp directory
New-Item -Path $TempPath -ItemType Directory -Force | Out-Null

try {
    # Construct the download URL for the specific branch
    $DownloadUrl = "$RepoUrl/archive/$Branch.zip"
    Write-Log "Downloading repository from: $DownloadUrl"
    
    # Download the zip file
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $DownloadUrl -OutFile $TempZipFile
    
    # Extract the zip file
    Write-Log "Extracting repository to: $TempPath"
    Expand-Archive -Path $TempZipFile -DestinationPath $TempPath -Force
    
    # Find the docs directory
    $ExtractedRepoDir = Get-ChildItem -Path $TempPath -Directory | Select-Object -First 1
    $DocsSourcePath = Join-Path $ExtractedRepoDir.FullName $DocsPath
    
    if (-not (Test-Path -Path $DocsSourcePath)) {
        Write-Log "Documentation path not found: $DocsSourcePath" -Level "ERROR"
        exit 1
    }
    
    # Clear existing documentation if Force is specified
    if ($Force -and (Test-Path -Path $OutputPath)) {
        Write-Log "Removing existing documentation (Force mode)" -Level "WARNING"
        Remove-Item -Path $OutputPath -Recurse -Force
        New-Item -Path $OutputPath -ItemType Directory -Force | Out-Null
    }
    
    # Copy documentation files
    Write-Log "Copying documentation files to: $OutputPath"
    Copy-Item -Path "$DocsSourcePath\*" -Destination $OutputPath -Recurse -Force
    
    # Get stats
    $FilesCopied = (Get-ChildItem -Path $OutputPath -Recurse -File).Count
    Write-Log "Successfully copied $FilesCopied documentation files" -Level "SUCCESS"
    
    # Create a metadata file for the UI to use
    $Metadata = @{
        LastUpdated = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
        Branch = $Branch
        FileCount = $FilesCopied
    }
    $MetadataPath = Join-Path $OutputPath "metadata.json"
    $Metadata | ConvertTo-Json | Set-Content -Path $MetadataPath
    Write-Log "Created documentation metadata file" -Level "SUCCESS"
} 
catch {
    Write-Log "Error: $_" -Level "ERROR"
    exit 1
}
finally {
    # Clean up
    Write-Log "Cleaning up temporary files"
    if (Test-Path -Path $TempZipFile) {
        Remove-Item -Path $TempZipFile -Force
    }
    if (Test-Path -Path $TempPath) {
        Remove-Item -Path $TempPath -Recurse -Force
    }
}

Write-Log "Documentation fetch completed successfully" -Level "SUCCESS" 