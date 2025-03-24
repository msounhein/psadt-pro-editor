# Update-PsadtDocumentation.ps1
#
# This script updates the PSADT documentation database by running the parser.
# It handles both v3 and v4 documentation and provides options for resetting
# the database or forcing an update.

[CmdletBinding()]
param(
    [Parameter()]
    [switch]$ResetDatabase,
    
    [Parameter()]
    [switch]$ForceUpdate,
    
    [Parameter()]
    [ValidateSet(3, 4, "Both")]
    [string]$Version = "Both",
    
    [Parameter()]
    [string]$OutputPath = "$PSScriptRoot\..\data"
)

# Ensure required directories exist
$dataDir = Resolve-Path -Path $OutputPath -ErrorAction SilentlyContinue
if (-not $dataDir) {
    Write-Verbose "Creating data directory at $OutputPath"
    New-Item -Path $OutputPath -ItemType Directory -Force | Out-Null
    $dataDir = Resolve-Path -Path $OutputPath
}

# Check if nodejs is installed
$nodePath = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodePath) {
    Write-Error "Node.js is required to run this script. Please install Node.js and try again."
    exit 1
}

# Check if required packages are installed
$requiredPackages = @('node-fetch', 'cheerio', 'sqlite3')
$packageJsonPath = "$PSScriptRoot\..\package.json"
$missingPackages = @()

if (Test-Path $packageJsonPath) {
    $packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
    
    foreach ($pkg in $requiredPackages) {
        $found = $false
        
        if ($packageJson.dependencies -and $packageJson.dependencies.$pkg) {
            $found = $true
        }
        
        if (-not $found -and $packageJson.devDependencies -and $packageJson.devDependencies.$pkg) {
            $found = $true
        }
        
        if (-not $found) {
            $missingPackages += $pkg
        }
    }
}
else {
    $missingPackages = $requiredPackages
}

if ($missingPackages.Count -gt 0) {
    Write-Warning "Missing required npm packages: $($missingPackages -join ', ')"
    $installMissing = Read-Host "Do you want to install the missing packages? (Y/N)"
    
    if ($installMissing -eq "Y") {
        Push-Location (Split-Path $PSScriptRoot -Parent)
        foreach ($pkg in $missingPackages) {
            Write-Host "Installing $pkg..."
            npm install --save-dev $pkg
        }
        Pop-Location
    }
    else {
        Write-Error "Cannot continue without required packages."
        exit 1
    }
}

# Build command line arguments
$nodeArgs = @("$PSScriptRoot\psadt-docs-parser.js")

# Add reset flag if specified
if ($ResetDatabase) {
    $nodeArgs += "--reset"
}

# Add force flag if specified
if ($ForceUpdate) {
    $nodeArgs += "--force"
}

# Add version flag
switch ($Version) {
    "3" { $nodeArgs += "--v3" }
    "4" { $nodeArgs += "--v4" }
    "Both" { 
        $nodeArgs += "--v3"
        $nodeArgs += "--v4"
    }
}

# Run the parser
Write-Host "Running PSADT Documentation Parser with the following arguments: $($nodeArgs -join ' ')"
& node $nodeArgs

if ($LASTEXITCODE -ne 0) {
    Write-Error "PSADT Documentation Parser failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

# Display results
$reportPath = "$OutputPath\psadt-sync-report.md"
if (Test-Path $reportPath) {
    Write-Host "Documentation update complete. Results:"
    Get-Content $reportPath | Write-Host
}
else {
    Write-Host "Documentation update complete."
}

# Check if commands.json file was created
$commandsJsonPath = "$OutputPath\psadt-commands.json"
if (Test-Path $commandsJsonPath) {
    $jsonSize = (Get-Item $commandsJsonPath).Length
    $commandsCount = (Get-Content $commandsJsonPath -Raw | ConvertFrom-Json).commands.Count
    
    Write-Host "Generated commands.json file ($([math]::Round($jsonSize/1KB, 2)) KB) with $commandsCount commands."
    
    # Check if data directory is within the Next.js public directory
    $publicPath = "$PSScriptRoot\..\public\data"
    if (-not (Test-Path $publicPath)) {
        New-Item -Path $publicPath -ItemType Directory -Force | Out-Null
    }
    
    # Copy to public directory for static serving (optional)
    $publicFilePath = "$publicPath\psadt-commands.json"
    Copy-Item -Path $commandsJsonPath -Destination $publicFilePath -Force
    Write-Host "Copied commands.json to public directory for static serving."
}
else {
    Write-Warning "No commands.json file was generated. Check for errors."
}

# Create scheduled task option
$createTask = Read-Host "Do you want to create a scheduled task to update documentation daily? (Y/N)"
if ($createTask -eq "Y") {
    $taskName = "PSADT-Documentation-Update"
    $taskExists = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    
    if ($taskExists) {
        $overwrite = Read-Host "Task already exists. Overwrite? (Y/N)"
        if ($overwrite -ne "Y") {
            Write-Host "Skipping task creation."
            exit 0
        }
        
        # Remove existing task
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    }
    
    # Create scheduled task
    $scriptPath = $MyInvocation.MyCommand.Path
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`" -ForceUpdate"
    
    # Run daily at 3 AM
    $trigger = New-ScheduledTaskTrigger -Daily -At 3am
    
    # Run whether user is logged in or not
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
    
    # Create the task
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "Updates PSADT documentation daily"
    
    Write-Host "Scheduled task created successfully."
}

Write-Host "Operation completed successfully."
