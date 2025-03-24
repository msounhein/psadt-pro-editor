#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Consolidated troubleshooting and maintenance script for PSADT Pro UI.

.DESCRIPTION
    This script combines the functionality of several maintenance scripts:
    - diagnose.ps1
    - fix-webpack-cache.ps1
    - fix-nextjs.ps1
    - maintenance.ps1
    - clean-build.ps1
    - kill-node.ps1

    It performs diagnostics, identifies problems, and applies appropriate fixes.

.PARAMETER Action
    The action to perform:
    - diagnose: Only diagnose issues without fixing (default)
    - fix-all: Automatically fix all detected issues
    - fix-webpack: Fix Webpack cache issues
    - fix-nextjs: Fix Next.js cache issues
    - clean: Clean build artifacts
    - kill-node: Kill all Node.js processes
    - maintenance: Perform routine maintenance

.PARAMETER Usage
    If specified, displays common usage examples and exits.

.EXAMPLE
    PS C:\> .\scripts\troubleshoot.ps1
    
    Diagnoses issues without making any changes.

.EXAMPLE
    PS C:\> .\scripts\troubleshoot.ps1 -Action fix-all
    
    Diagnoses and automatically fixes all detected issues.

.EXAMPLE
    PS C:\> .\scripts\troubleshoot.ps1 -Action fix-webpack
    
    Fixes only Webpack cache issues.
#>

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("diagnose", "fix-all", "fix-webpack", "fix-nextjs", "clean", "kill-node", "maintenance")]
    [string]$Action = "diagnose",
    
    [Parameter(Mandatory=$false)]
    [switch]$Usage
)

# Import common functions
. "$PSScriptRoot\common.ps1"

# If -Usage parameter is specified, display common usage examples and exit
if ($Usage) {
    Write-Host "PSADT Pro UI Troubleshooting Tool - Common Usage Examples" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Diagnose issues without making changes:" -ForegroundColor Yellow
    Write-Host "  .\scripts\troubleshoot.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "Fix all detected issues:" -ForegroundColor Yellow
    Write-Host "  .\scripts\troubleshoot.ps1 -Action fix-all" -ForegroundColor White
    Write-Host ""
    Write-Host "Fix specific issues:" -ForegroundColor Yellow
    Write-Host "  .\scripts\troubleshoot.ps1 -Action fix-webpack" -ForegroundColor White
    Write-Host "  .\scripts\troubleshoot.ps1 -Action fix-nextjs" -ForegroundColor White
    Write-Host "  .\scripts\troubleshoot.ps1 -Action clean" -ForegroundColor White
    Write-Host "  .\scripts\troubleshoot.ps1 -Action kill-node" -ForegroundColor White
    Write-Host "  .\scripts\troubleshoot.ps1 -Action maintenance" -ForegroundColor White
    Write-Host ""
    Write-Host "Note: Run all scripts from the project root directory, not from the scripts directory." -ForegroundColor Red
    exit
}

# Ensure we're in the project root
Set-ProjectRoot

# Define color-coded message functions
function Write-InfoMessage($message) {
    Write-Host $message -ForegroundColor Cyan
}

function Write-SuccessMessage($message) {
    Write-Host $message -ForegroundColor Green
}

function Write-WarningMessage($message) {
    Write-Host $message -ForegroundColor Yellow
}

function Write-ErrorMessage($message) {
    Write-Host $message -ForegroundColor Red
}

# Display header
Write-InfoMessage "========================================================"
Write-InfoMessage "  PSADT Pro UI Troubleshooting and Maintenance Tool"
Write-InfoMessage "========================================================"
Write-InfoMessage "Action: $Action"
Write-InfoMessage "Started at: $(Get-Date)"
Write-InfoMessage "========================================================`n"

