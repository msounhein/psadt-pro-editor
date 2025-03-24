"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sparkles, ArrowRight, FileSpreadsheet, Settings, RotateCw } from "lucide-react"

export default function ParametersPage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  
  // Mock MSI data
  const msiData = {
    productName: "Sample Application",
    productCode: "{12345678-1234-1234-1234-123456789012}",
    manufacturer: "Sample Inc.",
    version: "1.0.0"
  }

  const analyzeParameters = () => {
    setIsAnalyzing(true)
    // Simulate analysis
    setTimeout(() => {
      setIsAnalyzing(false)
    }, 2000)
  }

  return (
    <div className="container py-6 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Configure Parameters</h1>
          <p className="text-muted-foreground mt-1">
            Define installation parameters for your PSADT package
          </p>
        </div>
        
        <div className="space-y-6">
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{msiData.productName}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">MSI Package • {msiData.version}</p>
                </div>
                <Button variant="outline" size="sm" onClick={analyzeParameters} disabled={isAnalyzing}>
                  {isAnalyzing ? (
                    <>
                      <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Auto-detect
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div className="flex flex-col space-y-0.5">
                  <span className="text-muted-foreground">Product Code</span>
                  <span className="font-mono bg-muted p-1.5 rounded text-xs">{msiData.productCode}</span>
                </div>
                <div className="flex flex-col space-y-0.5">
                  <span className="text-muted-foreground">Manufacturer</span>
                  <span className="font-mono bg-muted p-1.5 rounded text-xs">{msiData.manufacturer}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
              <TabsTrigger value="transforms">Transforms</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Installation Command</label>
                  <Textarea 
                    placeholder="e.g., msiexec.exe /i &quot;[Path]\Sample.msi&quot; /qn ALLUSERS=1"
                    className="font-mono text-sm"
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground">
                    Command used to install the application. Variables like [Path] will be replaced at runtime.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Uninstallation Command</label>
                  <Textarea 
                    placeholder="e.g., msiexec.exe /x {12345678-1234-1234-1234-123456789012} /qn"
                    className="font-mono text-sm"
                    rows={2}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">UI Mode</label>
                    <Select defaultValue="silent">
                      <SelectTrigger>
                        <SelectValue placeholder="Select UI mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="silent">Silent (/qn)</SelectItem>
                        <SelectItem value="basic">Basic UI (/qb)</SelectItem>
                        <SelectItem value="reduced">Reduced UI (/qr)</SelectItem>
                        <SelectItem value="full">Full UI (/qf)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Logging</label>
                    <Select defaultValue="standard">
                      <SelectTrigger>
                        <SelectValue placeholder="Select logging option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Logging</SelectItem>
                        <SelectItem value="standard">Standard (/l*v)</SelectItem>
                        <SelectItem value="verbose">Verbose (/l*vx)</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="advanced" className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Additional Parameters</label>
                <Textarea 
                  placeholder="TRANSFORMS=&quot;transform.mst&quot; REBOOT=ReallySuppress REINSTALLMODE=vomus"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Enter additional parameters that will be added to the installation command.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Installation Directory</label>
                  <Input 
                    placeholder="e.g., [ProgramFiles]\Company\App"
                    className="font-mono text-sm"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Reboot Behavior</label>
                  <Select defaultValue="suppress">
                    <SelectTrigger>
                      <SelectValue placeholder="Select reboot behavior" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="allow">Allow Reboot</SelectItem>
                      <SelectItem value="suppress">Suppress Reboot</SelectItem>
                      <SelectItem value="force">Force Reboot</SelectItem>
                      <SelectItem value="delayed">Delayed Reboot</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="transforms" className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">MST Transform Files</label>
                  <Button variant="outline" size="sm">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Add Transform
                  </Button>
                </div>
                <div className="bg-muted/50 rounded-md p-6 border border-dashed flex flex-col items-center justify-center text-muted-foreground">
                  <Settings className="h-8 w-8 mb-2" />
                  <p>No transform files added</p>
                  <p className="text-xs mt-1">MST files modify the MSI installation behavior</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end pt-4">
            <Button className="gap-2">
              Continue to Functions
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 