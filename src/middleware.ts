import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// This middleware protects routes that require authentication
export async function middleware(request: NextRequest) {
  // Skip authentication for development environment to use mock user
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next()
  }

  const { pathname } = request.nextUrl
  
  // Skip auth routes
  if (pathname.startsWith('/auth') || 
      pathname.startsWith('/api/auth') || 
      pathname.startsWith('/_next') || 
      pathname.includes('.') ||
      pathname === '/favicon.ico') {
    return NextResponse.next()
  }

  // Check if the user is authenticated
  const token = await getToken({ req: request })
  
  // If not authenticated and not trying to access API routes, redirect to signin
  if (!token && !pathname.startsWith('/api/')) {
    const url = new URL('/auth/signin', request.url)
    url.searchParams.set('callbackUrl', encodeURI(request.url))
    return NextResponse.redirect(url)
  }

  // For API routes without token, let the API handle authentication
  // This allows API routes to return proper 401 responses
  return NextResponse.next()
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: [
    '/', 
    '/auth/:path*',
    '/account/:path*',
  ],
} 