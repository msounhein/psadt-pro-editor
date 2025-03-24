# Script to copy template files for cloning operation
param(
    [Parameter(Mandatory=$true)]
    [string]$sourceTemplateId,
    
    [Parameter(Mandatory=$true)]
    [string]$targetTemplateId,
    
    [Parameter(Mandatory=$false)]
    [string]$apiUrl = "http://localhost:3000/api/templates",
    
    [switch]$UpdateStatus
)

# Include common utility functions
. "$PSScriptRoot\common.ps1"

Write-Host "PSADT Pro UI - Template Files Cloner" -ForegroundColor Cyan
Write-Host "------------------------------------" -ForegroundColor Cyan
Write-Host "Source Template ID: $sourceTemplateId" -ForegroundColor Yellow
Write-Host "Target Template ID: $targetTemplateId" -ForegroundColor Yellow

$StorageRoot = Join-Path $PSScriptRoot "..\storage"
$TemplatesRoot = Join-Path $StorageRoot "templates"

# Function to get template details
function Get-TemplateDetails {
    param($templateId)
    
    try {
        $url = "$apiUrl/$templateId"
        $response = Invoke-RestMethod -Uri $url -Method Get -UseBasicParsing
        return $response.template
    } catch {
        Write-Host "Error fetching template details: $_" -ForegroundColor Red
        return $null
    }
}

# Get source template details
Write-Host "Fetching source template details..." -ForegroundColor Yellow
$sourceTemplate = Get-TemplateDetails -templateId $sourceTemplateId

if (-not $sourceTemplate) {
    Write-Host "Source template not found or could not be retrieved" -ForegroundColor Red
    exit 1
}

Write-Host "Source Template: $($sourceTemplate.name)" -ForegroundColor Green
Write-Host "Type: $($sourceTemplate.type)" -ForegroundColor Green
Write-Host "Extraction Path: $($sourceTemplate.extractionPath)" -ForegroundColor Green

# Get target template details
Write-Host "`nFetching target template details..." -ForegroundColor Yellow
$targetTemplate = Get-TemplateDetails -templateId $targetTemplateId

if (-not $targetTemplate) {
    Write-Host "Target template not found or could not be retrieved" -ForegroundColor Red
    exit 1
}

Write-Host "Target Template: $($targetTemplate.name)" -ForegroundColor Green
Write-Host "Type: $($targetTemplate.type)" -ForegroundColor Green
Write-Host "Extraction Path: $($targetTemplate.extractionPath)" -ForegroundColor Green

# Check if source path exists
$sourcePath = Join-Path $StorageRoot $sourceTemplate.extractionPath
if (-not (Test-Path -Path $sourcePath)) {
    Write-Host "Source path does not exist: $sourcePath" -ForegroundColor Red
    exit 1
}

# Prepare target path
$targetPath = Join-Path $StorageRoot $targetTemplate.extractionPath
$targetDir = Split-Path -Parent $targetPath

# Create target directory if it doesn't exist
if (-not (Test-Path -Path $targetDir)) {
    Write-Host "Creating target directory structure: $targetDir" -ForegroundColor Yellow
    New-Item -Path $targetDir -ItemType Directory -Force | Out-Null
}

# Copy files
Write-Host "`nCopying files from source to target..." -ForegroundColor Yellow
Write-Host "Source: $sourcePath" -ForegroundColor Yellow
Write-Host "Target: $targetPath" -ForegroundColor Yellow

try {
    # Check if source is a directory or file
    if (Test-Path -Path $sourcePath -PathType Container) {
        # It's a directory, copy contents
        if (-not (Test-Path -Path $targetPath)) {
            New-Item -Path $targetPath -ItemType Directory -Force | Out-Null
        }
        
        # Copy all items from source to target
        Copy-Item -Path "$sourcePath\*" -Destination $targetPath -Recurse -Force
        
        # Count files copied
        $fileCount = (Get-ChildItem -Path $targetPath -Recurse -File).Count
        
        Write-Host "Successfully copied $fileCount files to target directory" -ForegroundColor Green
    } else {
        # It's a single file
        Copy-Item -Path $sourcePath -Destination $targetPath -Force
        Write-Host "Successfully copied file to target" -ForegroundColor Green
    }
    
    # Create a marker file to indicate successful cloning
    $markerFile = Join-Path $targetPath ".cloned_from_$sourceTemplateId"
    Set-Content -Path $markerFile -Value (Get-Date)
    
    Write-Host "Added clone marker file: $markerFile" -ForegroundColor Green
    
    # Update template status if requested
    if ($UpdateStatus) {
        Write-Host "`nUpdating template extraction status..." -ForegroundColor Yellow
        
        $updateUrl = "$apiUrl/$targetTemplateId"
        $body = @{
            extractionStatus = "complete"
            extractionPath = $targetTemplate.extractionPath
            lastExtractionDate = (Get-Date -Format "o")
        } | ConvertTo-Json
        
        try {
            $updateResponse = Invoke-RestMethod -Uri $updateUrl -Method Put -Body $body -ContentType "application/json" -UseBasicParsing
            Write-Host "Template status updated successfully" -ForegroundColor Green
        } catch {
            Write-Host "Error updating template status: $_" -ForegroundColor Red
            Write-Host "You may need to manually update the status using the template-management.js script" -ForegroundColor Yellow
        }
    } else {
        Write-Host "`nTemplate files have been cloned successfully, but status was not updated." -ForegroundColor Yellow
        Write-Host "You can update the status with this command:" -ForegroundColor Yellow
        Write-Host "node scripts/template-management.js update $targetTemplateId --status complete" -ForegroundColor Gray
    }
    
    Write-Host "`nTemplate cloning operation completed successfully!" -ForegroundColor Green
} catch {
    Write-Host "Error copying files: $_" -ForegroundColor Red
    exit 1
}
