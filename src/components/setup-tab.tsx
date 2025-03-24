"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Download, RefreshCw, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { usePsadtStore } from "@/store/psadt-store"

export function SetupTab() {
  const [psadtStatus, setPsadtStatus] = useState<"checking" | "not-found" | "found">("checking")
  const [versions, setVersions] = useState<string[]>([])
  const [selectedVersion, setSelectedVersion] = useState<string>("")
  const [templateName, setTemplateName] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  // Mock function to check PSADT status (will be replaced with API call)
  const checkPsadtStatus = async () => {
    // Simulate API call
    setTimeout(() => {
      setPsadtStatus("not-found")
    }, 1000)
  }

  // Mock function to load versions (will be replaced with API call)
  const loadVersions = async () => {
    setIsLoading(true)
    // Simulate API call
    setTimeout(() => {
      setVersions(["3.9.0", "3.8.4", "3.8.3", "3.8.2"])
      setIsLoading(false)
    }, 1000)
  }

  // Mock function to download PSADT
  const downloadPsadt = async () => {
    setIsDownloading(true)
    // Simulate API call
    setTimeout(() => {
      setPsadtStatus("found")
      setIsDownloading(false)
    }, 2000)
  }

  // Load status and versions on component mount
  useEffect(() => {
    checkPsadtStatus()
    loadVersions()
  }, [])

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">PSADT Setup</h3>
        
        {psadtStatus === "checking" && (
          <Alert variant="default" className="bg-muted/50 border-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>Checking PSADT status...</AlertDescription>
          </Alert>
        )}
        
        {psadtStatus === "not-found" && (
          <Alert variant="destructive" className="bg-destructive/10 border-destructive/30 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>PSADT not found. Please download using the options below.</AlertDescription>
          </Alert>
        )}
        
        {psadtStatus === "found" && (
          <Alert variant="default" className="bg-success/10 border-success/30 text-success">
            <CheckCircle className="h-4 w-4 text-success" />
            <AlertDescription>PSADT is installed and ready to use.</AlertDescription>
          </Alert>
        )}
      </div>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="psadt-version" className="text-sm font-medium">PSADT Version</label>
          <Select
            value={selectedVersion}
            onValueChange={setSelectedVersion}
            disabled={isLoading || versions.length === 0}
          >
            <SelectTrigger id="psadt-version" className="bg-background">
              <SelectValue placeholder="Select a version" />
            </SelectTrigger>
            <SelectContent>
              {versions.map((version) => (
                <SelectItem key={version} value={version}>
                  Version {version} {version === "3.9.0" && "(Latest)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Select a version of PSADT to download or use the latest.
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            disabled={!selectedVersion || psadtStatus === "found" || isDownloading}
            variant="default"
            onClick={downloadPsadt}
            className="relative"
          >
            {isDownloading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download PSADT
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            onClick={loadVersions}
            disabled={isLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh Versions
          </Button>
        </div>
        
        <div className="space-y-2 pt-4 border-t">
          <label htmlFor="template-name" className="text-sm font-medium">Template Name</label>
          <Input
            id="template-name"
            placeholder="Enter template name"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="bg-background"
          />
          <p className="text-xs text-muted-foreground">
            This will be used as the base name for your deployment script.
          </p>
        </div>
        
        <Button
          disabled={!templateName || psadtStatus !== "found"}
          variant={templateName && psadtStatus === "found" ? "default" : "outline"}
          className="w-full mt-2"
        >
          Create Template
        </Button>
      </div>
    </div>
  )
} 