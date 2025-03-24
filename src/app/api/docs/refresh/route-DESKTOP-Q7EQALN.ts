import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import { createLogger } from '@/lib/logger';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPsadtQdrantDb } from '@/lib/psadt-qdrant-db';

const logger = createLogger('api/docs/refresh/route.ts');

/**
 * POST handler for refreshing documentation by running the PowerShell script
 * and syncing the data to Prisma and Qdrant databases
 */
export async function POST(request: NextRequest) {
  const postHandler = logger.forFunction('POST');
  
  try {
    // Get user session with authOptions
    const session = await getServerSession(authOptions);
    
    // Add extensive logging for debugging
    postHandler.info(`Authentication attempt with session: ${!!session}`);
    postHandler.info(`Request headers: ${JSON.stringify(request.headers)}`);
    postHandler.info(`Cookies: ${request.headers.get('cookie')}`);
    
    if (session) {
      postHandler.info(`User in session: ${session.user?.email || 'unknown'}`);
      postHandler.info(`User ID: ${session.user?.id || 'unknown'}`);
    } else {
      postHandler.warn('No session found');
    }
    
    // Check for Authorization header as fallback
    const authHeader = request.headers.get('Authorization');
    let tokenUserId = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      tokenUserId = authHeader.substring(7);
      postHandler.info(`Found Authorization header with token: ${tokenUserId}`);
    }
    
    // Require authentication for all requests (either session or token)
    if (!session?.user?.id && !tokenUserId) {
      postHandler.warn('Unauthorized access attempt - no valid session or token');
      return NextResponse.json(
        { error: "Unauthorized - Please sign in to refresh documentation" },
        { status: 401 }
      );
    }
    
    // Use the token ID if no session
    const userId = session?.user?.id || tokenUserId;
    postHandler.info(`Using user ID: ${userId}`);
    
    postHandler.info(`Starting documentation refresh for user: ${userId}`);
    
    // Path to the PowerShell script
    const scriptPath = path.join(process.cwd(), 'scripts', 'fetch-documentation.ps1');
    
    // Execute the PowerShell script which now includes database import
    const { success, output } = await runPowerShellScript(scriptPath);
    
    if (success) {
      postHandler.info('Documentation refresh and database import completed successfully');
      
      // The database sync is now handled by the import-docs-to-db.js script called by the PowerShell script
      // But we'll manually trigger a refresh of the Qdrant search index just to be safe
      try {
        const qdrantDb = getPsadtQdrantDb();
        await qdrantDb.syncCommandsToQdrant();
        postHandler.info('Additional Qdrant sync completed successfully');
        
        // Clear the document cache to ensure fresh content
        try {
          const { clearCache } = await import('../route');
          clearCache(); // Clear all caches
          postHandler.info('Documentation cache cleared successfully');
        } catch (cacheError) {
          postHandler.warn('Error clearing documentation cache', { error: cacheError });
          // We still continue even if cache clearing fails
        }
      } catch (qdrantError) {
        postHandler.warn('Additional Qdrant sync produced an error', { error: qdrantError });
        // We don't fail the whole operation if just this part fails
      }
      
      return NextResponse.json({
        success: true,
        message: 'Documentation refreshed and imported to database successfully',
        output
      });
    } else {
      postHandler.error('Documentation refresh failed', { output });
      return NextResponse.json({
        success: false,
        error: 'Failed to refresh documentation',
        output
      }, { status: 500 });
    }
  } catch (error) {
    postHandler.error('Error in refresh process', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

/**
 * Helper function to run a PowerShell script and return the result
 */
async function runPowerShellScript(scriptPath: string, args: string = ''): Promise<{ success: boolean, output: string }> {
  const execLogger = logger.forFunction('runPowerShellScript');
  
  return new Promise((resolve) => {
    const command = `powershell.exe -ExecutionPolicy Bypass -File "${scriptPath}" ${args}`;
    
    execLogger.info(`Executing PowerShell script: ${command}`);
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        execLogger.error(`PowerShell execution error: ${error.message}`, { stderr });
        resolve({
          success: false,
          output: stderr || error.message
        });
        return;
      }
      
      if (stderr) {
        execLogger.warn(`PowerShell stderr: ${stderr}`);
      }
      
      execLogger.info('PowerShell script executed successfully');
      resolve({
        success: true,
        output: stdout
      });
    });
  });
}