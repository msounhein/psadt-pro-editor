<#
.SYNOPSIS
    Performs diagnostics on the PSADT Pro UI installation.

.DESCRIPTION
    This script checks for common issues in the PSADT Pro UI installation:
    1. Verifies required directories exist
    2. Checks database configuration
    3. Validates environment settings
    4. Identifies common error conditions
    5. Suggests fixes for identified problems

.EXAMPLE
    PS C:\> .\scripts\diagnose.ps1

    Runs diagnostics and provides recommendations for any issues found.
#>

# Import common functions
. "$PSScriptRoot\common.ps1"

# Navigate to project root
$projectRoot = Set-ProjectRoot

# Set error action preference
$ErrorActionPreference = "SilentlyContinue"

Write-Host "PSADT Pro UI Diagnostics" -ForegroundColor Cyan
Write-Host "-------------------------" -ForegroundColor Cyan

#region Functions
function Test-PathWritable {
    param(
        [string]$Path
    )
    
    try {
        $testFile = Join-Path -Path $Path -ChildPath "write_test_$([Guid]::NewGuid().ToString()).tmp"
        [IO.File]::WriteAllText($testFile, "Test")
        Remove-Item -Path $testFile -Force
        return $true
    }
    catch {
        return $false
    }
}

function Write-Status {
    param(
        [string]$Message,
        [string]$Status,
        [string]$Color = "Green"
    )
    
    Write-Host $Message -NoNewline
    Write-Host " [$Status]" -ForegroundColor $Color
}
#endregion

#region System Environment Checks
Write-Host "`n[1/5] Checking System Environment..." -ForegroundColor Yellow

# Check Node.js version
$nodeVersion = & node -v 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Status "Node.js installation" "NOT FOUND" "Red"
    Write-Host "   - You need to install Node.js v18 or higher" -ForegroundColor Red
} else {
    $versionStr = $nodeVersion.ToString().Trim('v')
    $majorVersion = [int]($versionStr.Split('.')[0])
    if ($majorVersion -ge 18) {
        Write-Status "Node.js version ($versionStr)" "OK" "Green"
    } else {
        Write-Status "Node.js version ($versionStr)" "OUTDATED" "Yellow"
        Write-Host "   - Recommended: Upgrade to Node.js v18 or higher" -ForegroundColor Yellow
    }
}

# Check npm version
$npmVersion = & npm -v 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Status "npm installation" "NOT FOUND" "Red"
} else {
    Write-Status "npm version ($npmVersion)" "OK" "Green"
}

# Check NPX availability
$npxVersion = & npx -v 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Status "npx availability" "NOT FOUND" "Red"
} else {
    Write-Status "npx availability" "OK" "Green"
}

# Check Prisma CLI
$prismaVersion = & npx prisma -v 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Status "Prisma CLI" "NOT FOUND" "Red"
    Write-Host "   - Run 'npm install' to install Prisma" -ForegroundColor Red
} else {
    Write-Status "Prisma CLI" "OK" "Green"
}
#endregion

#region Directory Structure Checks
Write-Host "`n[2/5] Checking Directory Structure..." -ForegroundColor Yellow

# Required directories
$requiredDirs = @(
    "node_modules",
    "prisma",
    "src",
    "scripts",
    "storage",
    "templates",
    "psadt",
    "uploads"
)

foreach ($dir in $requiredDirs) {
    if (Test-Path -Path $dir -PathType Container) {
        $isWritable = Test-PathWritable -Path $dir
        if ($isWritable) {
            Write-Status "$dir directory" "OK" "Green"
        } else {
            Write-Status "$dir directory" "PERMISSION ISSUE" "Red"
            Write-Host "   - You don't have write permissions to $dir" -ForegroundColor Red
        }
    } else {
        Write-Status "$dir directory" "MISSING" "Red"
        Write-Host "   - Run 'npm run setup' to create required directories" -ForegroundColor Red
    }
}

