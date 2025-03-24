import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';

const logger = createLogger('api/extraction-status/route.ts');

// Storage path for downloaded files
const STORAGE_PATH = process.env.FILE_STORAGE_PATH || './storage/templates';

/**
 * GET handler for checking the extraction status of a template
 * Expected query params:
 * - templateId: The ID of the template to check
 */
export async function GET(request: NextRequest) {
  const getHandler = logger.forFunction('GET');
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const templateId = searchParams.get('templateId');
    
    if (!templateId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing templateId parameter'
      }, { status: 400 });
    }
    
    getHandler.info(`Checking extraction status for template: ${templateId}`);
    
    // Get template record
    const template = await prisma.template.findUnique({
      where: { id: templateId }
    });
    
    if (!template) {
      return NextResponse.json({ 
        success: false, 
        error: 'Template not found'
      }, { status: 404 });
    }
    
    // First check if we have the new extraction status fields
    let storagePath: string | null = null;
    
    if (template.extractionPath) {
      // Use new fields if available
      storagePath = template.extractionPath;
      getHandler.info(`Using extractionPath column: ${storagePath}`);
    } else {
      // Fall back to metadata for older records
      try {
        const metadata = JSON.parse(template.metadata || '{}');
        storagePath = metadata.storagePath || metadata.extractionStatus?.path;
        getHandler.info(`Using path from metadata: ${storagePath}`);
      } catch (err) {
        getHandler.error(`Failed to parse template metadata: ${err}`);
      }
    }
    
    if (!storagePath) {
      return NextResponse.json({ 
        success: false, 
        error: 'Template storage path not found',
        template
      }, { status: 404 });
    }
    
    // Check if extraction directory exists
    const fullPath = path.join(STORAGE_PATH, storagePath);
    const extractionStatus = {
      templateId,
      templateName: template.name,
      version: template.version,
      status: template.extractionStatus || 'unknown',
      isExtracted: fs.existsSync(fullPath),
      directoryExists: fs.existsSync(fullPath),
      fileCount: 0,
      extractionPath: fullPath,
      lastChecked: new Date().toISOString(),
      lastExtractionDate: template.lastExtractionDate?.toISOString() || null
    };
    
    // If directory exists, count files
    if (extractionStatus.directoryExists) {
      try {
        const files = fs.readdirSync(fullPath);
        extractionStatus.fileCount = files.length;
      } catch (err) {
        getHandler.error(`Failed to read extraction directory: ${err}`);
      }
    }
    
    getHandler.info(`Extraction status for template ${templateId}:`, extractionStatus);
    
    return NextResponse.json({
      success: true,
      status: extractionStatus
    });
  } catch (error) {
    getHandler.error('Error checking extraction status', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 });
  }
}

/**
 * POST handler for updating the extraction status of a template
 * Used by background processes to update the status after extraction completes
 */
export async function POST(request: NextRequest) {
  const postHandler = logger.forFunction('POST');
  
  try {
    const body = await request.json();
    const { templateId, status, extractionPath } = body;
    
    if (!templateId) {
      postHandler.error('Missing templateId parameter');
      return NextResponse.json({ 
        success: false, 
        error: 'Missing templateId parameter'
      }, { status: 400 });
    }
    
    postHandler.info(`Updating extraction status for template: ${templateId}`, { status, extractionPath });
    
    // Get template record
    const template = await prisma.template.findUnique({
      where: { id: templateId }
    });
    
    if (!template) {
      postHandler.error(`Template not found: ${templateId}`);
      return NextResponse.json({ 
        success: false, 
        error: 'Template not found'
      }, { status: 404 });
    }
    
    postHandler.info(`Found template: ${template.name}`);
    
    // Handle case when extraction path is just the folder name without user ID
    let fullExtractionPath = extractionPath;
    if (!extractionPath.includes('/') && !extractionPath.includes('\\')) {
      // If it's just a folder name, prepend the user ID path
      const userId = template.userId;
      fullExtractionPath = `${userId}/Default/${extractionPath}`;
      postHandler.info(`Converted relative path to full path: ${fullExtractionPath}`);
    }
    
    // Update both the dedicated columns and the metadata for backward compatibility
    let metadata: any = {};
    try {
      metadata = JSON.parse(template.metadata || '{}');
      
      // Update metadata for backward compatibility
      metadata.extractionStatus = {
        status,
        path: fullExtractionPath,
        lastUpdated: new Date().toISOString()
      };
      
      postHandler.info(`Updated metadata with extraction status`);
    } catch (err) {
      postHandler.error(`Failed to parse template metadata: ${err}`);
      // Continue anyway since we're moving to dedicated columns
    }
    
    // Update template record with both new columns and updated metadata
    const updatedTemplate = await prisma.template.update({
      where: { id: templateId },
      data: {
        extractionStatus: status,
        extractionPath: fullExtractionPath,
        lastExtractionDate: new Date(),
        metadata: JSON.stringify(metadata)
      }
    });
    
    postHandler.info(`Successfully updated extraction status for template ${templateId}`, {
      status,
      path: fullExtractionPath
    });
    
    return NextResponse.json({
      success: true,
      template: updatedTemplate
    });
  } catch (error) {
    postHandler.error('Error updating extraction status', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 });
  }
} 