# PSADT v3 to v4 Migration Reference

## Overview

This document provides a concise reference for the key differences between PSADT v3 and v4 that affect our syntax highlighting, linting, and code completion features.

## Command Naming Convention

- **v3**: Used natural PowerShell commands (e.g., `Set-RegistryKey`, `Execute-Process`)
- **v4**: Adds "ADT" prefix to all commands (e.g., `Set-ADTRegistryKey`, `Execute-ADTProcess`)

## Architecture Changes

- **v3**: Collection of dot-sourced scripts
- **v4**: PowerShell module with code signing and improved security

## Parameter Handling

- **v3**: Used custom parameters like `-ContinueOnError $true`
- **v4**: Uses standard PowerShell parameters like `-ErrorAction SilentlyContinue`

## Filtering Logic

- **v3**: Used separate parameters for filtering (e.g., `-FilterApplication`)
- **v4**: Uses single `-FilterScript` parameter with standard PowerShell syntax

## File Structure

- **v3**: Simple hierarchy with AppDeployToolkit folder
- **v4**: Module structure with PSAppDeployToolkit.psm1 and versioned resources

## Compatibility

- **v4**: Includes compatibility shims for v3 commands
- Both versions can coexist in the same environment

## Editor Integration Requirements

1. Must detect whether a script is using v3 or v4 commands
2. Provide appropriate syntax highlighting for detected version
3. Offer correct command completion based on version
4. Show command mapping information on hover
5. Apply version-specific linting rules

## Database Schema Requirements

1. Store commands for both v3 and v4
2. Map relationships between equivalent commands
3. Track parameters and their transformations
4. Support efficient querying for editor features
5. Allow version-specific documentation access

## Migration Path for Existing Scripts

The v4 compatibility layer allows running v3 scripts without modification. For highlighting and IntelliSense, our editor will:

1. Detect version based on command prefix patterns
2. Apply appropriate highlighting rules
3. Show command mappings when hovering over v3 commands
4. Suggest v4 alternatives when appropriate
