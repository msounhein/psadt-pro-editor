"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { FileUp, FolderOpen, FileSearch, Loader2 } from "lucide-react"

export function MSITab() {
  const [msiPath, setMsiPath] = useState("")
  const [metadata, setMetadata] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Mock function to extract MSI metadata (will be replaced with API call)
  const extractMetadata = async () => {
    if (!msiPath) return

    setIsLoading(true)
    
    // Simulate API call
    setTimeout(() => {
      // Sample metadata
      setMetadata({
        productName: "Sample Application",
        productVersion: "1.0.0",
        manufacturer: "Sample Inc.",
        productCode: "{12345678-1234-1234-1234-123456789012}",
        language: "1033",
        estimatedSize: "50 MB",
        installLocation: "C:\\Program Files\\Sample Application"
      })
      setIsLoading(false)
    }, 1500)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">MSI Package Processing</h3>
        <p className="text-sm text-muted-foreground">
          Upload or specify an MSI file to extract installation parameters and metadata.
        </p>
      </div>

      <div className="space-y-5">
        <div 
          className="relative border-2 border-dashed border-muted-foreground/25 rounded-xl p-10 flex flex-col items-center justify-center gap-2 transition-colors hover:bg-muted/50 cursor-pointer"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const file = e.dataTransfer.files?.[0]
            if (file && file.name.endsWith('.msi')) {
              setMsiPath(file.name)
            }
          }}
        >
          <div className="rounded-full bg-primary/10 p-3">
            <FileUp className="h-10 w-10 text-primary" />
          </div>
          <p className="text-lg font-medium mt-2">Drag and drop an MSI file here</p>
          <p className="text-sm text-muted-foreground">or</p>
          <Button size="sm" variant="secondary" className="mt-1">
            <FolderOpen className="mr-2 h-4 w-4" />
            Browse Files
          </Button>
          <input 
            type="file" 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            accept=".msi"
            onChange={(e) => e.target.files?.[0] && setMsiPath(e.target.files[0].name)}
          />
        </div>

        <div className="space-y-2 pt-2">
          <label htmlFor="msi-path" className="text-sm font-medium">Or Enter MSI Path</label>
          <div className="flex gap-2">
            <Input
              id="msi-path"
              placeholder="Enter path to MSI file"
              value={msiPath}
              onChange={(e) => setMsiPath(e.target.value)}
              className="bg-background"
            />
            <Button 
              onClick={extractMetadata}
              disabled={!msiPath || isLoading}
              variant="default"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <FileSearch className="mr-2 h-4 w-4" />
                  Extract Metadata
                </>
              )}
            </Button>
          </div>
        </div>

        {metadata && (
          <Card className="mt-6 border border-border/40 shadow-sm bg-card/50">
            <CardContent className="pt-6">
              <h4 className="font-medium text-lg mb-3">MSI Metadata</h4>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                {Object.entries(metadata).map(([key, value]) => (
                  <div key={key} className="contents">
                    <div className="font-medium capitalize text-muted-foreground">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                    <div className="font-mono bg-muted/50 px-2 py-1 rounded">{value as string}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
} 