# Script to set up the template type field migration
param(
    [switch]$Execute
)

# Include common utility functions
. "$PSScriptRoot\common.ps1"

Write-Host "PSADT Pro UI - Template Type Field Migration" -ForegroundColor Cyan
Write-Host "------------------------------------------" -ForegroundColor Cyan

# Navigate to project root
$projectRoot = Set-ProjectRoot

# Step 1: Verify schema has been updated
$schemaPath = Join-Path $projectRoot "prisma\schema.prisma"
$schemaContent = Get-Content -Path $schemaPath -Raw

if (-not $schemaContent.Contains('type               String    @default("Custom")')) {
    Write-Host "Error: Schema does not contain the 'type' field." -ForegroundColor Red
    Write-Host "Please update the schema.prisma file to add the following to the Template model:" -ForegroundColor Yellow
    Write-Host "  type               String    @default(\"Custom\")   // \"Default\" or \"Custom\"" -ForegroundColor Gray
    exit 1
}

Write-Host "Schema contains the 'type' field. Proceeding with migration..." -ForegroundColor Green

# Step 2: Create migration
if ($Execute) {
    Write-Host "`nCreating and applying database migration..." -ForegroundColor Yellow
    
    try {
        # Kill any running Node processes that might lock the database
        Kill-NodeProcesses
        
        # Generate the migration
        Write-Host "Generating Prisma migration..." -ForegroundColor Yellow
        $migrationOutput = npx prisma migrate dev --name add_template_type --create-only
        Write-Host $migrationOutput -ForegroundColor Gray
        
        # Apply the migration
        Write-Host "Applying Prisma migration..." -ForegroundColor Yellow
        $migrateOutput = npx prisma migrate deploy
        Write-Host $migrateOutput -ForegroundColor Gray
        
        Write-Host "`nMigration applied successfully!" -ForegroundColor Green
        
        # Run the template type migration script
        Write-Host "`nUpdating existing templates with type information..." -ForegroundColor Yellow
        $migrateTypeOutput = node .\scripts\migrate-template-types.js
        Write-Host $migrateTypeOutput -ForegroundColor Gray
        
        Write-Host "`nDatabase migration completed successfully!" -ForegroundColor Green
        Write-Host "You can now use the 'type' field in your templates." -ForegroundColor Green
    } catch {
        Write-Host "Error during migration: $_" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "`nThis is a dry run. Use -Execute to apply the migration." -ForegroundColor Yellow
    Write-Host "When executed, this script will:" -ForegroundColor Yellow
    Write-Host "1. Create a Prisma migration to add the 'type' field to the Template model" -ForegroundColor Yellow
    Write-Host "2. Apply the migration to the database" -ForegroundColor Yellow
    Write-Host "3. Update existing templates with appropriate type values" -ForegroundColor Yellow
    
    Write-Host "`nTo execute the migration, run:" -ForegroundColor Cyan
    Write-Host ".\scripts\migrate-template-type-field.ps1 -Execute" -ForegroundColor Gray
}
