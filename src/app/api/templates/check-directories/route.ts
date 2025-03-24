import { NextRequest, NextResponse } from "next/server";
import { ensureAllTemplateDirectories } from '@/lib/filesystem/ensure-template-directories';

/**
 * GET - Checks and ensures all template directories exist
 * This API route runs a check on all template directories
 * and creates any missing directories or default files
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log("[CHECK API] Starting template directory verification");
    
    // Check all template directories
    const count = await ensureAllTemplateDirectories();
    
    return NextResponse.json({
      success: true,
      message: `Processed ${count} templates`,
      count
    });
  } catch (error) {
    console.error('[CHECK API] Error checking template directories:', error);
    return NextResponse.json(
      { error: 'Failed to check template directories', message: String(error) },
      { status: 500 }
    );
  }
} 