import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';

export async function POST(req: NextRequest) {
  try {
    const { version } = await req.json();
    
    if (!version) {
      return NextResponse.json(
        { error: 'Version is required' },
        { status: 400 }
      );
    }

    // Get the PSADT path from environment variables or use a default
    const psadtPath = process.env.PSADT_PATH || path.join(process.cwd(), 'psadt');
    
    // Create the directory if it doesn't exist
    if (!fs.existsSync(psadtPath)) {
      fs.mkdirSync(psadtPath, { recursive: true });
    }
    
    // Download the file (in a real implementation, you would handle the zip download and extraction)
    const downloadUrl = `https://github.com/PSAppDeployToolkit/PSAppDeployToolkit/archive/refs/tags/${version}.zip`;
    const tempPath = path.join(psadtPath, `${version}.zip`);
    
    const response = await axios({
      method: 'GET',
      url: downloadUrl,
      responseType: 'stream',
    });
    
    // Save the file
    await pipeline(response.data, fs.createWriteStream(tempPath));
    
    // In a real implementation, you would extract the ZIP file here
    // For simplicity, we're skipping that part in this example
    
    return NextResponse.json({ 
      success: true, 
      message: 'PSADT downloaded successfully',
      path: tempPath
    });
  } catch (error: any) {
    console.error('Error downloading PSADT:', error);
    return NextResponse.json(
      { error: 'Failed to download PSADT' },
      { status: 500 }
    );
  }
} 