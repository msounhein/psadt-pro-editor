# PSADT v4 Command Reference

## Overview

This documentation covers the key commands available in the PowerShell App Deployment Toolkit (PSADT) version 4.

---

## Set-ADTRegistryKey

Sets a registry key value or creates a new registry key.

### Syntax
```powershell
Set-ADTRegistryKey [-Key] <String> [[-Name] <String>] [[-Value] <Object>] [-Type <String>] [-SID <String>] [-ErrorAction <ActionPreference>]
```

### Parameters

**-Key** <String> (Required)

The registry key path.

**-Name** <String>

The value name.

**-Value** <Object>

The value data.

**-Type** <String>

The type of registry value to create or set. Options: 'Binary','DWord','ExpandString','MultiString','None','QWord','String','Unknown'.

**-SID** <String>

The security identifier (SID) for a user.

**-ErrorAction** <ActionPreference>

Specifies how the cmdlet responds when an error occurs. Options: 'SilentlyContinue','Stop','Continue','Inquire','Ignore','Suspend'.

### Examples

```powershell
Set-ADTRegistryKey -Key 'HKEY_LOCAL_MACHINE\SOFTWARE\MyCompany\MyApplication' -Name 'Version' -Value '1.0.0' -Type 'String'
```

---

## Remove-ADTRegistryKey

Removes a registry key or value.

### Syntax
```powershell
Remove-ADTRegistryKey [-Key] <String> [[-Name] <String>] [-SID <String>] [-ErrorAction <ActionPreference>]
```

### Parameters

**-Key** <String> (Required)

The registry key path.

**-Name** <String>

The value name.

**-SID** <String>

The security identifier (SID) for a user.

**-ErrorAction** <ActionPreference>

Specifies how the cmdlet responds when an error occurs. Options: 'SilentlyContinue','Stop','Continue','Inquire','Ignore','Suspend'.

### Examples

```powershell
Remove-ADTRegistryKey -Key 'HKEY_LOCAL_MACHINE\SOFTWARE\MyCompany\MyApplication'
```

---

## Show-ADTInstallationWelcome

Displays a welcome dialog for the installation.

### Syntax
```powershell
Show-ADTInstallationWelcome [-CloseApps <String[]>] [-CloseAppsCountdown <Int32>] [-AllowDefer <Boolean>] [-DeferTimes <Int32>] [-CheckDiskSpace <Boolean>] [-PersistPrompt <Boolean>] [-MinimizeWindows <Boolean>] [-ErrorAction <ActionPreference>]
```

### Parameters

**-CloseApps** <String[]>

List of application names to check for and close.

**-CloseAppsCountdown** <Int32>

Countdown time in seconds before applications are automatically closed.

**-AllowDefer** <Boolean>

Allows the user to defer the installation.

**-DeferTimes** <Int32>

Number of times the user can defer the installation.

**-CheckDiskSpace** <Boolean>

Checks for available disk space before installation.

**-PersistPrompt** <Boolean>

Keep the prompt visible even after execution.

**-MinimizeWindows** <Boolean>

Minimizes all windows before displaying the prompt.

**-ErrorAction** <ActionPreference>

Specifies how the cmdlet responds when an error occurs. Options: 'SilentlyContinue','Stop','Continue','Inquire','Ignore','Suspend'.

### Examples

```powershell
Show-ADTInstallationWelcome -CloseApps 'iexplore,firefox,chrome' -CloseAppsCountdown 60 -AllowDefer -DeferTimes 3 -CheckDiskSpace
```

---

## Execute-ADTProcess

Executes a process with appropriate error handling and logging.

### Syntax
```powershell
Execute-ADTProcess [-Path] <String> [[-Parameters] <String>] [-WindowStyle <String>] [-CreateNoWindow <Boolean>] [-WorkingDirectory <String>] [-NoWait <Boolean>] [-PassThru <Boolean>] [-IgnoreExitCodes <String[]>] [-ErrorAction <ActionPreference>]
```

### Parameters

**-Path** <String> (Required)

Path to the executable.

**-Parameters** <String>

Arguments to pass to the executable.

**-WindowStyle** <String>

Window style for the process. Options: 'Normal','Hidden','Minimized','Maximized'.

**-CreateNoWindow** <Boolean>

Creates the process with no window.

**-WorkingDirectory** <String>

Working directory for the process.

**-NoWait** <Boolean>

Does not wait for the process to complete.

**-PassThru** <Boolean>

Returns the process object.

**-IgnoreExitCodes** <String[]>

List of exit codes to ignore.

**-ErrorAction** <ActionPreference>

Specifies how the cmdlet responds when an error occurs. Options: 'SilentlyContinue','Stop','Continue','Inquire','Ignore','Suspend'.

### Examples

```powershell
Execute-ADTProcess -Path 'setup.exe' -Parameters '/S' -WindowStyle 'Hidden'
```

---

## Write-ADTLog

Writes a message to the log file and console.

### Syntax
```powershell
Write-ADTLog [-Message] <String> [-Severity <Int32>] [-Source <String>] [-LogFile <String>] [-ErrorAction <ActionPreference>]
```

### Parameters

**-Message** <String> (Required)

The message to log.

**-Severity** <Int32>

The severity of the message (1: Information, 2: Warning, 3: Error).

**-Source** <String>

The source of the message.

**-LogFile** <String>

The path to the log file.

**-ErrorAction** <ActionPreference>

Specifies how the cmdlet responds when an error occurs. Options: 'SilentlyContinue','Stop','Continue','Inquire','Ignore','Suspend'.

### Examples

```powershell
Write-ADTLog -Message 'Installation started' -Severity 1 -Source 'Install-Application'
```

