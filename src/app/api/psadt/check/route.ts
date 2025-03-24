import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    // Get the PSADT path from environment variables or use a default
    const psadtPath = process.env.PSADT_PATH || path.join(process.cwd(), 'psadt');
    
    // Check if the directory exists
    const exists = fs.existsSync(psadtPath);
    
    // Return the result
    return NextResponse.json({ exists });
  } catch (error: any) {
    console.error('Error checking PSADT existence:', error);
    return NextResponse.json(
      { error: 'Failed to check PSADT existence' },
      { status: 500 }
    );
  }
} 