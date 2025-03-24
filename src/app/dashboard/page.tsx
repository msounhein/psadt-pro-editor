"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Activity,
  BarChart3,
  Clock,
  Download,
  Package,
  Users,
} from "lucide-react"

export default function DashboardPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)

  // Normally this would be fetched from an API
  const stats = [
    {
      name: "Total Packages",
      value: "24",
      description: "Packages created",
      icon: <Package className="h-4 w-4 text-muted-foreground" />,
    },
    {
      name: "Total Deployments",
      value: "342",
      description: "+22% from last month",
      icon: <Download className="h-4 w-4 text-muted-foreground" />,
    },
    {
      name: "Active Users",
      value: "12",
      description: "Using your packages",
      icon: <Users className="h-4 w-4 text-muted-foreground" />,
    },
    {
      name: "Avg. Completion",
      value: "1m 32s",
      description: "Deployment time",
      icon: <Clock className="h-4 w-4 text-muted-foreground" />,
    },
  ]

  const recentActivity = [
    { action: "Created MSI package", target: "Adobe Reader DC", time: "2 hours ago" },
    { action: "Updated package", target: "Microsoft Teams", time: "Yesterday" },
    { action: "Deployed package", target: "Google Chrome", time: "3 days ago" },
    { action: "Created template", target: "Basic MSI Template", time: "1 week ago" },
    { action: "Modified parameters", target: "VLC Media Player", time: "1 week ago" },
  ]

  return (
    <div className="flex-1 space-y-6 p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.name}
              </CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" /> Recent Activity
            </CardTitle>
            <CardDescription>Your recent actions and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, i) => (
                <div key={i} className="flex items-start gap-4 rounded-lg border p-3">
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {activity.action}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {activity.target}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {activity.time}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" /> Package Analytics
            </CardTitle>
            <CardDescription>Package deployment statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-[300px] items-center justify-center rounded-md border border-dashed p-6">
              <div className="flex flex-col items-center gap-2 text-center">
                <BarChart3 className="h-10 w-10 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Analytics coming soon</h3>
                <p className="text-sm text-muted-foreground max-w-[160px]">
                  Package analytics will be available in a future update
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 