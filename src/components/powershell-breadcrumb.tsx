import React from 'react';
import Link from 'next/link';
import { ChevronRight, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface PowerShellPathSegment {
  label: string;
  href: string;
}

interface PowerShellBreadcrumbProps {
  segments: PowerShellPathSegment[];
  className?: string;
}

export function PowerShellBreadcrumb({ segments, className }: PowerShellBreadcrumbProps) {
  return (
    <div className={cn('flex items-center text-sm font-google', className)}>
      <motion.div 
        className="flex items-center text-white overflow-x-auto md-elevation-1 whitespace-nowrap dark:bg-[#161b22] rounded-lg px-3 py-1.5 min-w-[250px] border dark:border-[#30363d]"
        initial={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        >
          <Terminal className="mr-2 h-4 w-4 text-[#4285F4]" />
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div 
            className="flex items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {segments.map((segment, index) => (
              <motion.div
                key={segment.label}
                className="flex items-center"
                initial={{ opacity: 0, x: -10, filter: 'blur(8px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                transition={{
                  duration: 0.3,
                  delay: index * 0.15,
                  ease: "easeOut"
                }}
              >
                {index === 0 ? (
                  <motion.span 
                    className="text-[#8ebbff] font-medium cursor-default"
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    {segment.label}
                  </motion.span>
                ) : (
                  <>
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.2, delay: index * 0.15 }}
                    >
                      <ChevronRight className="mx-1 h-4 w-4 text-muted-foreground dark:text-[#8aa2cc]" />
                    </motion.div>
                    <Link 
                      href={segment.href}
                      className="relative text-muted-foreground dark:text-[#a1b4d0] hover:text-foreground dark:hover:text-[#e6edf3] transition-colors duration-200"
                    >
                      <motion.span
                        className="relative inline-block"
                        whileHover={{ scale: 1.02 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        {segment.label}
                        <motion.div
                          className="absolute -bottom-0.5 left-0 w-full h-[2px] bg-[#4285F4] dark:bg-[#8ebbff] origin-left"
                          initial={{ scaleX: 0 }}
                          whileHover={{ scaleX: 1 }}
                          transition={{ duration: 0.2 }}
                        />
                      </motion.span>
                    </Link>
                  </>
                )}
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        <motion.div 
          className="ml-2 w-1 h-4 bg-[#4285F4] dark:bg-[#8ebbff] inline-block"
          animate={{ 
            opacity: [1, 0.2],
            scale: [1, 0.98]
          }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut"
          }}
        />
      </motion.div>
    </div>
  );
}

// Create segments for the path
export function createPathSegments(path: string): PowerShellPathSegment[] {
  // Default structure for our navigation
  const segments: PowerShellPathSegment[] = [
    { label: 'PSADT_Pro', href: '/' },
  ];
  
  // Add path segments based on the current path
  if (path.includes('templates')) {
    segments.push({
      label: 'Templates',
      href: '/templates',
    });
  }
  
  // If we're at the default-template page, add it to the path
  if (path.includes('default-template')) {
    segments.push({
      label: 'Default_Templates',
      href: '/default-template',
    });
  }
  
  // If we're at the documentation page, add it to the path
  if (path.includes('documentation')) {
    segments.push({
      label: 'Documentation',
      href: '/documentation',
    });
  }

  if (path.includes('ide')) {
    segments.push({
      label: 'PowerShell IDE',
      href: '/ide',
    });
  }
  
  
  return segments;
} 