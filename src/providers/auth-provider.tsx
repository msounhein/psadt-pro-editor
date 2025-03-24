"use client";

import { SessionProvider } from "next-auth/react";

// This simplified auth provider allows bypassing auth for development
export default function AuthProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return <SessionProvider>{children}</SessionProvider>;
} 