import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from '@prisma/client';
import { createLogger } from "@/lib/logger";
import crypto from 'crypto';
import axios from 'axios';

// Initialize Prisma client
const prisma = new PrismaClient();
const logger = createLogger('api/templates/default/route.ts');

/**
 * Handler for processing a default template 
 * This would typically:
 * 1. Create a new template in the database
 * 2. Associate it with the user
 * 3. Process any downloaded files
 */
export async function POST(request: NextRequest) {
  const postHandler = logger.forFunction('POST');
  
  try {
    // Get user session with authOptions
    const session = await getServerSession(authOptions);
    
    // Require authentication for all requests
    if (!session?.user?.id) {
      postHandler.warn(`Unauthorized access attempt`);
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    const body = await request.json();
    const { templateName, templateType = 'standard', version = 'latest', fileCount = 0 } = body;
    
    postHandler.info(`Creating template with data:`, { 
      templateName, 
      templateType, 
      version, 
      fileCount, 
      userId 
    });
    
    // Make sure template name exists
    if (!templateName) {
      postHandler.warn(`No template name provided`);
      return NextResponse.json({
        success: false,
        error: 'Template name is required'
      }, { status: 400 });
    }
    
    // Get the origin for API calls
    const origin = request.headers.get('origin') || 'http://localhost:3000';
    
    // Create the template in the database
    const template = await prisma.template.create({
      data: {
        id: crypto.randomUUID(),
        name: templateName,
        packageType: templateType,
        userId: userId,
        isPublic: false,
        isDefault: true,
        type: "Default", // Set the type field to Default
        version: version,
        metadata: JSON.stringify({
          files: [
            {
              name: `${templateName}.zip`,
              path: `releases/${version}/${templateName}.zip`,
              url: `https://github.com/PSAppDeployToolkit/PSAppDeployToolkit/releases/download/${version}/${templateName}.zip`
            }
          ],
          isDefault: true,
          version: version,
          storagePath: `${userId}/Default/${templateName}_v${version}`
        })
      }
    });
    
    postHandler.info(`Successfully created template in database:`, {
      id: template.id,
      name: template.name,
      description: template.description,
      metadata: template.metadata,
      version: template.version,
      storagePath: template.storagePath
    });
    
    // Initialize the extraction status
    const templateId = template.id;
    const metadata = JSON.parse(template.metadata || '{}');
    
    metadata.extractionStatus = {
      status: 'pending',
      path: metadata.storagePath,
      lastUpdated: new Date().toISOString()
    };
    
    // Update template with extraction status
    await prisma.template.update({
      where: { id: templateId },
      data: { metadata: JSON.stringify(metadata) }
    });
    
    postHandler.info(`Initialized extraction status for template ${templateId}`);
    
    // Check if the extraction might have already completed before we created the template
    try {
      postHandler.info(`Checking if extraction already completed for template ${templateId}`);
      const origin = request.headers.get('origin') || 'http://localhost:3000';
      
      // Make request to extraction-check endpoint
      const extractionCheckUrl = `${origin}/api/extraction-check`;
      
      // Use axios instead of fetch for consistency
      const axios = require('axios');
      const checkResponse = await axios.get(extractionCheckUrl);
      
      if (checkResponse.data.updatedTemplateIds?.includes(templateId)) {
        postHandler.info(`Extraction was already completed for template ${templateId}`);
      } else {
        postHandler.info(`No pre-existing extraction found for template ${templateId}`);
      }
    } catch (checkError) {
      postHandler.warn(`Error checking extraction status: ${checkError instanceof Error ? checkError.message : String(checkError)}`);
    }
    
    postHandler.info(`Created default template "${templateName}" with ${fileCount} files for user ${userId}`);
    
    return NextResponse.json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        type: templateType,
        version: version,
        fileCount: fileCount,
        extractionStatus: metadata.extractionStatus
      }
    });
  } catch (error) {
    postHandler.error(`Error creating template:`, {
      error: error instanceof Error ? error.message : String(error)
    });
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
} 