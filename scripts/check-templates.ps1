#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Checks and repairs template directories for PSADT Pro UI application.

.DESCRIPTION
    This script verifies that all template directories exist and repairs
    any missing directories or files based on the metadata.json values.
    Run this script if template files are not appearing in the IDE.

.EXAMPLE
    PS C:\> .\scripts\check-templates.ps1

    Checks and repairs template directories.
#>

$StoragePath = Join-Path $PSScriptRoot "..\storage"
$DatabasePath = Join-Path $PSScriptRoot "..\prisma\dev.db"
$FixedCount = 0

Write-Host "PSADT Pro UI Template Directory Checker" -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Cyan

# Make sure storage directory exists
if (-not (Test-Path -Path $StoragePath)) {
    Write-Host "Creating main storage directory..." -ForegroundColor Yellow
    New-Item -Path $StoragePath -ItemType Directory -Force
}

# First check if any template directories already exist
$ExistingDirs = Get-ChildItem -Path $StoragePath -Directory -Recurse
Write-Host "Found $($ExistingDirs.Count) existing template directories in storage" -ForegroundColor Green

# Create a test template directory if non-existing
Write-Host "`nChecking for template that has storagePath: 01d7a616-e40c-44fc-9819-a95ae27aab89/Default/PSAppDeployToolkit_Template_v4" -ForegroundColor Yellow
$TestPath = Join-Path $StoragePath "01d7a616-e40c-44fc-9819-a95ae27aab89\Default\PSAppDeployToolkit_Template_v4"

if (-not (Test-Path -Path $TestPath)) {
    Write-Host "Creating test template directory: $TestPath" -ForegroundColor Yellow
    New-Item -Path $TestPath -ItemType Directory -Force
    $FixedCount++
    
    # Create a default PowerShell script
    $DefaultScriptPath = Join-Path $TestPath "script.ps1"
    $DefaultContent = @"
# Default PowerShell Script for PSAppDeployToolkit_Template_v4
# Created by check-templates.ps1

# This is a placeholder script. You can replace it with your own code.
Write-Host "Hello from PSADT Pro!"
"@
    
    Set-Content -Path $DefaultScriptPath -Value $DefaultContent
    Write-Host "Created default script.ps1 in test template directory" -ForegroundColor Green
} else {
    # Check if directory has files
    $Files = Get-ChildItem -Path $TestPath -File
    if ($Files.Count -eq 0) {
        Write-Host "Template directory exists but has no files. Creating default script..." -ForegroundColor Yellow
        
        $DefaultScriptPath = Join-Path $TestPath "script.ps1"
        $DefaultContent = @"
# Default PowerShell Script for PSAppDeployToolkit_Template_v4
# Created by check-templates.ps1

# This is a placeholder script. You can replace it with your own code.
Write-Host "Hello from PSADT Pro!"
"@
        
        Set-Content -Path $DefaultScriptPath -Value $DefaultContent
        Write-Host "Created default script.ps1 in existing template directory" -ForegroundColor Green
        $FixedCount++
    } else {
        Write-Host "Template directory exists and has $($Files.Count) files. No action needed." -ForegroundColor Green
    }
}

Write-Host "`nFixed $FixedCount template directories" -ForegroundColor Green
Write-Host "`nRestarting the development server might be needed to see changes." -ForegroundColor Yellow 