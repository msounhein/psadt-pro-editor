<#
.SYNOPSIS
    Fixes webpack caching issues for Next.js applications.

.DESCRIPTION
    This script specifically targets the webpack caching errors in Next.js applications
    where pack files fail to be created due to ENOENT errors. It removes the problematic
    webpack cache directories and helps resolve the "Caching failed for pack" errors.

.EXAMPLE
    PS C:\> .\scripts\fix-webpack-cache.ps1

    Cleans the webpack cache directories to resolve caching issues.
#>

Write-Host "Fixing webpack cache issues..." -ForegroundColor Cyan
Write-Host "--------------------------------" -ForegroundColor Cyan

# Target webpack cache directories
$webpackCacheDirs = @(
    ".next/cache/webpack",
    ".next/static/chunks/fallback"
)

# Process each directory
foreach ($dir in $webpackCacheDirs) {
    Write-Host "Checking $dir..." -ForegroundColor Yellow
    
    if (Test-Path -Path $dir) {
        # Handle special case for fallback symbolic link
        if ($dir -eq ".next/static/chunks/fallback") {
            try {
                $item = Get-Item -Path $dir -ErrorAction Stop
                if ($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) {
                    Write-Host "Found problematic symbolic link, removing..." -ForegroundColor Yellow
                    Remove-Item -Path $dir -Force -ErrorAction SilentlyContinue
                    Write-Host "Symbolic link removed" -ForegroundColor Green
                } else {
                    Remove-Item -Path $dir -Recurse -Force -ErrorAction SilentlyContinue
                    Write-Host "Directory removed" -ForegroundColor Green
                }
            } catch {
                Write-Host "Error accessing path, attempting force removal..." -ForegroundColor Yellow
                Remove-Item -Path $dir -Force -ErrorAction SilentlyContinue
                if (-not $?) {
                    Write-Host "Failed to remove path. You may need to run this script as administrator." -ForegroundColor Red
                } else {
                    Write-Host "Path removed" -ForegroundColor Green
                }
            }
        } else {
            # Handle regular directories
            Remove-Item -Path $dir -Recurse -Force -ErrorAction SilentlyContinue
            Write-Host "Removed $dir" -ForegroundColor Green
        }
    } else {
        Write-Host "Directory not found, already clean: $dir" -ForegroundColor Green
    }
}

# Clean specific problematic pack files
Write-Host "Checking for problematic pack files..." -ForegroundColor Yellow
$packFiles = Get-ChildItem -Path ".next/cache/webpack" -Recurse -Filter "*.pack.gz*" -ErrorAction SilentlyContinue
if ($packFiles) {
    foreach ($file in $packFiles) {
        Remove-Item -Path $file.FullName -Force -ErrorAction SilentlyContinue
        Write-Host "Removed pack file: $($file.Name)" -ForegroundColor Green
    }
} else {
    Write-Host "No problematic pack files found" -ForegroundColor Green
}

Write-Host "`nWebpack cache fix completed!" -ForegroundColor Green
Write-Host "--------------------------------" -ForegroundColor Cyan
Write-Host "You can now run: npm run dev" -ForegroundColor Cyan
Write-Host "If issues persist, try: npm run rebuild" -ForegroundColor Yellow 