# Check for .next directory
if (Test-Path -Path ".next" -PathType Container) {
    Write-Status ".next directory" "EXISTS" "Green"
    
    # Check for the problematic fallback symbolic link
    $fallbackPath = ".next/static/chunks/fallback"
    if (Test-Path -Path $fallbackPath) {
        try {
            $item = Get-Item -Path $fallbackPath -ErrorAction Stop
            if ($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) {
                Write-Status "Fallback symbolic link" "ISSUE DETECTED" "Red"
                Write-Host "   - Run 'npm run fix:webpack' to fix this issue" -ForegroundColor Red
            }
        } catch {
            Write-Status "Fallback symbolic link" "ISSUE DETECTED" "Red"
            Write-Host "   - Run 'npm run fix:webpack' to fix this issue" -ForegroundColor Red
        }
    }
    
    # Check for webpack cache issues
    $webpackCachePath = ".next/cache/webpack"
    if (Test-Path -Path $webpackCachePath) {
        $packFiles = Get-ChildItem -Path $webpackCachePath -Recurse -Filter "*.pack.gz_" -ErrorAction SilentlyContinue
        if ($packFiles) {
            Write-Status "Webpack cache" "ISSUE DETECTED" "Red"
            Write-Host "   - Incomplete webpack cache files found" -ForegroundColor Red
            Write-Host "   - Run 'npm run fix:webpack' to fix this issue" -ForegroundColor Red
        } else {
            Write-Status "Webpack cache" "OK" "Green"
        }
    }
} else {
    Write-Status ".next directory" "NOT BUILT" "Yellow"
    Write-Host "   - This is normal if you haven't started the app yet" -ForegroundColor Yellow
}
#endregion

#region Configuration Checks
Write-Host "`n[3/5] Checking Configuration Files..." -ForegroundColor Yellow

# Check .env file
if (Test-Path -Path ".env") {
    Write-Status ".env file" "EXISTS" "Green"
    
    # Read .env file
    $envContent = Get-Content -Path ".env" -Raw
    
    # Check for DATABASE_URL
    if ($envContent -match "DATABASE_URL") {
        if ($envContent -match 'DATABASE_URL="file:./dev.db"') {
            Write-Status "Database configuration" "SQLITE (Local)" "Green"
        } elseif ($envContent -match 'DATABASE_URL="postgresql') {
            Write-Status "Database configuration" "POSTGRESQL" "Green"
        } else {
            Write-Status "Database configuration" "UNKNOWN" "Yellow"
        }
    } else {
        Write-Status "Database configuration" "MISSING" "Red"
        Write-Host "   - Your .env file is missing DATABASE_URL" -ForegroundColor Red
    }
    
    # Check for NEXTAUTH_SECRET
    if ($envContent -match "NEXTAUTH_SECRET") {
        if ($envContent -match 'NEXTAUTH_SECRET="your-secure-nextauth-secret-key"') {
            Write-Status "NextAuth secret" "DEFAULT (UNSAFE)" "Yellow"
            Write-Host "   - You're using the default NextAuth secret, consider changing it" -ForegroundColor Yellow
        } else {
            Write-Status "NextAuth secret" "CONFIGURED" "Green"
        }
    } else {
        Write-Status "NextAuth secret" "MISSING" "Red"
        Write-Host "   - Your .env file is missing NEXTAUTH_SECRET" -ForegroundColor Red
    }
} else {
    Write-Status ".env file" "MISSING" "Red"
    Write-Host "   - Copy .env.example to .env or run 'npm run setup'" -ForegroundColor Red
}

# Check package.json
if (Test-Path -Path "package.json") {
    Write-Status "package.json" "EXISTS" "Green"
    
    # Check if dependencies are installed
    $missingDeps = @()
    $packageJson = Get-Content -Path "package.json" -Raw | ConvertFrom-Json
    
    foreach ($dep in $packageJson.dependencies.PSObject.Properties.Name) {
        $depPath = Join-Path -Path "node_modules" -ChildPath $dep
        if (-not (Test-Path -Path $depPath)) {
            $missingDeps += $dep
        }
    }
    
    if ($missingDeps.Count -gt 0) {
        Write-Status "Dependencies" "MISSING SOME" "Yellow"
        Write-Host "   - Run 'npm install' to install missing dependencies" -ForegroundColor Yellow
    } else {
        Write-Status "Dependencies" "INSTALLED" "Green"
    }
} else {
    Write-Status "package.json" "MISSING" "Red"
    Write-Host "   - Your project is missing package.json" -ForegroundColor Red
}

# Check prisma schema
if (Test-Path -Path "prisma/schema.prisma") {
    Write-Status "Prisma schema" "EXISTS" "Green"
    
    # Check for provider
    $prismaSchema = Get-Content -Path "prisma/schema.prisma" -Raw
    if ($prismaSchema -match 'provider = "sqlite"') {
        Write-Status "Prisma provider" "SQLITE" "Green"
    } elseif ($prismaSchema -match 'provider = "postgresql"') {
        Write-Status "Prisma provider" "POSTGRESQL" "Green"
    } else {
        Write-Status "Prisma provider" "UNKNOWN" "Yellow"
    }
} else {
    Write-Status "Prisma schema" "MISSING" "Red"
    Write-Host "   - Your project is missing prisma/schema.prisma" -ForegroundColor Red
}
#endregion

