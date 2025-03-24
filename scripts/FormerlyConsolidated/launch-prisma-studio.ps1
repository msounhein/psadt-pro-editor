#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Launches Prisma Studio for database management.

.DESCRIPTION
    This script launches the Prisma Studio interface, which provides a visual way 
    to view and edit database records. It ensures the correct database and schema 
    are used by locating the prisma schema file in the project.

.EXAMPLE
    PS C:\> .\scripts\launch-prisma-studio.ps1

    Launches Prisma Studio in your default browser.
#>

# Import common functions
. "$PSScriptRoot\common.ps1"

# Navigate to project root
$projectRoot = Set-ProjectRoot
Write-Host "Launching Prisma Studio..." -ForegroundColor Cyan
Write-Host "Project root: $projectRoot" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Verify Prisma schema exists
$schemaPath = Get-ProjectFile "prisma\schema.prisma" -CheckExists
if (-not $schemaPath) {
    Write-Host "ERROR: Could not find Prisma schema file" -ForegroundColor Red
    exit 1
}
Write-Host "Found Prisma schema at $schemaPath" -ForegroundColor Green

# Check if database file exists (for SQLite)
$dbPath = Get-ProjectFile "prisma\dev.db" -CheckExists
if (-not $dbPath) {
    Write-Host "WARNING: SQLite database file not found" -ForegroundColor Yellow
    Write-Host "This could be normal if you're using PostgreSQL or another database provider" -ForegroundColor Yellow
    
    # Check the schema to see what provider is being used
    $schemaContent = Get-Content -Path $schemaPath -Raw
    if ($schemaContent -match 'provider\s*=\s*"sqlite"') {
        Write-Host "Schema specifies SQLite but database file not found!" -ForegroundColor Red
        Write-Host "Run 'npm run db:reset' or 'npx prisma migrate dev' to create the database" -ForegroundColor Yellow
        
        $continue = Read-Host "Do you want to continue anyway? (y/n)"
        if ($continue -ne "y") {
            exit 0
        }
    } else {
        Write-Host "Schema appears to use a remote database provider, continuing..." -ForegroundColor Green
    }
}

# Launch Prisma Studio
Write-Host "`nStarting Prisma Studio with schema: $schemaPath" -ForegroundColor Cyan
Write-Host "Prisma Studio will open in your default browser." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server when you're done." -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Cyan

try {
    # Run Prisma Studio
    & npx prisma studio --schema="$schemaPath"
    
    if ($LASTEXITCODE -ne 0) { 
        throw "Failed to start Prisma Studio" 
    }
} catch {
    Write-Host "Error starting Prisma Studio: $_" -ForegroundColor Red
    exit 1
} 