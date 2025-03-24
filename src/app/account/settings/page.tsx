"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Cog, BellRing, Shield, Moon, Sun, Trash2, AlertCircle } from "lucide-react"

export default function SettingsPage() {
  const [isDirty, setIsDirty] = useState(false)
  
  const handleToggleChange = () => {
    setIsDirty(true)
  }

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-3xl font-bold mb-6">Account Settings</h1>
      
      <Tabs defaultValue="general">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="md:w-64">
            <TabsList className="flex flex-col h-auto p-0 bg-transparent space-y-1">
              <TabsTrigger 
                value="general"
                className="w-full justify-start px-3 py-2 h-9 font-normal data-[state=active]:bg-muted"
              >
                <Cog className="h-4 w-4 mr-2" /> General
              </TabsTrigger>
              <TabsTrigger 
                value="notifications" 
                className="w-full justify-start px-3 py-2 h-9 font-normal data-[state=active]:bg-muted"
              >
                <BellRing className="h-4 w-4 mr-2" /> Notifications
              </TabsTrigger>
              <TabsTrigger 
                value="appearance" 
                className="w-full justify-start px-3 py-2 h-9 font-normal data-[state=active]:bg-muted"
              >
                <Moon className="h-4 w-4 mr-2" /> Appearance
              </TabsTrigger>
              <TabsTrigger 
                value="security" 
                className="w-full justify-start px-3 py-2 h-9 font-normal data-[state=active]:bg-muted"
              >
                <Shield className="h-4 w-4 mr-2" /> Security
              </TabsTrigger>
              <TabsTrigger 
                value="danger" 
                className="w-full justify-start px-3 py-2 h-9 font-normal data-[state=active]:bg-muted"
              >
                <AlertCircle className="h-4 w-4 mr-2" /> Danger Zone
              </TabsTrigger>
            </TabsList>
          </div>
          
          <div className="flex-1">
            <TabsContent value="general" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>General Settings</CardTitle>
                  <CardDescription>
                    Manage your account preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="auto-save">Auto-save templates</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically save your templates while editing
                      </p>
                    </div>
                    <Switch id="auto-save" defaultChecked onChange={handleToggleChange} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="analytics">Usage analytics</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow us to collect anonymous usage data
                      </p>
                    </div>
                    <Switch id="analytics" defaultChecked onChange={handleToggleChange} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="beta">Beta features</Label>
                      <p className="text-sm text-muted-foreground">
                        Get early access to new features
                      </p>
                    </div>
                    <Switch id="beta" onChange={handleToggleChange} />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button disabled={!isDirty}>Save Changes</Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="notifications" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Settings</CardTitle>
                  <CardDescription>
                    Manage how and when you receive notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="deployment-alerts">Deployment alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications when deployments complete
                      </p>
                    </div>
                    <Switch id="deployment-alerts" defaultChecked onChange={handleToggleChange} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="update-notifications">Product updates</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified about new features and updates
                      </p>
                    </div>
                    <Switch id="update-notifications" defaultChecked onChange={handleToggleChange} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="email-notifications">Email notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive email notifications for important events
                      </p>
                    </div>
                    <Switch id="email-notifications" onChange={handleToggleChange} />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button disabled={!isDirty}>Save Changes</Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="appearance" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Appearance Settings</CardTitle>
                  <CardDescription>
                    Customize the look and feel of your experience
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="mb-4">
                        <Label>Color Theme</Label>
                        <p className="text-sm text-muted-foreground">
                          Choose your preferred color theme
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <Button variant="outline" className="justify-start" onClick={handleToggleChange}>
                          <Sun className="h-4 w-4 mr-2" /> Light
                        </Button>
                        <Button variant="outline" className="justify-start" onClick={handleToggleChange}>
                          <Moon className="h-4 w-4 mr-2" /> Dark
                        </Button>
                        <Button variant="outline" className="justify-start" onClick={handleToggleChange}>
                          <Cog className="h-4 w-4 mr-2" /> System
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4">
                      <div className="space-y-0.5">
                        <Label htmlFor="animations">Animations</Label>
                        <p className="text-sm text-muted-foreground">
                          Enable UI animations and transitions
                        </p>
                      </div>
                      <Switch id="animations" defaultChecked onChange={handleToggleChange} />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button disabled={!isDirty}>Save Changes</Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="security" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>
                    Manage your account security and privacy
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button variant="outline" className="w-full justify-start" onClick={handleToggleChange}>
                    Change Password
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={handleToggleChange}>
                    Enable Two-Factor Authentication
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={handleToggleChange}>
                    View Security Logs
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="danger" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-destructive">Danger Zone</CardTitle>
                  <CardDescription>
                    Irreversible account actions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border border-destructive/20 p-4">
                    <h3 className="text-lg font-medium mb-2">Delete Account</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      This will permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                    <Button variant="destructive" className="gap-2">
                      <Trash2 className="h-4 w-4" /> Delete Account
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  )
} 