import '@/app/globals.css';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/providers';
import { Sidebar } from '@/components/sidebar';
import { Navbar } from '@/components/navbar';
import { setupLogger } from "@/lib/loggerConfig";
import { cn } from "@/lib/utils";

// Initialize logger
setupLogger();

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata = {
  title: {
    default: 'PSADT Pro',
    template: '%s | PSADT Pro',
  },
  description: 'Modern web interface for PSADT',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet" />
      </head>
      <body
        className={cn(
          "min-h-screen bg-background font-google antialiased",
          inter.variable
        )}
      >
        <Providers>
          <div className="flex h-screen overflow-hidden p-2 gap-2">
            <Sidebar />
            <div className="flex-1 flex flex-col h-screen">
              <Navbar />
              <main className="flex-1 overflow-auto rounded-xl bg-muted/30 p-4">
                {children}
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
