# PSADT v3 to v4 Migration Guide

## Overview

This document provides guidance for migrating scripts from PowerShell App Deployment Toolkit (PSADT) v3 to v4.

## Key Differences

### Command Naming Convention

- **v3**: Used natural PowerShell commands (e.g., `Set-RegistryKey`, `Execute-Process`)
- **v4**: Adds "ADT" prefix to all commands (e.g., `Set-ADTRegistryKey`, `Execute-ADTProcess`)

### Architecture Changes

- **v3**: Collection of dot-sourced scripts
- **v4**: PowerShell module with code signing and improved security

### Parameter Handling

- **v3**: Used custom parameters like `-ContinueOnError $true`
- **v4**: Uses standard PowerShell parameters like `-ErrorAction SilentlyContinue`

### File Structure

- **v3**: Simple hierarchy with AppDeployToolkit folder
- **v4**: Module structure with PSAppDeployToolkit.psm1 and versioned resources

## Command Mapping

| PSADT v3 Command | PSADT v4 Command |
|------------------|------------------|
| Set-RegistryKey | Set-ADTRegistryKey |
| Remove-RegistryKey | Remove-ADTRegistryKey |
| Show-InstallationWelcome | Show-ADTInstallationWelcome |
| Show-InstallationProgress | Show-ADTInstallationProgress |
| Execute-Process | Execute-ADTProcess |
| Write-Log | Write-ADTLog |
| Test-Battery | Test-ADTBattery |
| Test-ServiceExists | Test-ADTServiceExists |
| Test-Path | Test-ADTPath |

## Migration Steps

1. **Update Import Statement**:
   - v3: `. "$PSScriptRoot\AppDeployToolkit\AppDeployToolkitMain.ps1"`
   - v4: `Import-Module -Name PSAppDeployToolkit`

2. **Update Command Names**:
   - Replace all v3 commands with their v4 equivalents (add ADT prefix)
   - Example: `Show-InstallationWelcome` → `Show-ADTInstallationWelcome`

3. **Update Error Handling Parameters**:
   - Replace `-ContinueOnError $true` with `-ErrorAction SilentlyContinue`
   - Replace `-ContinueOnError $false` with `-ErrorAction Stop`

4. **Update Execution Context**:
   - v4 requires proper PowerShell module context
   - Use PowerShell 5.1 or later for best compatibility

## Compatibility Notes

- v4 includes compatibility shims for v3 commands
- Both versions can coexist in the same environment
- Scripts designed for v3 will generally work with v4 without modification

## Best Practices

1. **Use v4 Command Naming**:
   - Consistently use the ADT prefix for all toolkit commands
   - This makes it clear which functions are from PSADT

2. **Use Standard PowerShell Parameters**:
   - Follow PowerShell best practices for parameter naming
   - Use standard PowerShell error handling with `-ErrorAction`

3. **Test Thoroughly**:
   - Test all scripts after migration to ensure compatibility
   - Pay special attention to error handling and user interfaces

