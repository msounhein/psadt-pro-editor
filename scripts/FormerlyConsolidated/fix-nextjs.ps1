#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Fix script for common Next.js issues.

.DESCRIPTION
    This script addresses common Next.js issues, particularly those related to
    symbolic links, file permissions, and cache problems that can occur on Windows.

.EXAMPLE
    PS C:\> .\scripts\fix-nextjs.ps1

    Runs the fix script for common Next.js issues.
#>

Write-Host "Running Next.js Fix Script..." -ForegroundColor Cyan
Write-Host "--------------------------------" -ForegroundColor Cyan

# Step 1: Clean the Next.js cache
Write-Host "Cleaning Next.js cache..." -ForegroundColor Yellow
if (Test-Path -Path ".next") {
    Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "Next.js cache removed" -ForegroundColor Green
} else {
    Write-Host "No .next directory found. Already clean." -ForegroundColor Green
}

# Step 2: Remove node_modules/.cache
Write-Host "Cleaning node_modules cache..." -ForegroundColor Yellow
if (Test-Path -Path "node_modules/.cache") {
    Remove-Item -Path "node_modules/.cache" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "Node modules cache removed" -ForegroundColor Green
} else {
    Write-Host "No node_modules/.cache directory found. Already clean." -ForegroundColor Green
}

# Step 3: Check for symbolic link errors in .next
if (Test-Path -Path ".next") {
    Write-Host "Checking for symbolic link errors..." -ForegroundColor Yellow
    $fallbackPath = ".next/static/chunks/fallback"
    if (Test-Path -Path $fallbackPath) {
        try {
            $fallbackItems = Get-Item -Path $fallbackPath -ErrorAction Stop
            if ($fallbackItems.Attributes -band [System.IO.FileAttributes]::ReparsePoint) {
                Write-Host "Found problematic symbolic link, removing..." -ForegroundColor Yellow
                Remove-Item -Path $fallbackPath -Force -ErrorAction SilentlyContinue
                Write-Host "Symbolic link removed" -ForegroundColor Green
            }
        } catch {
            Write-Host "Error accessing symbolic link. Attempting removal..." -ForegroundColor Yellow
            Remove-Item -Path $fallbackPath -Force -ErrorAction SilentlyContinue
        }
    }
}

# Step 4: Clear Prisma caches
Write-Host "Cleaning Prisma caches..." -ForegroundColor Yellow
$prismaPaths = @(
    "node_modules/.prisma",
    "node_modules/@prisma/client/generator-build"
)

foreach ($path in $prismaPaths) {
    if (Test-Path -Path $path) {
        Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "Removed $path" -ForegroundColor Green
    }
}

# Step 5: Fix webpack cache issues
Write-Host "Fixing webpack cache issues..." -ForegroundColor Yellow
& "$PSScriptRoot\fix-webpack-cache.ps1"

# Step 6: Regenerate Prisma client
Write-Host "Regenerating Prisma client..." -ForegroundColor Yellow
& npx prisma generate

Write-Host "`nNext.js Fix Completed!" -ForegroundColor Green
Write-Host "--------------------------------" -ForegroundColor Cyan
Write-Host "You can now run: npm run dev" -ForegroundColor Cyan
Write-Host "If you still experience issues, try: npm run rebuild" -ForegroundColor Yellow 