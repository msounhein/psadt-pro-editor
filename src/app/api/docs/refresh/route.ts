import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import { createLogger } from '@/lib/logger';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const logger = createLogger('api/docs/refresh/route.ts');

/**
 * POST handler for refreshing documentation by running the PowerShell script
 */
export async function POST(request: NextRequest) {
  const postHandler = logger.forFunction('POST');
  
  try {
    // Get user session with authOptions
    const session = await getServerSession(authOptions);
    
    // Require authentication for all requests
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    postHandler.info(`Starting documentation refresh for user: ${userId}`);
    
    // Path to the PowerShell script
    const scriptPath = path.join(process.cwd(), 'scripts', 'fetch-documentation.ps1');
    
    // Execute the PowerShell script
    const { success, output } = await runPowerShellScript(scriptPath);
    
    if (success) {
      postHandler.info('Documentation refresh completed successfully');
      return NextResponse.json({
        success: true,
        message: 'Documentation refreshed successfully',
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