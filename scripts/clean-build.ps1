#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Simplified clean script to delete the Next.js build cache.

.DESCRIPTION
    Removes the Next.js build directory to fix readlink errors.

.EXAMPLE
    PS C:\> .\scripts\clean-build.ps1
#>

# Import common functions
. "$PSScriptRoot\common.ps1"

# Navigate to project root
$projectRoot = Set-ProjectRoot
Write-Host "Cleaning Next.js build cache..." -ForegroundColor Cyan
Write-Host "Project root: $projectRoot" -ForegroundColor Cyan

# Remove .next directory
$nextDir = Get-ProjectFile ".next"
if (Test-Path -Path $nextDir) {
    try {
        Remove-Item -Path $nextDir -Recurse -Force
        Write-Host "Successfully removed .next directory" -ForegroundColor Green
    } catch {
        Write-Host "Error removing .next directory: $_" -ForegroundColor Red
    }
} else {
    Write-Host ".next directory not found" -ForegroundColor Yellow
}

Write-Host "`nCleaning completed!" -ForegroundColor Green
Write-Host "You can now run: npm run dev" -ForegroundColor Cyan