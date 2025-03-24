#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Performs maintenance operations on the PSADT Pro UI installation.

.DESCRIPTION
    This script performs multiple maintenance tasks:
    1. Kills all Node.js processes
    2. Cleans the Next.js build cache
    3. Checks the database connection
    4. Verifies project structure and configurations
    5. Regenerates needed files

.EXAMPLE
    PS C:\> .\scripts\maintenance.ps1

    Performs maintenance operations to get the project in a working state.
#>

# Import common functions
. "$PSScriptRoot\common.ps1"

# Stop on first error
$ErrorActionPreference = "Stop"

# Navigator to project root
$projectRoot = Set-ProjectRoot
Write-Host "Starting maintenance process..." -ForegroundColor Cyan
Write-Host "Project root: $projectRoot" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Step 1: Kill Node.js processes
Write-Host "`nStep 1: Killing Node.js processes" -ForegroundColor Cyan
Write-Host "-------------------------------------------" -ForegroundColor Cyan
Kill-NodeProcesses

# Step 2: Clean build cache
Write-Host "`nStep 2: Cleaning build cache" -ForegroundColor Cyan
Write-Host "-------------------------------------------" -ForegroundColor Cyan

$nextDir = Get-ProjectFile ".next"
if (Test-Path -Path $nextDir) {
    try {
        Remove-Item -Path $nextDir -Recurse -Force
        Write-Host "Successfully removed .next directory" -ForegroundColor Green
    } catch {
        Write-Host "Error removing .next directory: $_" -ForegroundColor Red
    }
} else {
    Write-Host ".next directory not found - skipping" -ForegroundColor Yellow
}

# Step 3: Check for node_modules
Write-Host "`nStep 3: Checking node_modules" -ForegroundColor Cyan
Write-Host "-------------------------------------------" -ForegroundColor Cyan

$nodeModulesDir = Get-ProjectFile "node_modules"
if (Test-Path -Path $nodeModulesDir) {
    Write-Host "node_modules directory exists" -ForegroundColor Green
} else {
    Write-Host "node_modules directory not found - running npm install" -ForegroundColor Yellow
    
    try {
        & npm install
        if ($LASTEXITCODE -ne 0) { throw "Failed to run npm install" }
        Write-Host "Successfully installed dependencies" -ForegroundColor Green
    } catch {
        Write-Host "Error installing dependencies: $_" -ForegroundColor Red
    }
}

# Step 4: Check database
Write-Host "`nStep 4: Checking database" -ForegroundColor Cyan
Write-Host "-------------------------------------------" -ForegroundColor Cyan

$schemaPath = Get-ProjectFile "prisma\schema.prisma" -CheckExists
if (-not $schemaPath) {
    Write-Host "ERROR: Could not find Prisma schema file" -ForegroundColor Red
} else {
    Write-Host "Found Prisma schema at $schemaPath" -ForegroundColor Green
    
    $dbPath = Get-ProjectFile "prisma\dev.db" -CheckExists
    if (-not $dbPath) {
        Write-Host "Database file not found - running Prisma migrations" -ForegroundColor Yellow
        
        try {
            & npx prisma migrate deploy --schema="$schemaPath"
            if ($LASTEXITCODE -ne 0) { throw "Failed to run Prisma migrations" }
            Write-Host "Successfully ran Prisma migrations" -ForegroundColor Green
        } catch {
            Write-Host "Error running Prisma migrations: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "Database file exists at $dbPath" -ForegroundColor Green
    }
    
    # Generate Prisma client
    try {
        & npx prisma generate --schema="$schemaPath"
        if ($LASTEXITCODE -ne 0) { throw "Failed to generate Prisma client" }
        Write-Host "Successfully generated Prisma client" -ForegroundColor Green
    } catch {
        Write-Host "Error generating Prisma client: $_" -ForegroundColor Red
    }
}

# Step 5: Check storage directory
Write-Host "`nStep 5: Checking storage directory" -ForegroundColor Cyan
Write-Host "-------------------------------------------" -ForegroundColor Cyan

$storageDir = Get-ProjectFile "storage"
if (-not (Test-Path -Path $storageDir)) {
    try {
        New-Item -Path $storageDir -ItemType Directory
        Write-Host "Created storage directory" -ForegroundColor Green
    } catch {
        Write-Host "Error creating storage directory: $_" -ForegroundColor Red
    }
} else {
    Write-Host "Storage directory exists" -ForegroundColor Green
}

Write-Host "`nMaintenance process completed!" -ForegroundColor Green
Write-Host "You can now run: npm run dev" -ForegroundColor Cyan 