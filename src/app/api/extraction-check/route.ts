import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { createLogger } from '@/lib/logger';
import { PrismaClient } from '@prisma/client';

const logger = createLogger('api/extraction-check/route.ts');
const prisma = new PrismaClient();

// Storage path for downloaded files
const STORAGE_PATH = process.env.FILE_STORAGE_PATH || './storage/templates';

/**
 * GET handler to check for any pending extractions that have actually completed
 * This works by scanning the storage directory for extraction_complete marker files
 */
export async function GET(request: NextRequest) {
  const getHandler = logger.forFunction('GET');
  try {
    // Find all templates with pending extraction status
    const pendingTemplates = await prisma.template.findMany({
      where: {
        metadata: {
          contains: '"status":"pending"'
        },
      },
    });

    getHandler.info(`Found ${pendingTemplates.length} templates with pending extraction status`);

    const updatedTemplates = [];

    // Check each pending template
    for (const template of pendingTemplates) {
      try {
        const metadata = JSON.parse(template.metadata || '{}');
        const extractionPath = metadata.extractionStatus?.path;
        
        if (!extractionPath) {
          getHandler.warn(`Template ${template.id} has pending status but no extraction path`);
          continue;
        }

        // Build paths to check
        const parentDir = path.dirname(path.join(STORAGE_PATH, extractionPath));
        
        // Check for any extraction_complete markers in this directory
        const dirContents = fs.readdirSync(parentDir);
        const markerFiles = dirContents.filter(file => 
          file.startsWith('.extraction_complete_') ||
          file === '.extraction_complete');
        
        getHandler.info(`Checking template ${template.id}`, {
          extractionPath,
          parentDir,
          markerFilesFound: markerFiles.length,
          dirContents
        });

        if (markerFiles.length > 0) {
          // We found a marker file, indicating extraction completed successfully
          getHandler.info(`Found completion marker for template ${template.id}`, {
            markerFiles
          });

          // Find the most recent marker file to get the correct extraction path
          const mostRecentMarker = markerFiles.sort().pop() || '';
          const markerPath = path.join(parentDir, mostRecentMarker);
          const markerContent = fs.readFileSync(markerPath, 'utf8');

          getHandler.info(`Marker file content for template ${template.id}:`, {
            markerContent
          });

          // Get the versioned folder name
          const versionedDirName = path.basename(extractionPath).endsWith(`_v${metadata.version}`) 
            ? path.basename(extractionPath)
            : `${path.basename(extractionPath)}_v${metadata.version}`;

          // Update the template status to 'complete'
          metadata.extractionStatus = {
            status: 'complete',
            path: extractionPath,
            lastUpdated: new Date().toISOString()
          };

          await prisma.template.update({
            where: { id: template.id },
            data: { metadata: JSON.stringify(metadata) }
          });

          updatedTemplates.push(template.id);
        }
      } catch (err) {
        getHandler.error(`Error checking template ${template.id}`, {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return NextResponse.json({
      success: true,
      pendingTemplatesChecked: pendingTemplates.length,
      templatesUpdated: updatedTemplates.length,
      updatedTemplateIds: updatedTemplates
    });
  } catch (error) {
    getHandler.error('Error checking extractions', {
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
} 