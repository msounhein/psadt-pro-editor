# PSADT v3 Command Reference

## Overview

This documentation covers the key commands available in the PowerShell App Deployment Toolkit (PSADT) version 3.

---

## Set-RegistryKey

Sets a registry key value or creates a new registry key.

### Syntax
```powershell
Set-RegistryKey [-Key] <String> [[-Name] <String>] [[-Value] <Object>] [-Type <String>] [-SID <String>] [-ContinueOnError <Boolean>]
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

**-ContinueOnError** <Boolean>

Continue if an error is encountered. Default is: $true.

### Examples

```powershell
Set-RegistryKey -Key 'HKEY_LOCAL_MACHINE\SOFTWARE\MyCompany\MyApplication' -Name 'Version' -Value '1.0.0' -Type 'String'
```

---

## Remove-RegistryKey

Removes a registry key or value.

### Syntax
```powershell
Remove-RegistryKey [-Key] <String> [[-Name] <String>] [-SID <String>] [-ContinueOnError <Boolean>]
```

### Parameters

**-Key** <String> (Required)

The registry key path.

**-Name** <String>

The value name.

**-SID** <String>

The security identifier (SID) for a user.

**-ContinueOnError** <Boolean>

Continue if an error is encountered. Default is: $true.

### Examples

```powershell
Remove-RegistryKey -Key 'HKEY_LOCAL_MACHINE\SOFTWARE\MyCompany\MyApplication'
```

---

## Show-InstallationWelcome

Displays a welcome dialog for the installation.

### Syntax
```powershell
Show-InstallationWelcome [-CloseApps <String[]>] [-CloseAppsCountdown <Int32>] [-AllowDefer <Boolean>] [-DeferTimes <Int32>] [-CheckDiskSpace <Boolean>] [-PersistPrompt <Boolean>] [-MinimizeWindows <Boolean>] [-ContinueOnError <Boolean>]
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

**-ContinueOnError** <Boolean>

Continue if an error is encountered. Default is: $true.

### Examples

```powershell
Show-InstallationWelcome -CloseApps 'iexplore,firefox,chrome' -CloseAppsCountdown 60 -AllowDefer -DeferTimes 3 -CheckDiskSpace
```

---

## Execute-Process

Executes a process with appropriate error handling and logging.

### Syntax
```powershell
Execute-Process [-Path] <String> [[-Parameters] <String>] [-WindowStyle <String>] [-CreateNoWindow <Boolean>] [-WorkingDirectory <String>] [-NoWait <Boolean>] [-PassThru <Boolean>] [-IgnoreExitCodes <String[]>] [-ContinueOnError <Boolean>]
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

**-ContinueOnError** <Boolean>

Continue if an error is encountered. Default is: $true.

### Examples

```powershell
Execute-Process -Path 'setup.exe' -Parameters '/S' -WindowStyle 'Hidden'
```

---

## Write-Log

Writes a message to the log file and console.

### Syntax
```powershell
Write-Log [-Message] <String> [-Severity <Int32>] [-Source <String>] [-LogFile <String>] [-ContinueOnError <Boolean>]
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

**-ContinueOnError** <Boolean>

Continue if an error is encountered. Default is: $true.

### Examples

```powershell
Write-Log -Message 'Installation started' -Severity 1 -Source 'Install-Application'
```

