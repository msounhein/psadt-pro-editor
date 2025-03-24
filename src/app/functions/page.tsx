"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Code, Clipboard, ArrowRight, FileCode, FileText } from "lucide-react"

interface PsadtFunction {
  name: string
  description: string
  category: "UI" | "File" | "Registry" | "Application" | "Network" | "Misc"
  example: string
}

export default function FunctionsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  
  const psadtFunctions: PsadtFunction[] = [
    {
      name: "Show-InstallationWelcome",
      description: "Shows a customizable welcome dialog for the installation",
      category: "UI",
      example: "Show-InstallationWelcome -CloseApps 'chrome,firefox' -AllowDefer -DeferTimes 3"
    },
    {
      name: "Show-InstallationProgress",
      description: "Displays a progress dialog during installation",
      category: "UI",
      example: "Show-InstallationProgress -StatusMessage 'Installing application...'"
    },
    {
      name: "Show-DialogBox",
      description: "Displays a custom dialog box with specified options",
      category: "UI",
      example: "Show-DialogBox -Title 'Warning' -Text 'Please save your work before continuing.'"
    },
    {
      name: "Copy-File",
      description: "Copies file(s) to a destination path",
      category: "File",
      example: "Copy-File -Path '$dirFiles\\config.xml' -Destination '$envProgramData\\App\\config.xml'"
    },
    {
      name: "Remove-File",
      description: "Removes file(s) from a specified location",
      category: "File",
      example: "Remove-File -Path '$envTemp\\*.log'"
    },
    {
      name: "Set-RegistryKey",
      description: "Creates or modifies a registry key value",
      category: "Registry",
      example: "Set-RegistryKey -Key 'HKEY_LOCAL_MACHINE\\SOFTWARE\\MyApp' -Name 'Version' -Value '1.0'"
    },
    {
      name: "Get-RegistryKey",
      description: "Retrieves a registry key value",
      category: "Registry",
      example: "Get-RegistryKey -Key 'HKEY_LOCAL_MACHINE\\SOFTWARE\\MyApp' -Name 'Version'"
    },
    {
      name: "Execute-Process",
      description: "Executes a process with optional parameters",
      category: "Application",
      example: "Execute-Process -FilePath 'setup.exe' -Arguments '/quiet /norestart'"
    },
    {
      name: "Execute-MSI",
      description: "Installs or uninstalls an MSI package",
      category: "Application",
      example: "Execute-MSI -Action 'Install' -Path 'application.msi' -Parameters '/quiet /norestart'"
    },
    {
      name: "Test-NetworkConnection",
      description: "Tests if a network connection is available",
      category: "Network",
      example: "Test-NetworkConnection -ComputerName 'server.domain.com' -Port 443"
    },
    {
      name: "Invoke-RegisterOrUnregisterDLL",
      description: "Registers or unregisters a DLL file",
      category: "Misc",
      example: "Invoke-RegisterOrUnregisterDLL -FilePath '$envProgramFiles\\App\\library.dll' -Action 'Register'"
    },
    {
      name: "Get-FreeDiskSpace",
      description: "Gets the free disk space for a specified drive",
      category: "Misc",
      example: "Get-FreeDiskSpace -Drive 'C:'"
    },
  ]
  
  const filteredFunctions = psadtFunctions.filter(fn => 
    fn.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    fn.description.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  const groupedFunctions = filteredFunctions.reduce((acc, fn) => {
    if (!acc[fn.category]) {
      acc[fn.category] = []
    }
    acc[fn.category].push(fn)
    return acc
  }, {} as Record<string, PsadtFunction[]>)
  
  const categories = Object.keys(groupedFunctions)

  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">PSADT Functions</h1>
          <p className="text-muted-foreground">
            Browse and search all available PowerShell App Deployment Toolkit functions
          </p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search functions..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      {categories.length > 0 ? (
        <Tabs defaultValue={categories[0]}>
          <TabsList className="mb-4 w-full justify-start overflow-x-auto space-x-1">
            {categories.map((category) => (
              <TabsTrigger key={category} value={category}>
                {category} <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs">
                  {groupedFunctions[category].length}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
          
          {categories.map((category) => (
            <TabsContent key={category} value={category} className="mt-0">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groupedFunctions[category].map((fn) => (
                  <Card key={fn.name}>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-start justify-between">
                        <div className="flex items-start gap-2">
                          <Code className="h-5 w-5 text-primary mt-0.5" />
                          <span className="font-mono text-sm font-bold">{fn.name}</span>
                        </div>
                        <Button variant="ghost" size="icon" title="Copy function name">
                          <Clipboard className="h-4 w-4" />
                        </Button>
                      </CardTitle>
                      <CardDescription>{fn.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="rounded-md bg-muted p-3">
                        <code className="text-xs font-mono">{fn.example}</code>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <Button variant="link" size="sm" className="px-0">
                        View documentation <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <FileCode className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="mt-6 text-xl font-semibold">No functions found</h2>
          <p className="mt-2 text-center text-sm text-muted-foreground max-w-sm">
            We couldn't find any functions matching your search. Try using different keywords or browsing all categories.
          </p>
          <Button className="mt-4" onClick={() => setSearchQuery("")}>
            Clear search
          </Button>
        </div>
      )}
    </div>
  )
} 