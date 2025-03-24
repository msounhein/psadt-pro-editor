import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    // Create necessary directories if they don't exist
    const psadtPath = process.env.PSADT_PATH || path.join(process.cwd(), 'psadt');
    const templatesPath = process.env.TEMPLATES_PATH || path.join(process.cwd(), 'templates');
    const uploadsPath = process.env.UPLOADS_PATH || path.join(process.cwd(), 'uploads');
    
    const directories = [psadtPath, templatesPath, uploadsPath];
    
    for (const dir of directories) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Directories set up successfully',
      paths: {
        psadt: psadtPath,
        templates: templatesPath,
        uploads: uploadsPath,
      },
    });
  } catch (error: any) {
    console.error('Error setting up directories:', error);
    return NextResponse.json(
      { error: 'Failed to set up directories' },
      { status: 500 }
    );
  }
} 