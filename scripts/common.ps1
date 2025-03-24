<#
.SYNOPSIS
    Common utility functions for PSADT Pro UI scripts.

.DESCRIPTION
    This module provides common functionality used by multiple scripts:
    - Project root navigation
    - Process management
    - Error handling
    - Common path resolution

.NOTES
    This should be dot-sourced at the beginning of each script.
    Example: . "$PSScriptRoot\common.ps1"
#>

function Set-ProjectRoot {
    <#
    .SYNOPSIS
        Navigates to the project root directory.

    .DESCRIPTION
        Uses the script location to determine and navigate to the project root directory.
        Returns the full path to the project root.

    .EXAMPLE
        $projectRoot = Set-ProjectRoot
    #>
    [CmdletBinding()]
    [OutputType([string])]
    param()

    $callerScriptPath = (Get-PSCallStack)[1].ScriptName
    $callerDirectory = Split-Path -Parent $callerScriptPath
    $projectRoot = (Get-Item $callerDirectory).Parent.FullName
    Set-Location -Path $projectRoot
    
    return $projectRoot
}

function Kill-NodeProcesses {
    <#
    .SYNOPSIS
        Kills all Node.js and npm processes.

    .DESCRIPTION
        Finds and terminates all running Node.js and npm processes.
        Handles regular termination and forced termination if needed.

    .EXAMPLE
        Kill-NodeProcesses
    #>
    [CmdletBinding()]
    param()
    
    # Get the list of processes
    $nodeProcesses = Get-Process -Name "node", "npm" -ErrorAction SilentlyContinue

    if ($nodeProcesses) {
        # Count processes being terminated
        $count = $nodeProcesses.Count
        Write-Host "Found $count Node.js/npm processes to terminate." -ForegroundColor Yellow
        
        # Kill the processes
        foreach ($process in $nodeProcesses) {
            $processName = $process.Name
            $processId = $process.Id
            
            try {
                Stop-Process -Id $processId -Force
                Write-Host "Terminated $processName process with PID $processId" -ForegroundColor Green
            } catch {
                Write-Host "Failed to terminate $processName process with PID $processId" -ForegroundColor Red
                Write-Host "Error: $_" -ForegroundColor Red
            }
        }
        
        # Check if any processes are still running
        Start-Sleep -Seconds 1
        $remainingProcesses = Get-Process -Name "node", "npm" -ErrorAction SilentlyContinue
        
        if ($remainingProcesses) {
            Write-Host "`nWARNING: Some processes are still running!" -ForegroundColor Yellow
            foreach ($process in $remainingProcesses) {
                Write-Host "Still running: $($process.Name) (PID: $($process.Id))" -ForegroundColor Yellow
            }
            
            Write-Host "`nAttempting to force kill remaining processes..." -ForegroundColor Yellow
            foreach ($process in $remainingProcesses) {
                $processName = $process.Name
                $processId = $process.Id
                
                try {
                    # More aggressive termination
                    taskkill /F /PID $processId /T
                    Write-Host "Force terminated $processName process with PID $processId" -ForegroundColor Green
                } catch {
                    Write-Host "Failed to force terminate $processName process with PID $processId" -ForegroundColor Red
                }
            }
        }
    } else {
        Write-Host "No Node.js or npm processes found." -ForegroundColor Green
    }

    Write-Host "`nProcess cleanup completed!" -ForegroundColor Green
    
    # Wait a moment to ensure all processes are fully terminated
    Write-Host "Waiting for processes to fully terminate..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
}

function Get-ProjectFile {
    <#
    .SYNOPSIS
        Gets the full path to a file in the project.

    .DESCRIPTION
        Takes a relative path and returns the full path within the project.
        Optionally checks if the file exists.

    .PARAMETER RelativePath
        The path to the file, relative to the project root.

    .PARAMETER CheckExists
        If specified, checks whether the file exists and returns null if it doesn't.

    .EXAMPLE
        $schemaPath = Get-ProjectFile "prisma\schema.prisma" -CheckExists
    #>
    [CmdletBinding()]
    [OutputType([string])]
    param(
        [Parameter(Mandatory=$true)]
        [string]$RelativePath,
        
        [Parameter()]
        [switch]$CheckExists
    )
    
    $projectRoot = Get-Location
    $fullPath = Join-Path -Path $projectRoot -ChildPath $RelativePath
    
    if ($CheckExists -and (-not (Test-Path -Path $fullPath))) {
        Write-Warning "File not found: $fullPath"
        return $null
    }
    
    return $fullPath
}

# Note: This is not a proper PowerShell module, so we don't use Export-ModuleMember
# The functions are available when this script is dot-sourced 