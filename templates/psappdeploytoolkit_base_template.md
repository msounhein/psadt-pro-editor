<#
.SYNOPSIS
    This script performs the installation or uninstallation of an application.
.DESCRIPTION
    The script is provided as a template to perform an install or uninstall of an application.
    The script either performs an "Install" deployment type or an "Uninstall" deployment type.
.PARAMETER DeploymentType
    The type of deployment to perform. [Install|Uninstall]
.PARAMETER DeployMode
    Specifies whether the installation should be run in Interactive, Silent, or NonInteractive mode.
    Interactive = Default mode
    Silent = No dialogs
    NonInteractive = Very silent, i.e. no blocking apps. NonInteractive mode is automatically set if it is detected that the process is not user interactive.
.PARAMETER AllowRebootPassThru
    Allows the 3010 return code (requires restart) to be passed back to the parent process (e.g. SCCM) if detected from an installation.
    If 3010 is passed back to SCCM, a reboot prompt will be triggered.
.PARAMETER TerminalServerMode
    Changes to "user install mode" and back to "user execute mode" for installing/uninstalling applications for Remote Desktop Session Hosts/Citrix servers.
.PARAMETER DisableLogging
    Disables logging to file for the script.
.EXAMPLE
    Deploy-Application.ps1
.EXAMPLE
    Deploy-Application.ps1 -DeploymentType "Uninstall"
.EXAMPLE
    Deploy-Application.ps1 -DeploymentType "Install" -DeployMode "Silent"
.EXAMPLE
    Deploy-Application.ps1 -DeploymentType "Install" -DeployMode "Interactive"
.EXAMPLE
    Deploy-Application.ps1 -DeploymentType "Install" -DeployMode "NonInteractive"
.EXAMPLE
    Deploy-Application.ps1 -DeploymentType "Install" -DeployMode "Silent" -AllowRebootPassThru
.EXAMPLE
    Deploy-Application.ps1 -DeploymentType "Install" -DeployMode "Silent" -TerminalServerMode
.NOTES
    Toolkit Exit Code Ranges:
    60000 - 68999: Reserved for built-in exit codes in Deploy-Application.ps1, Deploy-Application.exe, and AppDeployToolkitMain.ps1
    69000 - 69999: Recommended for user customized exit codes in Deploy-Application.ps1
    70000 - 79999: Recommended for user customized exit codes in AppDeployToolkitExtensions.ps1
.LINK
    https://psappdeploytoolkit.com
#>

[CmdletBinding()]
Param (
    [Parameter(Mandatory = $false)]
    [ValidateSet('Install', 'Uninstall', 'Repair')]
    [String]$DeploymentType = 'Install',
    [Parameter(Mandatory = $false)]
    [ValidateSet('Interactive', 'Silent', 'NonInteractive')]
    [String]$DeployMode = 'Interactive',
    [Parameter(Mandatory = $false)]
    [switch]$AllowRebootPassThru = $false,
    [Parameter(Mandatory = $false)]
    [switch]$TerminalServerMode = $false,
    [Parameter(Mandatory = $false)]
    [switch]$DisableLogging = $false
)

Try {
    ## Import the appropriate version of the AppDeployToolkit.ps1 file (v3 or v4)
    
    ## For PSADT v3:
    ## Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
    . "$PSScriptRoot\AppDeployToolkit\AppDeployToolkitMain.ps1"
    
    ## For PSADT v4:
    ## Import-Module -Name PSAppDeployToolkit
    
    ## Handle parameters
    If ($deploymentType -ieq 'Uninstall') {
        $installPhase = 'Uninstallation'
    }
    Else {
        $installPhase = 'Installation'
    }

    ## Show Welcome Message, close processes if required, allow up to 3 deferrals, verify disk space
    Show-InstallationWelcome -CloseApps 'iexplore,firefox,chrome' -CheckDiskSpace -PersistPrompt

    ## Show Progress Message
    Show-InstallationProgress

    ## <Perform Installation tasks here>
    
    ## Display a message at the end of the install
    Show-InstallationPrompt -Message "Installation has completed successfully." -ButtonRightText "OK" -Icon Information
    
    ## Complete the installation
    Exit-Script -ExitCode 0
}
Catch {
    [int32]$mainExitCode = 60001
    Write-Log -Message "Installation failed with error: $($_.Exception.Message)" -Severity 3 -Source $deployAppScriptFriendlyName
    Show-DialogBox -Text "Installation failed with error: $($_.Exception.Message)" -Icon 'Stop'
    Exit-Script -ExitCode $mainExitCode
}
