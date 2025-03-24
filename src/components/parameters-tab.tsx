"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Sparkles, Globe, Check, Loader2 } from "lucide-react"

export function ParametersTab() {
  const [installCommand, setInstallCommand] = useState("")
  const [uninstallCommand, setUninstallCommand] = useState("")
  const [silentParameters, setSilentParameters] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isScraping, setIsScraping] = useState(false)
  const [parameters, setParameters] = useState<any>(null)

  // Mock function to analyze parameters (will be replaced with API call)
  const analyzeParameters = async () => {
    setIsAnalyzing(true)
    
    // Simulate API call
    setTimeout(() => {
      setParameters({
        recommendedInstall: "msiexec.exe /i \"[Path]\\SampleApp.msi\" /qn ALLUSERS=1",
        recommendedUninstall: "msiexec.exe /x \"{12345678-1234-1234-1234-123456789012}\" /qn",
        silentParams: ["/qn", "/quiet", "ALLUSERS=1"],
        confidence: "high"
      })
      
      setInstallCommand("msiexec.exe /i \"[Path]\\SampleApp.msi\" /qn ALLUSERS=1")
      setUninstallCommand("msiexec.exe /x \"{12345678-1234-1234-1234-123456789012}\" /qn")
      setSilentParameters("/qn,/quiet,ALLUSERS=1")
      
      setIsAnalyzing(false)
    }, 2000)
  }

  // Mock function to scrape web for parameters (will be replaced with API call)
  const scrapeWebParameters = async () => {
    setIsScraping(true)
    
    // Simulate API call
    setTimeout(() => {
      setParameters({
        ...parameters,
        webFindings: [
          { source: "Vendor Website", parameters: "/qn REBOOT=ReallySuppress ALLUSERS=1" },
          { source: "Community Forum", parameters: "/qn /norestart TARGETDIR=\"C:\\Program Files\\Sample App\"" }
        ]
      })
      
      setIsScraping(false)
    }, 3000)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Installation Parameters</h3>
        <p className="text-sm text-muted-foreground">
          Analyze MSI parameters or enter them manually below.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button 
          onClick={analyzeParameters}
          disabled={isAnalyzing}
          variant="default"
          className="flex-1 min-w-[140px]"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Analyze Parameters
            </>
          )}
        </Button>
        
        <Button 
          onClick={scrapeWebParameters}
          disabled={isScraping || !parameters}
          variant="outline"
          className="flex-1 min-w-[140px]"
        >
          {isScraping ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Scraping...
            </>
          ) : (
            <>
              <Globe className="mr-2 h-4 w-4" />
              Scrape Web
            </>
          )}
        </Button>
      </div>

      {parameters && (
        <Card className="mt-6 border border-border/40 shadow-sm bg-card/50">
          <CardContent className="pt-6 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h4 className="font-medium text-lg">Recommended Parameters</h4>
                <span className="text-xs rounded-full bg-primary/10 text-primary px-2 py-0.5 font-medium">
                  {parameters.confidence} confidence
                </span>
              </div>
              
              <div className="grid grid-cols-1 gap-y-4 mt-2 text-sm">
                <div className="space-y-1.5">
                  <div className="font-medium text-muted-foreground">Install Command</div>
                  <div className="font-mono bg-muted/70 p-2 rounded text-xs overflow-x-auto">
                    {parameters.recommendedInstall}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="font-medium text-muted-foreground">Uninstall Command</div>
                  <div className="font-mono bg-muted/70 p-2 rounded text-xs overflow-x-auto">
                    {parameters.recommendedUninstall}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="font-medium text-muted-foreground">Silent Parameters</div>
                  <div className="flex flex-wrap gap-1.5">
                    {parameters.silentParams?.map((param: string) => (
                      <span key={param} className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {param}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {parameters.webFindings && (
              <div className="pt-4 border-t">
                <h4 className="font-medium text-lg mb-3">Web Findings</h4>
                <div className="grid gap-3 mt-2">
                  {parameters.webFindings.map((finding: any, index: number) => (
                    <div key={index} className="text-sm border rounded-lg p-3 bg-muted/30">
                      <div className="font-medium text-xs text-muted-foreground mb-1.5">Source: {finding.source}</div>
                      <div className="font-mono bg-muted/70 p-2 rounded text-xs overflow-x-auto">
                        {finding.parameters}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="border-t pt-5 mt-6">
        <h4 className="font-medium text-lg mb-4">Manual Parameters</h4>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="install-command" className="text-sm font-medium">Installation Command</label>
            <Input
              id="install-command"
              placeholder="Enter installation command"
              value={installCommand}
              onChange={(e) => setInstallCommand(e.target.value)}
              className="font-mono text-sm bg-background"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="uninstall-command" className="text-sm font-medium">Uninstallation Command</label>
            <Input
              id="uninstall-command"
              placeholder="Enter uninstallation command"
              value={uninstallCommand}
              onChange={(e) => setUninstallCommand(e.target.value)}
              className="font-mono text-sm bg-background"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="silent-parameters" className="text-sm font-medium">Silent Parameters (comma-separated)</label>
            <Input
              id="silent-parameters"
              placeholder="Enter silent parameters, separated by commas"
              value={silentParameters}
              onChange={(e) => setSilentParameters(e.target.value)}
              className="font-mono text-sm bg-background"
            />
          </div>
          
          <Button 
            className="w-full" 
            variant={installCommand && uninstallCommand ? "default" : "outline"}
            disabled={!installCommand || !uninstallCommand}
          >
            <Check className="mr-2 h-4 w-4" />
            Save Parameters
          </Button>
        </div>
      </div>
    </div>
  )
} 