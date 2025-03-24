"use client"

import React from 'react'
import { ThemeProvider } from '@/components/ui/theme-provider'
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AuthProvider from "@/providers/auth-provider"
import { Toaster } from "@/components/ui/toaster"

// Create a client
const queryClient = new QueryClient()

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster />
        </QueryClientProvider>
      </ThemeProvider>
    </AuthProvider>
  )
} 