"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { 
  Folder, 
  Package, 
  Settings, 
  Code, 
  ChevronRight,
  Menu,
  User,
  LayoutDashboard,
  BookOpen
} from "lucide-react"

interface NavItem {
  title: string
  icon: React.ReactNode
  href: string
  isActive?: boolean
  badge?: string
}

// Add custom scrollbar styling to the navigation
const scrollbarStyles = `
  .sidebar-scroll::-webkit-scrollbar {
    width: 6px;
  }
  
  .sidebar-scroll::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .sidebar-scroll::-webkit-scrollbar-thumb {
    background-color: rgba(142, 187, 255, 0.2);
    border-radius: 20px;
    transition: background-color 0.3s;
  }
  
  .sidebar-scroll::-webkit-scrollbar-thumb:hover {
    background-color: rgba(142, 187, 255, 0.4);
  }
  
  /* For Firefox */
  .sidebar-scroll {
    scrollbar-width: thin;
    scrollbar-color: rgba(142, 187, 255, 0.2) transparent;
  }
`;

export function Sidebar() {
  const [expanded, setExpanded] = useState(true)
  const pathname = usePathname()
  
  // Listen for sidebar toggle events
  useEffect(() => {
    const handleSidebarToggle = (event: CustomEvent<{ expanded: boolean }>) => {
      console.log('Sidebar received toggle event:', event.detail);
      setExpanded(event.detail.expanded);
    };

    // Add event listener with proper typing
    window.addEventListener('toggleSidebar', handleSidebarToggle as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('toggleSidebar', handleSidebarToggle as EventListener);
    };
  }, []);

  // Main navigation items shown in the upper section
  const mainNavItems: NavItem[] = [
    {
      title: "Templates",
      icon: <Folder className="h-5 w-5" />,
      href: "/",
      isActive: pathname === "/",
    },
    {
      title: "Package Type",
      icon: <Package className="h-5 w-5" />,
      href: "/package-type",
      isActive: pathname === "/package-type",
    },
    {
      title: "Parameters",
      icon: <Settings className="h-5 w-5" />,
      href: "/parameters",
      isActive: pathname === "/parameters",
    },
    {
      title: "Functions",
      icon: <Code className="h-5 w-5" />,
      href: "/functions",
      isActive: pathname === "/functions",
      badge: "30+",
    },
    {
      title: "Documentation",
      icon: <BookOpen className="h-5 w-5" />,
      href: "/documentation",
      isActive: pathname === "/documentation",
    },
  ]

  // Account navigation items shown in the lower section
  const accountNavItems: NavItem[] = [
    {
      title: "Dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
      href: "/dashboard",
      isActive: pathname === "/dashboard",
    },
    {
      title: "Profile",
      icon: <User className="h-5 w-5" />,
      href: "/account/profile",
      isActive: pathname === "/account/profile",
    },
  ]

  return (
    // Main sidebar container - determines overall width, borders and animation
    <div 
      className={cn(
        "h-screen border-r bg-background dark:bg-[#0f1216] md-elevation-2 flex flex-col rounded-xl overflow-hidden font-google",
        expanded ? "min-w-[256px] w-64" : "min-w-[80px] w-20"
      )}
      style={{ 
        background: "linear-gradient(180deg, rgba(15,18,22,1) 0%, rgba(18,21,26,1) 100%)",
        transition: "all 300ms cubic-bezier(0.34, 1.56, 0.64, 1)"
      }}
    >
      <style jsx>{scrollbarStyles}</style>
      
      {/* Header/title section with logo and toggle button */}
      <div className="flex items-center h-16 px-4 border-b border-[#21262d] relative">
        {/* Full logo text - shown when expanded */}
        <span className={cn(
          "font-google-display font-medium text-xl text-primary transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] dark:text-[#4285F4]",
          expanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8 absolute pointer-events-none"
        )}>
          PSADT Pro
        </span>
        {/* Shortened logo - shown when collapsed */}
        <span className={cn(
          "font-google-display font-medium text-xl text-primary transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] dark:text-[#4285F4]",
          expanded ? "opacity-0 translate-x-8 absolute pointer-events-none" : "opacity-100 translate-x-0 ml-1"
        )}>
          PS
        </span>
        {/* Toggle button to expand/collapse sidebar */}
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn(
            "transition-all duration-300 ease-out hover:bg-muted group z-50 dark:hover:bg-slate-800/50 md-ripple",
            expanded ? "ml-auto" : "absolute right-3"
          )}
          onClick={() => setExpanded(!expanded)}
        >
          <Menu className={cn(
            "h-5 w-5 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:text-primary dark:text-[#8ebbff] dark:group-hover:text-[#4285F4]",
            expanded ? "" : "rotate-90"
          )} />
        </Button>
      </div>
      
      {/* Navigation container - holds all nav items */}
      <nav className={cn(
        "flex-1 space-y-1 overflow-y-auto sidebar-scroll transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
        expanded ? "p-2" : "p-3 pt-4"
      )}>
        {/* Main navigation section */}
        <div className="mb-4">
          {/* "Main" section header - only visible when expanded */}
          <p className={cn(
            "mb-2 px-3 text-xs font-medium text-muted-foreground transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] dark:text-[#8aa2cc]",
            expanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
          )}>
            Main
          </p>
          {/* Main navigation items */}
          {mainNavItems.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center rounded-md text-sm font-medium group transition-all duration-200 relative",
                "hover:bg-muted/50 dark:hover:bg-slate-800/30 md-ripple",
                item.isActive 
                  ? "bg-primary/10 text-primary font-medium dark:bg-[#4285F4]/10 dark:text-[#8ebbff]" 
                  : "text-muted-foreground hover:text-foreground dark:text-[#a1b4d0] dark:hover:text-[#e6edf3]",
                "transition-all duration-300",
                expanded ? "py-2 px-3" : "py-3 px-3 my-1 mx-auto"
              )}
              style={{
                transitionDelay: `${(index + 1) * 40}ms`,
                transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)"
              }}
            >
              {/* Active indicator - only visible for active items */}
              {item.isActive && (
                <div 
                  className="absolute left-0 top-0 bottom-0 w-1 bg-primary dark:bg-[#4285F4] rounded-full my-1.5 transition-all duration-500 ease-out" 
                  style={{ 
                    opacity: expanded ? 1 : 0,
                    transform: expanded ? 'translateX(0)' : 'translateX(-4px)'
                  }}
                />
              )}
              
              <div className={cn(
                "flex items-center gap-3",
                expanded ? "" : "justify-center w-full"
              )}>
                {/* Icon for navigation item - always visible */}
                <div className={cn(
                  "transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                  expanded ? "group-hover:translate-x-0.5" : "scale-110 group-hover:scale-125"
                )}>
                  {item.icon}
                </div>
                {/* Text label - only visible when expanded */}
                <span className={cn(
                  "transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] whitespace-nowrap",
                  expanded 
                    ? "opacity-100 translate-x-0 group-hover:translate-x-0.5" 
                    : "opacity-0 -translate-x-8 absolute pointer-events-none"
                )}>
                  {item.title}
                </span>
              </div>
              {/* Badge (e.g. "30+") - only visible when expanded */}
              {item.badge && (
                <span className={cn(
                  "ml-auto text-xs font-medium px-2 py-0.5 rounded-full transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] dark:bg-[#4285F4]/15 dark:text-[#8ebbff]",
                  expanded ? "opacity-100 translate-x-0 group-hover:translate-x-0.5" : "opacity-0 translate-x-8 absolute"
                )}>
                  {item.badge}
                </span>
              )}
              {/* Active indicator chevron - only visible when expanded */}
              {item.isActive && (
                <ChevronRight className={cn(
                  "ml-auto h-4 w-4 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] dark:text-[#4285F4]",
                  expanded 
                    ? "opacity-100 translate-x-0 group-hover:translate-x-1" 
                    : "opacity-0 translate-x-8 absolute"
                )} />
              )}
            </Link>
          ))}
        </div>

        {/* Account navigation section */}
        <div>
          {/* "Account" section header - only visible when expanded */}
          <p className={cn(
            "mb-2 px-3 text-xs font-medium text-muted-foreground transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] dark:text-[#8aa2cc]",
            expanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
          )}>
            Account
          </p>
          {/* Account navigation items */}
          {accountNavItems.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center rounded-md text-sm font-medium group transition-all duration-200 relative",
                "hover:bg-muted/50 dark:hover:bg-slate-800/30 md-ripple",
                item.isActive 
                  ? "bg-primary/10 text-primary font-medium dark:bg-[#4285F4]/10 dark:text-[#8ebbff]" 
                  : "text-muted-foreground hover:text-foreground dark:text-[#a1b4d0] dark:hover:text-[#e6edf3]",
                "transition-all duration-300",
                expanded ? "py-2 px-3" : "py-3 px-3 my-1 mx-auto"
              )}
              style={{
                transitionDelay: `${(index + 1) * 40 + 100}ms`,
                transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)"
              }}
            >
              {/* Active indicator - only visible for active items */}
              {item.isActive && (
                <div 
                  className="absolute left-0 top-0 bottom-0 w-1 bg-primary dark:bg-[#4285F4] rounded-full my-1.5 transition-all duration-500 ease-out" 
                  style={{ 
                    opacity: expanded ? 1 : 0,
                    transform: expanded ? 'translateX(0)' : 'translateX(-4px)'
                  }}
                />
              )}
              
              <div className={cn(
                "flex items-center gap-3",
                expanded ? "" : "justify-center w-full"
              )}>
                {/* Icon for account item - always visible */}
                <div className={cn(
                  "transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                  expanded ? "group-hover:translate-x-0.5" : "scale-110 group-hover:scale-125"
                )}>
                  {item.icon}
                </div>
                {/* Text label - only visible when expanded */}
                <span className={cn(
                  "transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] whitespace-nowrap",
                  expanded 
                    ? "opacity-100 translate-x-0 group-hover:translate-x-0.5" 
                    : "opacity-0 -translate-x-8 absolute pointer-events-none"
                )}>
                  {item.title}
                </span>
              </div>
              {/* Active indicator chevron - only visible when expanded */}
              {item.isActive && (
                <ChevronRight className={cn(
                  "ml-auto h-4 w-4 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] dark:text-[#4285F4]",
                  expanded 
                    ? "opacity-100 translate-x-0 group-hover:translate-x-1" 
                    : "opacity-0 translate-x-8 absolute"
                )} />
              )}
            </Link>
          ))}
        </div>
      </nav>
      
      {/* Footer with copyright - partially visible when collapsed */}
      <div className="p-4 border-t border-[#21262d] text-center transition-all duration-300 ease-out">
        <p className={cn(
          "text-xs text-muted-foreground transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] dark:text-[#8aa2cc]",
          expanded ? "opacity-100 scale-100" : "opacity-0 scale-75"
        )}>
          PSADT Pro &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
} 