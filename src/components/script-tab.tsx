"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { FileDown, Play, Loader2, Copy, Check } from "lucide-react"
import { Card } from "@/components/ui/card"

export function ScriptTab() {
  const [scriptContent, setScriptContent] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  // Mock function to generate script (will be replaced with API call)
  const generateScript = async () => {
    setIsGenerating(true)
    
    // Simulate API call
    setTimeout(() => {
      const generatedScript = `<#
.SYNOPSIS
    This script performs the installation or uninstallation of Sample Application.
.DESCRIPTION
    The script is provided as a template to perform an install or uninstall of an application.
    The script either performs an "Install" deployment type or an "Uninstall" deployment type.
.PARAMETER DeploymentType
    The type of deployment to perform. Default is: Install
.PARAMETER DeployMode
    Specifies whether the installation should be run in Interactive, Silent, or NonInteractive mode.
    Interactive = Default. Shows dialogs, Silent = No dialogs displayed, NonInteractive = Very silent, i.e. no blocking apps.
.PARAMETER AllowRebootPassThru
    Allows the 3010 return code (requires restart) to be passed back to the parent process. Default is: false
.PARAMETER TerminalServerMode
    Changes to "user install mode" and back to "user execute mode". Default is: false
.PARAMETER DisableLogging
    Disables logging. Default is: false
.EXAMPLE
    Deploy-Application.ps1
.EXAMPLE
    Deploy-Application.ps1 -DeploymentType "Uninstall" -DeployMode "Silent"
#>
[CmdletBinding()]
Param (
    [Parameter(Mandatory=$false)]
    [ValidateSet('Install','Uninstall')]
    [string]$DeploymentType = 'Install',
    [Parameter(Mandatory=$false)]
    [ValidateSet('Interactive','Silent','NonInteractive')]
    [string]$DeployMode = 'Interactive',
    [Parameter(Mandatory=$false)]
    [switch]$AllowRebootPassThru = $false,
    [Parameter(Mandatory=$false)]
    [switch]$TerminalServerMode = $false,
    [Parameter(Mandatory=$false)]
    [switch]$DisableLogging = $false
)

Try {
    ## Set the script execution policy for this process
    Try { Set-ExecutionPolicy -ExecutionPolicy 'ByPass' -Scope 'Process' -Force -ErrorAction 'Stop' } Catch {}

    ##*===============================================
    ##* VARIABLE DECLARATION
    ##*===============================================
    ## Variables: Application
    [string]$appVendor = 'Sample Inc.'
    [string]$appName = 'Sample Application'
    [string]$appVersion = '1.0.0'
    [string]$appArch = 'x64'
    [string]$appLang = 'EN'
    [string]$appRevision = '01'
    [string]$appScriptVersion = '1.0.0'
    [string]$appScriptDate = '03/17/2023'
    [string]$appScriptAuthor = 'PSADT Pro'
    ##*===============================================

    ## Main script execution
    If ($deploymentType -ieq 'Install') {
        # Perform installation
        Execute-MSI -Action Install -Path "$dirFiles\\SampleApp.msi" -Parameters "/qn ALLUSERS=1"
    }
    ElseIf ($deploymentType -ieq 'Uninstall') {
        # Perform uninstallation
        Execute-MSI -Action Uninstall -Path "{12345678-1234-1234-1234-123456789012}" -Parameters "/qn"
    }
}
Catch {
    ## Handle error
    $mainExitCode = 1
}

Exit $mainExitCode`
      
      setScriptContent(generatedScript)
      setIsGenerating(false)
    }, 2000)
  }

  const downloadScript = () => {
    if (!scriptContent) return
    
    // Create a blob and download it (in a real app, this would be handled by the backend)
    const blob = new Blob([scriptContent], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "Deploy-Application.ps1"
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyToClipboard = () => {
    if (!scriptContent) return
    
    navigator.clipboard.writeText(scriptContent)
    setIsCopied(true)
    
    setTimeout(() => {
      setIsCopied(false)
    }, 2000)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">PSADT Script Generation</h3>
        <p className="text-sm text-muted-foreground">
          Generate a PSADT deployment script based on the parameters you've configured.
        </p>
      </div>
      
      <div className="flex flex-wrap gap-3">
        <Button 
          onClick={generateScript}
          disabled={isGenerating}
          variant="default"
          className="flex-1 min-w-[140px]"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Generate Script
            </>
          )}
        </Button>
        
        <Button 
          onClick={downloadScript}
          disabled={!scriptContent}
          variant="outline"
          className="flex-1 min-w-[140px]"
        >
          <FileDown className="mr-2 h-4 w-4" />
          Download Script
        </Button>
        
        <Button 
          onClick={copyToClipboard}
          disabled={!scriptContent}
          variant="outline"
          className="flex-1 min-w-[140px]"
        >
          {isCopied ? (
            <>
              <Check className="mr-2 h-4 w-4 text-success" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" />
              Copy to Clipboard
            </>
          )}
        </Button>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label htmlFor="script-output" className="text-sm font-medium">Generated Script</label>
          <div className="text-xs text-muted-foreground">PowerShell (.ps1)</div>
        </div>
        
        <Card className="p-0 overflow-hidden bg-muted/20 border-muted">
          <Textarea
            id="script-output"
            value={scriptContent}
            onChange={(e) => setScriptContent(e.target.value)}
            className="font-mono text-xs h-[400px] min-h-[400px] resize-y focus-visible:ring-0 focus-visible:ring-offset-0 p-4 bg-transparent rounded-none border-0 shadow-none"
            placeholder="Click 'Generate Script' to create a PSADT deployment script."
          />
        </Card>
      </div>
    </div>
  )
} 