#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Sets up a SQLite database for local development.

.DESCRIPTION
    This script sets up a SQLite database for local development, creates necessary tables,
    and seeds it with sample data. It will back up any existing database file before proceeding.

.EXAMPLE
    PS C:\> .\setup-sqlite.ps1

    Sets up the SQLite database, recreates all tables, and seeds with sample data.
#>

# Stop on first error
$ErrorActionPreference = "Stop"

Write-Host "Starting SQLite database setup..." -ForegroundColor Cyan

# Check if database file exists and back it up
if (Test-Path -Path ".\prisma\dev.db") {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupPath = ".\prisma\dev.db.$timestamp.bak"
    Copy-Item -Path ".\prisma\dev.db" -Destination $backupPath
    Write-Host "Existing database backed up to $backupPath" -ForegroundColor Yellow
}

# Generate Prisma client
Write-Host "Generating Prisma client..." -ForegroundColor Cyan
try {
    npx prisma generate
    if ($LASTEXITCODE -ne 0) { throw "Failed to generate Prisma client" }
    Write-Host "Prisma client generated successfully" -ForegroundColor Green
} catch {
    Write-Host "Error generating Prisma client: $_" -ForegroundColor Red
    exit 1
}

# Create SQLite database and tables
Write-Host "Creating SQLite database and tables..." -ForegroundColor Cyan
try {
    npx prisma migrate dev --name init --create-only
    if ($LASTEXITCODE -ne 0) { throw "Failed to create database schema" }
    Write-Host "Database schema created successfully" -ForegroundColor Green
} catch {
    Write-Host "Error creating database schema: $_" -ForegroundColor Red
    exit 1
}

# Apply migrations
Write-Host "Applying migrations..." -ForegroundColor Cyan
try {
    npx prisma migrate deploy
    if ($LASTEXITCODE -ne 0) { throw "Failed to apply migrations" }
    Write-Host "Migrations applied successfully" -ForegroundColor Green
} catch {
    Write-Host "Error applying migrations: $_" -ForegroundColor Red
    exit 1
}

# Create a simple demo user with the Prisma Studio
Write-Host "Note: Database setup without sample data." -ForegroundColor Yellow
Write-Host "To create a demo user, please use these commands:" -ForegroundColor Cyan
Write-Host "  1. npm run db:studio" -ForegroundColor White
Write-Host "  2. Add a user with:" -ForegroundColor White
Write-Host "     - email: demo@example.com" -ForegroundColor White
Write-Host "     - name: Demo User" -ForegroundColor White
Write-Host "     - password: [bcrypt hash of 'password123']" -ForegroundColor White

Write-Host "SQLite database setup completed!" -ForegroundColor Green
Write-Host "You can now run 'npm run dev' to start the development server" -ForegroundColor Cyan 