#region Database Checks
Write-Host "`n[4/5] Checking Database..." -ForegroundColor Yellow

# Check SQLite database
if (Test-Path -Path "prisma/dev.db") {
    Write-Status "SQLite database" "EXISTS" "Green"
    
    # Check if database is readable
    try {
        $conn = New-Object System.Data.SQLite.SQLiteConnection("Data Source=prisma/dev.db")
        $conn.Open()
        $conn.Close()
        Write-Status "Database connection" "OK" "Green"
    } catch {
        Write-Status "Database connection" "FAILED" "Red"
        Write-Host "   - Could not connect to the database" -ForegroundColor Red
        Write-Host "   - Run 'npm run db:sqlite' to reset the database" -ForegroundColor Red
    }
} else {
    # Check if using PostgreSQL instead
    $envContent = Get-Content -Path ".env" -Raw -ErrorAction SilentlyContinue
    if ($envContent -match 'DATABASE_URL="postgresql') {
        Write-Status "Database" "POSTGRESQL (REMOTE)" "Yellow"
        Write-Host "   - Using a PostgreSQL database, skipping local checks" -ForegroundColor Yellow
    } else {
        Write-Status "SQLite database" "MISSING" "Red"
        Write-Host "   - Run 'npm run db:sqlite' to create the database" -ForegroundColor Red
    }
}

# Check for the demo user script
if (Test-Path -Path "create-demo-user.js") {
    Write-Status "Demo user script" "EXISTS" "Green"
} else {
    Write-Status "Demo user script" "MISSING" "Yellow"
    Write-Host "   - Run 'npm run setup' to create the demo user script" -ForegroundColor Yellow
}
#endregion

#region Common Error Patterns
Write-Host "`n[5/5] Checking for Common Errors..." -ForegroundColor Yellow

# Check for log files with errors
$errorLogs = @()
$logFiles = Get-ChildItem -Path . -Include "*.log", "npm-debug.log*" -Recurse -File

foreach ($log in $logFiles) {
    $content = Get-Content -Path $log.FullName -Raw
    
    # Look for common error patterns
    if ($content -match "ENOENT|EPERM|EACCES|Error:|TypeError|Failed to|ReferenceError") {
        $errorLogs += $log.FullName
    }
}

if ($errorLogs.Count -gt 0) {
    Write-Status "Error logs" "FOUND" "Yellow"
    foreach ($log in $errorLogs) {
        Write-Host "   - Error log found: $log" -ForegroundColor Yellow
    }
} else {
    Write-Status "Error logs" "NONE FOUND" "Green"
}

# Check for Next.js specific issues
if (Test-Path -Path ".next") {
    # Check for webpack caching errors
    $webpackErrorFile = ".next/error.log"
    if (Test-Path -Path $webpackErrorFile) {
        $webpackError = Get-Content -Path $webpackErrorFile -Raw
        if ($webpackError -match "ENOENT|webpack\.cache|Caching failed") {
            Write-Status "Webpack cache errors" "DETECTED" "Red"
            Write-Host "   - Run 'npm run fix:webpack' to fix this issue" -ForegroundColor Red
        }
    }
}
#endregion

#region Recommendations
Write-Host "`nRecommendations:" -ForegroundColor Cyan
Write-Host "----------------" -ForegroundColor Cyan

# Check if the database is missing
if (-not (Test-Path -Path "prisma/dev.db")) {
    Write-Host "1. Setup the database:" -ForegroundColor Yellow
    Write-Host "   npm run db:sqlite" -ForegroundColor White
}

# Check for missing node_modules
if (-not (Test-Path -Path "node_modules")) {
    Write-Host "2. Install dependencies:" -ForegroundColor Yellow
    Write-Host "   npm install" -ForegroundColor White
}

# Check for webpack cache issues
$fallbackPath = ".next/static/chunks/fallback"
if (Test-Path -Path $fallbackPath) {
    try {
        $item = Get-Item -Path $fallbackPath -ErrorAction Stop
        if ($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) {
            Write-Host "3. Fix webpack cache issues:" -ForegroundColor Yellow
            Write-Host "   npm run fix:webpack" -ForegroundColor White
        }
    } catch {}
}

Write-Host "`nFor a complete reset and rebuild:" -ForegroundColor Cyan
Write-Host "npm run rebuild" -ForegroundColor White

Write-Host "`nTo start the development server:" -ForegroundColor Cyan
Write-Host "npm run dev" -ForegroundColor White
#endregion 