"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Package2, FileArchive, FileType2, Workflow, ArrowRight } from "lucide-react"
import { useState } from "react"

type PackageType = "MSI" | "EXE" | "ZIP" | "Script" | null

export default function PackageTypePage() {
  const [selected, setSelected] = useState<PackageType>(null)

  return (
    <div className="container py-6 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Select Package Type</h1>
          <p className="text-muted-foreground mt-1">
            Choose the type of package you want to deploy
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <Card 
            className={`cursor-pointer hover:border-primary/50 transition-all ${
              selected === "MSI" ? "border-primary bg-primary/5" : ""
            }`}
            onClick={() => setSelected("MSI")}
          >
            <CardHeader>
              <FileType2 className="h-8 w-8 text-primary/80 mb-2" />
              <CardTitle>MSI Package</CardTitle>
              <CardDescription>
                Windows Installer package with built-in installation parameters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Automated parameter extraction</li>
                <li>• Silent installation support</li>
                <li>• Built-in rollback capabilities</li>
              </ul>
            </CardContent>
          </Card>
          
          <Card 
            className={`cursor-pointer hover:border-primary/50 transition-all ${
              selected === "EXE" ? "border-primary bg-primary/5" : ""
            }`}
            onClick={() => setSelected("EXE")}
          >
            <CardHeader>
              <Package2 className="h-8 w-8 text-primary/80 mb-2" />
              <CardTitle>EXE Package</CardTitle>
              <CardDescription>
                Executable installer with custom parameters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Vendor-specific parameters</li>
                <li>• Custom installation options</li>
                <li>• Requires parameter research</li>
              </ul>
            </CardContent>
          </Card>
          
          <Card 
            className={`cursor-pointer hover:border-primary/50 transition-all ${
              selected === "ZIP" ? "border-primary bg-primary/5" : ""
            }`}
            onClick={() => setSelected("ZIP")}
          >
            <CardHeader>
              <FileArchive className="h-8 w-8 text-primary/80 mb-2" />
              <CardTitle>ZIP Archive</CardTitle>
              <CardDescription>
                Compressed package requiring extraction
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• File extraction handling</li>
                <li>• May contain multiple files</li>
                <li>• Manual extraction options</li>
              </ul>
            </CardContent>
          </Card>
          
          <Card 
            className={`cursor-pointer hover:border-primary/50 transition-all ${
              selected === "Script" ? "border-primary bg-primary/5" : ""
            }`}
            onClick={() => setSelected("Script")}
          >
            <CardHeader>
              <Workflow className="h-8 w-8 text-primary/80 mb-2" />
              <CardTitle>Custom Script</CardTitle>
              <CardDescription>
                PowerShell or other script-based installation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• PowerShell, batch, or VBScript</li>
                <li>• Complete customization</li>
                <li>• Advanced deployment options</li>
              </ul>
            </CardContent>
          </Card>
        </div>
        
        <div className="flex justify-end">
          <Button disabled={!selected} className="gap-2">
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
} 