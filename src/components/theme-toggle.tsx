"use client"

import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { Moon, Sun } from "lucide-react"

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="rounded-full hover:bg-muted/50 dark:hover:bg-slate-800/30 md-ripple transition-colors duration-200"
        >
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 dark:text-[#a1b4d0]" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 dark:text-[#a1b4d0]" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="font-google dark:bg-[#161b22] dark:border-[#30363d]">
        <DropdownMenuItem 
          onClick={() => setTheme("light")}
          className={`cursor-pointer ${theme === 'light' ? 'dark:bg-[#4285F4]/10 dark:text-[#8ebbff]' : 'dark:text-[#a1b4d0]'} dark:hover:text-[#e6edf3] dark:focus:text-[#e6edf3] dark:hover:bg-slate-800/30`}
        >
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("dark")}
          className={`cursor-pointer ${theme === 'dark' ? 'dark:bg-[#4285F4]/10 dark:text-[#8ebbff]' : 'dark:text-[#a1b4d0]'} dark:hover:text-[#e6edf3] dark:focus:text-[#e6edf3] dark:hover:bg-slate-800/30`}
        >
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("system")}
          className={`cursor-pointer ${theme === 'system' ? 'dark:bg-[#4285F4]/10 dark:text-[#8ebbff]' : 'dark:text-[#a1b4d0]'} dark:hover:text-[#e6edf3] dark:focus:text-[#e6edf3] dark:hover:bg-slate-800/30`}
        >
          <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 