#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Consolidated database management script for PSADT Pro UI.

.DESCRIPTION
    This script combines database management functions:
    - Setup: Initialize the SQLite database
    - Reset: Reset the database to a clean state
    - Studio: Launch Prisma Studio
    - Migrate: Run Prisma migrations
    - Generate: Generate Prisma client
    - Cleanup: Kill Node processes and reset database

.PARAMETER Action
    The action to perform:
    - setup: Setup a new SQLite database (default)
    - reset: Reset the database to a clean state
    - studio: Launch Prisma Studio
    - migrate: Run Prisma migrations
    - generate: Generate Prisma client
    - cleanup: Kill Node processes and reset database

.PARAMETER Usage
    If specified, displays common usage examples and exits.

.EXAMPLE
    PS C:\> .\scripts\db-manager.ps1
    
    Sets up a new SQLite database.

.EXAMPLE
    PS C:\> .\scripts\db-manager.ps1 -Action reset
    
    Resets the database to a clean state.

.EXAMPLE
    PS C:\> .\scripts\db-manager.ps1 -Action studio
    
    Launches Prisma Studio for database visualization.
#>

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("setup", "reset", "studio", "migrate", "generate", "cleanup")]
    [string]$Action = "setup",
    
    [Parameter(Mandatory=$false)]
    [switch]$Usage
)

# Import common functions
. "$PSScriptRoot\common.ps1"

# If -Usage parameter is specified, display common usage examples and exit
if ($Usage) {
    Write-Host "PSADT Pro UI Database Management Tool - Common Usage Examples" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Set up a new database:" -ForegroundColor Yellow
    Write-Host "  .\scripts\db-manager.ps1 -Action setup" -ForegroundColor White
    Write-Host ""
    Write-Host "Reset the database:" -ForegroundColor Yellow
    Write-Host "  .\scripts\db-manager.ps1 -Action reset" -ForegroundColor White
    Write-Host ""
    Write-Host "Launch Prisma Studio:" -ForegroundColor Yellow
    Write-Host "  .\scripts\db-manager.ps1 -Action studio" -ForegroundColor White
    Write-Host ""
    Write-Host "Run database migrations:" -ForegroundColor Yellow
    Write-Host "  .\scripts\db-manager.ps1 -Action migrate" -ForegroundColor White
    Write-Host ""
    Write-Host "Generate Prisma client:" -ForegroundColor Yellow
    Write-Host "  .\scripts\db-manager.ps1 -Action generate" -ForegroundColor White
    Write-Host ""
    Write-Host "Cleanup database (kill Node.js processes and reset database):" -ForegroundColor Yellow
    Write-Host "  .\scripts\db-manager.ps1 -Action cleanup" -ForegroundColor White
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
Write-InfoMessage "  PSADT Pro UI Database Management Tool"
Write-InfoMessage "========================================================"
Write-InfoMessage "Action: $Action"
Write-InfoMessage "Started at: $(Get-Date)"
Write-InfoMessage "========================================================`n"

# Setup a new SQLite database
function Setup-Database {
    Write-InfoMessage "Setting up a new SQLite database..."
    
    # Check if prisma directory exists
    if (-not (Test-Path -Path 'prisma')) {
        Write-ErrorMessage "Prisma directory not found. Please ensure you're in the project root."
        return
    }
    
    # Check if schema.prisma exists
    if (-not (Test-Path -Path 'prisma\schema.prisma')) {
        Write-ErrorMessage "Prisma schema file not found. Cannot set up database."
        return
    }
    
    # Check if .env file exists
    if (-not (Test-Path -Path '.env')) {
        Write-WarningMessage ".env file not found. Creating basic .env file..."
        @"
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
"@ | Out-File -FilePath '.env' -Encoding utf8
        Write-SuccessMessage "Basic .env file created."
    }
    
    # Run Prisma migrations
    try {
        Write-InfoMessage "Running Prisma migrations..."
        npx prisma migrate dev --name init
        Write-SuccessMessage "Database migrations completed."
    } catch {
        Write-ErrorMessage "Failed to run migrations: $($_.Exception.Message)"
        return
    }
    
    # Generate Prisma client
    try {
        Write-InfoMessage "Generating Prisma client..."
        npx prisma generate
        Write-SuccessMessage "Prisma client generated."
    } catch {
        Write-ErrorMessage "Failed to generate Prisma client: $($_.Exception.Message)"
        return
    }
    
    # Check if seed script exists and run it
    if (Test-Path -Path 'prisma\seed.ts' -or Test-Path -Path 'prisma\seed.js') {
        try {
            Write-InfoMessage "Running database seed script..."
            npx prisma db seed
            Write-SuccessMessage "Database seeded successfully."
        } catch {
            Write-WarningMessage "Failed to seed database: $($_.Exception.Message)"
        }
    } else {
        Write-InfoMessage "No seed script found. Skipping database seeding."
    }
    
    Write-SuccessMessage "Database setup completed successfully."
}

# Reset the database
function Reset-Database {
    Write-InfoMessage "Resetting database to a clean state..."
    
    # Kill any Node.js processes that might be locking the database
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        Write-InfoMessage "Stopping Node.js processes to prevent file locks..."
        $nodeProcesses | ForEach-Object {
            try {
                Stop-Process -Id $_.Id -Force
            } catch {
                Write-WarningMessage "Failed to stop process $($_.Id): $($_.Exception.Message)"
            }
        }
    }
    
    # Reset the database
    try {
        Write-InfoMessage "Resetting Prisma database..."
        npx prisma migrate reset --force
        Write-SuccessMessage "Database reset successfully."
    } catch {
        Write-ErrorMessage "Failed to reset database: $($_.Exception.Message)"
        return
    }
    
    # Generate Prisma client
    try {
        Write-InfoMessage "Regenerating Prisma client..."
        npx prisma generate
        Write-SuccessMessage "Prisma client regenerated."
    } catch {
        Write-ErrorMessage "Failed to regenerate Prisma client: $($_.Exception.Message)"
        return
    }
    
    Write-SuccessMessage "Database reset completed successfully."
}

