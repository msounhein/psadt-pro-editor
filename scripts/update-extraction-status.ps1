# Script to manually update the extraction status for a template
param(
    [Parameter(Mandatory=$true)]
    [string]$templateId,
    
    [Parameter(Mandatory=$true)]
    [string]$userId,
    
    [Parameter(Mandatory=$true)]
    [string]$templateName,
    
    [Parameter(Mandatory=$true)]
    [string]$version,
    
    [string]$status = "complete",
    
    [string]$apiUrl = "http://localhost:3000/api/extraction-status"
)

Write-Host "Updating extraction status for template: $templateId" -ForegroundColor Green
Write-Host "UserID: $userId" -ForegroundColor Cyan
Write-Host "Template Name: $templateName" -ForegroundColor Cyan
Write-Host "Version: $version" -ForegroundColor Cyan
Write-Host "Status: $status" -ForegroundColor Cyan
Write-Host "API URL: $apiUrl" -ForegroundColor Cyan

# Full extraction path
$extractionPath = "$userId/Default/${templateName}_v$version"

# Create the request body
$body = @{
    id = $templateId
    status = $status
    extractionPath = $extractionPath
} | ConvertTo-Json

Write-Host "Request body: $body" -ForegroundColor Gray
Write-Host "Sending status update to: $apiUrl" -ForegroundColor Yellow

try {
    $result = Invoke-RestMethod -Uri $apiUrl -Method Post -Body $body -ContentType "application/json" -UseBasicParsing
    Write-Host "Status update successful!" -ForegroundColor Green
    Write-Host "Response: $($result | ConvertTo-Json -Depth 5)" -ForegroundColor Cyan
} catch {
    Write-Host "Error updating extraction status: $_" -ForegroundColor Red
    Write-Host "Status code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    try {
        $errorContent = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorContent)
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error details: $errorBody" -ForegroundColor Red
    } catch {
        Write-Host "Could not read error details: $_" -ForegroundColor Red
    }
} 