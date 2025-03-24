#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Kills all Node.js processes and resets the database.

.DESCRIPTION
    This script first kills all running Node.js and npm processes
    to prevent file locking issues, then resets the database and
    regenerates the Prisma client.

.EXAMPLE
    PS C:\> .\scripts\db-cleanup.ps1

    Kills all Node.js processes and resets the database.
#>

# Stop on first error
$ErrorActionPreference = "Stop"

# Import common functions
. "$PSScriptRoot\common.ps1"

# Navigate to project root
$projectRoot = Set-ProjectRoot
Write-Host "Starting database cleanup process..." -ForegroundColor Cyan
Write-Host "Project root: $projectRoot" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Step 1: Kill all Node.js and npm processes
Write-Host "`nStep 1: Killing all Node.js and npm processes" -ForegroundColor Cyan
Write-Host "-------------------------------------------" -ForegroundColor Cyan
Kill-NodeProcesses

# Verify Prisma schema exists
$schemaPath = Get-ProjectFile "prisma\schema.prisma" -CheckExists
if (-not $schemaPath) {
    Write-Host "ERROR: Could not find Prisma schema file" -ForegroundColor Red
    exit 1
}
Write-Host "Found Prisma schema at $schemaPath" -ForegroundColor Green

# Step 2: Reset the database
Write-Host "`nStep 2: Resetting the database" -ForegroundColor Cyan
Write-Host "-------------------------------------------" -ForegroundColor Cyan

# Check if database file exists and back it up
$dbPath = Get-ProjectFile "prisma\dev.db"
if (Test-Path -Path $dbPath) {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupPath = "$dbPath.$timestamp.bak"
    Copy-Item -Path $dbPath -Destination $backupPath
    Write-Host "Existing database backed up to $backupPath" -ForegroundColor Yellow
}

# Run the database reset
Write-Host "Resetting the database..." -ForegroundColor Cyan
try {
    & npx prisma migrate reset --force --schema="$schemaPath"
    if ($LASTEXITCODE -ne 0) { throw "Failed to reset database" }
    Write-Host "Database reset successfully" -ForegroundColor Green
} catch {
    Write-Host "Error resetting database: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Regenerate Prisma Client
Write-Host "`nStep 3: Regenerating Prisma client" -ForegroundColor Cyan
Write-Host "-------------------------------------------" -ForegroundColor Cyan

try {
    & npx prisma generate --schema="$schemaPath"
    if ($LASTEXITCODE -ne 0) { throw "Failed to generate Prisma client" }
    Write-Host "Prisma client generated successfully" -ForegroundColor Green
} catch {
    Write-Host "Error generating Prisma client: $_" -ForegroundColor Red
    exit 1
}

# Step 4: Apply migrations
Write-Host "`nStep 4: Applying database migrations" -ForegroundColor Cyan
Write-Host "-------------------------------------------" -ForegroundColor Cyan

try {
    & npx prisma migrate deploy --schema="$schemaPath"
    if ($LASTEXITCODE -ne 0) { throw "Failed to apply migrations" }
    Write-Host "Migrations applied successfully" -ForegroundColor Green
} catch {
    Write-Host "Error applying migrations: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`nDatabase cleanup process completed successfully!" -ForegroundColor Green
Write-Host "You can now run 'npm run dev' to start the development server" -ForegroundColor Cyan 