# Diagnose issues function
function Diagnose-Issues {
    $issues = @()
    
    Write-InfoMessage "Diagnosing potential issues..."
    
    # Check for .next directory (Next.js cache)
    if (Test-Path -Path '.next') {
        $issues += @{
            Type = "nextjs-cache";
            Description = "Next.js cache directory exists and may contain stale data";
            Fix = "Remove the .next directory to clear Next.js cache";
            Action = "fix-nextjs";
        }
    }
    
    # Check for node_modules/.cache directory (Webpack cache)
    if (Test-Path -Path 'node_modules\.cache') {
        $issues += @{
            Type = "webpack-cache";
            Description = "Webpack cache directory exists and may contain stale data";
            Fix = "Remove the node_modules/.cache directory to clear Webpack cache";
            Action = "fix-webpack";
        }
    }
    
    # Check for open Node.js processes
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($nodeProcesses -and $nodeProcesses.Count -gt 0) {
        $issues += @{
            Type = "node-processes";
            Description = "$($nodeProcesses.Count) Node.js processes are running and may lock files";
            Fix = "Kill all Node.js processes";
            Action = "kill-node";
        }
    }
    
    # Check if .env file exists
    if (-not (Test-Path -Path '.env')) {
        $issues += @{
            Type = "missing-env";
            Description = ".env file is missing, which may cause configuration issues";
            Fix = "Create a new .env file based on .env.example";
            Action = "fix-env";
        }
    }
    
    # Check if SQLite database exists
    if (-not (Test-Path -Path 'prisma\dev.db')) {
        $issues += @{
            Type = "missing-db";
            Description = "SQLite database is missing";
            Fix = "Initialize the database with 'npx prisma migrate dev'";
            Action = "fix-db";
        }
    }
    
    # Check for the existence of prisma/schema.prisma
    if (-not (Test-Path -Path 'prisma\schema.prisma')) {
        $issues += @{
            Type = "missing-schema";
            Description = "Prisma schema file is missing";
            Fix = "Restore the prisma/schema.prisma file";
            Action = "fix-prisma";
        }
    }
    
    # Check if node_modules exists
    if (-not (Test-Path -Path 'node_modules')) {
        $issues += @{
            Type = "missing-node-modules";
            Description = "node_modules directory is missing, dependencies are not installed";
            Fix = "Run 'npm install' to install dependencies";
            Action = "fix-dependencies";
        }
    }
    
    # Return the list of issues
    return $issues
}

# Fix issues function
function Fix-Issues($issues) {
    foreach ($issue in $issues) {
        Write-InfoMessage "Fixing issue: $($issue.Description)"
        
        switch ($issue.Type) {
            "nextjs-cache" {
                Fix-NextJsCache
            }
            "webpack-cache" {
                Fix-WebpackCache
            }
            "node-processes" {
                Kill-NodeProcesses
            }
            "missing-env" {
                Fix-EnvFile
            }
            "missing-db" {
                Fix-Database
            }
            "missing-schema" {
                Write-ErrorMessage "Cannot automatically fix missing Prisma schema. Please restore from source control."
            }
            "missing-node-modules" {
                Fix-Dependencies
            }
            default {
                Write-WarningMessage "No automatic fix available for issue type: $($issue.Type)"
            }
        }
    }
}

# Fix Next.js cache
function Fix-NextJsCache {
    Write-InfoMessage "Fixing Next.js cache issues..."
    
    # Check if .next directory exists
    if (Test-Path -Path '.next') {
        Write-InfoMessage "Removing .next directory..."
        Remove-Item -Path '.next' -Recurse -Force
        Write-SuccessMessage "Next.js cache cleared successfully."
    } else {
        Write-InfoMessage "No Next.js cache directory found."
    }
    
    # Also check for the specific cache directories that might cause issues
    $nextCacheDirs = @('.next/cache')
    foreach ($dir in $nextCacheDirs) {
        if (Test-Path -Path $dir) {
            Write-InfoMessage "Removing $dir..."
            Remove-Item -Path $dir -Recurse -Force
        }
    }
}

# Fix Webpack cache
function Fix-WebpackCache {
    Write-InfoMessage "Fixing Webpack cache issues..."
    
    # Check if node_modules/.cache directory exists
    if (Test-Path -Path 'node_modules\.cache') {
        Write-InfoMessage "Removing node_modules/.cache directory..."
        Remove-Item -Path 'node_modules\.cache' -Recurse -Force
        Write-SuccessMessage "Webpack cache cleared successfully."
    } else {
        Write-InfoMessage "No Webpack cache directory found."
    }
}

# Kill Node.js processes
function Kill-NodeProcesses {
    Write-InfoMessage "Killing Node.js processes..."
    
    $nodeProcesses = Get-Process -Name "node", "npm", "npx" -ErrorAction SilentlyContinue
    
    if ($nodeProcesses) {
        $nodeProcesses | ForEach-Object {
            Write-InfoMessage "Stopping process: $($_.Name) (ID: $($_.Id))"
            try {
                Stop-Process -Id $_.Id -Force
                Write-InfoMessage "Process stopped."
            } catch {
                Write-ErrorMessage "Failed to stop process: $($_.Id) - $($_.Exception.Message)"
            }
        }
        Write-SuccessMessage "All Node.js processes have been stopped."
    } else {
        Write-InfoMessage "No Node.js processes found."
    }
}