# Launch Prisma Studio
function Launch-PrismaStudio {
    Write-InfoMessage "Launching Prisma Studio..."
    
    try {
        # Kill any existing Node processes to prevent conflicts
        $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
        if ($nodeProcesses) {
            Write-InfoMessage "Stopping any running Node processes to avoid conflicts..."
            $nodeProcesses | ForEach-Object {
                try {
                    Stop-Process -Id $_.Id -Force
                    Write-InfoMessage "Stopped process: $($_.Name) (PID: $($_.Id))."
                } catch {
                    Write-WarningMessage "Failed to stop process $($_.Id): $($_.Exception.Message)"
                }
            }
        }
        
        # Launch Prisma Studio
        Write-InfoMessage "Starting Prisma Studio..."
        Start-Process -FilePath "npx" -ArgumentList "prisma studio" -NoNewWindow
        
        # Wait for Prisma Studio to start
        Start-Sleep -Seconds 2
        
        # Open browser
        Start-Process "http://localhost:5555"
        
        Write-SuccessMessage "Prisma Studio launched successfully."
        Write-InfoMessage "Press Ctrl+C to exit and stop Prisma Studio."
        
        # Wait for user to press Ctrl+C
        Write-InfoMessage "Prisma Studio is running. Press Ctrl+C to stop..."
        
        # Keep running until user presses Ctrl+C
        Wait-Event -Timeout ([int]::MaxValue)
        
    } catch {
        Write-ErrorMessage "An error occurred: $($_.Exception.Message)"
    } finally {
        # Always try to clean up Node processes when exiting
        Write-InfoMessage "Stopping Prisma Studio..."
        $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
        if ($nodeProcesses) {
            $nodeProcesses | ForEach-Object {
                try {
                    Stop-Process -Id $_.Id -Force
                } catch {
                    # Ignore errors on cleanup
                }
            }
        }
        Write-InfoMessage "Prisma Studio stopped."
    }
}

# Run Prisma migrations
function Run-PrismaMigrations {
    Write-InfoMessage "Running Prisma migrations..."
    
    try {
        npx prisma migrate dev
        Write-SuccessMessage "Prisma migrations completed successfully."
    } catch {
        Write-ErrorMessage "Failed to run Prisma migrations: $($_.Exception.Message)"
    }
}

# Generate Prisma client
function Generate-PrismaClient {
    Write-InfoMessage "Generating Prisma client..."
    
    try {
        npx prisma generate
        Write-SuccessMessage "Prisma client generated successfully."
    } catch {
        Write-ErrorMessage "Failed to generate Prisma client: $($_.Exception.Message)"
    }
}

# Cleanup database (Kill Node processes and reset)
function Cleanup-Database {
    Write-InfoMessage "Cleaning up database and Node.js processes..."
    
    # Kill Node.js processes
    $nodeProcesses = Get-Process -Name "node", "npm", "npx" -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        Write-InfoMessage "Stopping Node.js processes..."
        $nodeProcesses | ForEach-Object {
            try {
                Write-InfoMessage "Stopping process: $($_.Name) (ID: $($_.Id))"
                Stop-Process -Id $_.Id -Force
            } catch {
                Write-WarningMessage "Failed to stop process $($_.Id): $($_.Exception.Message)"
            }
        }
        Write-SuccessMessage "All Node.js processes have been stopped."
    } else {
        Write-InfoMessage "No Node.js processes found."
    }
    
    # Remove database lock files if they exist
    $lockFiles = @(
        'prisma\dev.db-journal',
        'prisma\.tmp'
    )
    
    foreach ($lockFile in $lockFiles) {
        if (Test-Path -Path $lockFile) {
            try {
                Remove-Item -Path $lockFile -Force
                Write-InfoMessage "Removed lock file: $lockFile"
            } catch {
                Write-WarningMessage "Failed to remove lock file $($lockFile): $($_.Exception.Message)"
            }
        }
    }
    
    # Reset the database
    Reset-Database
}

# Main execution based on Action parameter
switch ($Action) {
    "setup" {
        Setup-Database
    }
    "reset" {
        Reset-Database
    }
    "studio" {
        Launch-PrismaStudio
    }
    "migrate" {
        Run-PrismaMigrations
    }
    "generate" {
        Generate-PrismaClient
    }
    "cleanup" {
        Cleanup-Database
    }
}

# Display footer
Write-InfoMessage "`n========================================================"
Write-InfoMessage "Completed at: $(Get-Date)"
Write-InfoMessage "========================================================`n" 