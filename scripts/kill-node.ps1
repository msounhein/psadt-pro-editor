<#
.SYNOPSIS
    Kills all Node.js and npm processes.

.DESCRIPTION
    This script forcibly terminates all running Node.js and npm processes
    to help resolve issues with stuck or conflicting processes during 
    development.

.EXAMPLE
    PS C:\> .\scripts\kill-node.ps1

    Terminates all Node.js and npm processes.
#>

Write-Host "Killing all Node.js and npm processes..." -ForegroundColor Cyan
Write-Host "--------------------------------" -ForegroundColor Cyan

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

Write-Host "`nProcess cleanup completed!" -ForegroundColor Cyan 