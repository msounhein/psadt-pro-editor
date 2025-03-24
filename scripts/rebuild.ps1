#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Performs a complete rebuild of the PSADT Pro UI application.

.DESCRIPTION
    This script provides a complete rebuild process including:
    1. Cleaning all cache and build files
    2. Removing and reinstalling node_modules
    3. Regenerating Prisma client
    4. Rebuilding the application

.EXAMPLE
    PS C:\> .\scripts\rebuild.ps1

    Performs a complete rebuild of the application.
#>

# Stop on first error
$ErrorActionPreference = "Stop"

# Get the root directory of the project
$projectRoot = Join-Path $PSScriptRoot ".."

# Function to execute a command and handle errors
function Invoke-CommandWithErrorHandling {
    param (
        [string] $Command,
        [string] $Description
    )
    
    Write-Host "🔄 $Description..." -ForegroundColor Cyan
    
    try {
        Invoke-Expression $Command
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ $Description failed with exit code $LASTEXITCODE" -ForegroundColor Red
            exit 1
        }
        Write-Host "✅ $Description completed successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ $Description failed: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# Clear the console
Clear-Host

Write-Host "Starting complete rebuild of PSADT Pro UI..." -ForegroundColor Cyan
Write-Host "--------------------------------" -ForegroundColor Cyan

# Step 1: Run the clean script
Write-Host "Step 1: Cleaning build cache..." -ForegroundColor Yellow
& "$PSScriptRoot\clean-build.ps1"

# Step 2: Fix webpack cache issues
Write-Host "Step 2: Fixing webpack cache issues..." -ForegroundColor Yellow
& "$PSScriptRoot\fix-webpack-cache.ps1"

# Step 3: Remove node_modules
Write-Host "Step 3: Removing node_modules..." -ForegroundColor Yellow
if (Test-Path -Path "node_modules") {
    Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "node_modules removed" -ForegroundColor Green
} else {
    Write-Host "No node_modules directory found. Already clean." -ForegroundColor Green
}

# Step 4: Reinstall dependencies
Write-Host "Step 4: Reinstalling dependencies..." -ForegroundColor Yellow
npm install --legacy-peer-deps
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error reinstalling dependencies. Please check the output above." -ForegroundColor Red
    exit 1
}
Write-Host "Dependencies reinstalled successfully" -ForegroundColor Green

# Step 5: Generate Prisma client
Write-Host "Step 5: Generating Prisma client..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error generating Prisma client. Please check the output above." -ForegroundColor Red
    exit 1
}
Write-Host "Prisma client generated successfully" -ForegroundColor Green

# Step 6: Check for database
Write-Host "Step 6: Checking database..." -ForegroundColor Yellow
if (-not (Test-Path -Path "prisma/dev.db")) {
    Write-Host "Database not found. Running database setup..." -ForegroundColor Yellow
    
    # Run the database setup script
    & npm run db:sqlite
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error setting up database. Please check the output above." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Database file found" -ForegroundColor Green
}

# Step 7: Ensure demo user exists
Write-Host "Step 7: Ensuring demo user exists..." -ForegroundColor Yellow
if (Test-Path -Path "create-demo-user.js") {
    node create-demo-user.js
} else {
    Write-Host "Demo user script not found. This may lead to login issues." -ForegroundColor Yellow
}

Write-Host "`nRebuild completed successfully!" -ForegroundColor Green
Write-Host "--------------------------------" -ForegroundColor Cyan
Write-Host "You can now run: npm run dev" -ForegroundColor Cyan
Write-Host "And navigate to: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Login with: demo@example.com / password123" -ForegroundColor White 