# Fix .env file
function Fix-EnvFile {
    Write-InfoMessage "Creating .env file..."
    
    if (Test-Path -Path '.env.example') {
        Copy-Item -Path '.env.example' -Destination '.env'
        Write-SuccessMessage ".env file created from .env.example."
    } else {
        # Create minimal .env file
        @"
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
"@ | Out-File -FilePath '.env' -Encoding utf8
        
        Write-SuccessMessage "Basic .env file created."
    }
}

# Fix database
function Fix-Database {
    Write-InfoMessage "Initializing database..."
    
    try {
        # Run Prisma migrations
        Write-InfoMessage "Running 'npx prisma migrate dev'..."
        npx prisma migrate dev --name init
        
        # Generate Prisma client
        Write-InfoMessage "Generating Prisma client..."
        npx prisma generate
        
        Write-SuccessMessage "Database initialized successfully."
    } catch {
        Write-ErrorMessage "Failed to initialize database: $($_.Exception.Message)"
    }
}

# Fix dependencies
function Fix-Dependencies {
    Write-InfoMessage "Installing dependencies..."
    
    try {
        # Install dependencies
        npm install
        Write-SuccessMessage "Dependencies installed successfully."
    } catch {
        Write-ErrorMessage "Failed to install dependencies: $($_.Exception.Message)"
    }
}

# Clean build artifacts
function Clean-BuildArtifacts {
    Write-InfoMessage "Cleaning build artifacts..."
    
    # Define directories to remove
    $dirsToRemove = @(
        '.next',
        'node_modules\.cache',
        'out',
        '.vercel',
        '.turbo'
    )
    
    # Remove each directory if it exists
    foreach ($dir in $dirsToRemove) {
        if (Test-Path -Path $dir) {
            Write-InfoMessage "Removing $dir..."
            Remove-Item -Path $dir -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
    
    Write-SuccessMessage "Build artifacts cleaned successfully."
}

# Perform routine maintenance
function Perform-Maintenance {
    Write-InfoMessage "Performing routine maintenance..."
    
    # Clean cache directories
    Clean-BuildArtifacts
    
    # Kill any hanging Node.js processes
    Kill-NodeProcesses
    
    # Update dependencies if needed
    Write-InfoMessage "Checking for outdated dependencies..."
    npm outdated
    
    # Run Prisma generate to ensure client is up to date
    Write-InfoMessage "Updating Prisma client..."
    npx prisma generate
    
    Write-SuccessMessage "Routine maintenance completed."
}

# Main execution based on Action parameter
switch ($Action) {
    "diagnose" {
        $issues = Diagnose-Issues
        
        if ($issues.Count -eq 0) {
            Write-SuccessMessage "No issues detected. Your PSADT Pro UI installation appears to be healthy."
        } else {
            Write-WarningMessage "$($issues.Count) issues detected:"
            
            foreach ($issue in $issues) {
                Write-Host "`n"
                Write-WarningMessage "ISSUE: $($issue.Description)"
                Write-InfoMessage "FIX: $($issue.Fix)"
                Write-Host "To fix this issue, run: .\scripts\troubleshoot.ps1 -Action $($issue.Action)" -ForegroundColor Gray
            }
            
            Write-Host "`nTo fix all issues, run: .\scripts\troubleshoot.ps1 -Action fix-all" -ForegroundColor Gray
        }
    }
    "fix-all" {
        $issues = Diagnose-Issues
        
        if ($issues.Count -eq 0) {
            Write-SuccessMessage "No issues detected. Your PSADT Pro UI installation appears to be healthy."
        } else {
            Write-InfoMessage "Fixing all $($issues.Count) detected issues..."
            Fix-Issues -issues $issues
            Write-SuccessMessage "All fixable issues have been addressed."
        }
    }
    "fix-webpack" {
        Fix-WebpackCache
    }
    "fix-nextjs" {
        Fix-NextJsCache
    }
    "clean" {
        Clean-BuildArtifacts
    }
    "kill-node" {
        Kill-NodeProcesses
    }
    "maintenance" {
        Perform-Maintenance
    }
}

# Display footer
Write-InfoMessage "`n========================================================"
Write-InfoMessage "Completed at: $(Get-Date)"
Write-InfoMessage "========================================================`n" 