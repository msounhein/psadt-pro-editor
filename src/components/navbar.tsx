"use client"

import { useState, useEffect } from "react"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Bell, Info, User, LogOut, Settings } from "lucide-react"
import { useSession, signOut } from "next-auth/react"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { PowerShellBreadcrumb } from "./powershell-breadcrumb"
import { usePathname } from "next/navigation"

interface Template {
  id: string;
  name: string;
  version?: string;
}

export function Navbar() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const [segments, setSegments] = useState([{ label: 'PSADTPro', href: '/' }])
  const [templateData, setTemplateData] = useState<Template | null>(null)
  
  useEffect(() => {
    const updateSegments = async () => {
      const newSegments = [{ label: 'PSADTPro', href: '/' }]
      
      if (pathname?.includes('documentation')) {
        newSegments.push({ label: 'Documentation', href: '/documentation' })
      } else if (pathname?.includes('templates')) {
        newSegments.push({ label: 'Templates', href: '/' })
      } else if (pathname?.includes('package-type')) {
        newSegments.push({ label: 'Package Type', href: '/package-type' })
      } else if (pathname?.includes('parameters')) {
        newSegments.push({ label: 'Parameters', href: '/parameters' })
      } else if (pathname?.includes('functions')) {
        newSegments.push({ label: 'Functions', href: '/functions' })
      } else if (pathname?.includes('ide')) {
        newSegments.push({ label: 'ide', href: '/ide' })
        
        // Check if we're on a specific template page
        const match = pathname.match(/\/ide\/([^\/]+)/)
        if (match) {
          console.log(`match: ${match}`)
          const templateId = match[1]
          try {
            const response = await fetch(`/api/templates/${templateId}`)
            if (response.ok) {
              const data = await response.json()
              setTemplateData(data)
              newSegments.push({ 
                label: `${data.name || 'Loading...'}`,
                href: `/ide/${templateId}` 
              })
            }
          } catch (error) {
            console.error('Error fetching template:', error)
          }
        }
      } else if (pathname?.includes('[id]')) {
        newSegments.push({ label: 'Name', href: '/[id]' })
      }
      
      setSegments(newSegments)
    }
    
    updateSegments()
  }, [pathname])
  
  return (
    <header className="h-16 bg-background border-b dark:border-[#21262d] rounded-t-xl md-elevation-1 font-google backdrop-blur supports-[backdrop-filter]:bg-background/70">
      {/* PowerShell breadcrumb now shown on all pages */}
      <div className="w-full h-full py-1.5 px-4 flex items-center justify-between">
        <PowerShellBreadcrumb segments={segments} />
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            className="rounded-full hover:bg-muted/50 dark:hover:bg-slate-800/30 md-ripple transition-colors duration-200"
          >
            <Info className="h-[1.2rem] w-[1.2rem] dark:text-[#a1b4d0]" />
            <span className="sr-only">Help</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon"
            className="rounded-full hover:bg-muted/50 dark:hover:bg-slate-800/30 md-ripple transition-colors duration-200"
          >
            <Bell className="h-[1.2rem] w-[1.2rem] dark:text-[#a1b4d0]" />
            <span className="sr-only">Notifications</span>
          </Button>
          
          <ThemeToggle />
          
          {status === "authenticated" && session.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full hover:bg-muted/50 dark:hover:bg-slate-800/30 transition-colors duration-200"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-[#4285F4]/10 text-[#4285F4] font-google">
                      {session.user.name ? session.user.name.charAt(0).toUpperCase() : "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="dark:bg-[#161b22] dark:border-[#30363d] font-google">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    {session.user.name && <p className="font-medium dark:text-[#e6edf3]">{session.user.name}</p>}
                    {session.user.email && (
                      <p className="w-[200px] truncate text-sm text-muted-foreground dark:text-[#8aa2cc]">
                        {session.user.email}
                      </p>
                    )}
                  </div>
                </div>
                <DropdownMenuSeparator className="dark:bg-[#30363d]" />
                <DropdownMenuItem asChild>
                  <Link href="/account/profile" className="flex cursor-pointer items-center dark:text-[#a1b4d0] dark:hover:text-[#e6edf3] dark:focus:text-[#e6edf3] dark:hover:bg-slate-800/30">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/account/settings" className="flex cursor-pointer items-center dark:text-[#a1b4d0] dark:hover:text-[#e6edf3] dark:focus:text-[#e6edf3] dark:hover:bg-slate-800/30">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="dark:bg-[#30363d]" />
                <DropdownMenuItem
                  className="cursor-pointer dark:text-[#a1b4d0] dark:hover:text-[#e6edf3] dark:focus:text-[#e6edf3] dark:hover:bg-slate-800/30"
                  onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button 
              variant="secondary" 
              size="sm" 
              asChild
              className="rounded-lg bg-[#4285F4]/10 dark:bg-[#4285F4]/10 text-[#4285F4] dark:text-[#8ebbff] hover:bg-[#4285F4]/20 font-google font-medium"
            >
              <Link href="/auth/signin">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
} 