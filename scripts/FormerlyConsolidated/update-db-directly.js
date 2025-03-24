// Script to update the template extraction status directly in the database
const { PrismaClient } = require('@prisma/client');
const path = require('path');

// Initialize Prisma with the correct schema path
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'file:../prisma/dev.db'
    }
  }
});

async function updateTemplateExtractionStatus() {
  const templateId = 'd0e1af94-6cab-4d78-bb3a-fcb318e0ad86';
  const userId = '01d7a616-e40c-44fc-9819-a95ae27aab89';
  const extractionPath = `${userId}/Default/PSAppDeployToolkit_Template_v4_v4.0.6`;
  
  try {
    console.log(`Updating template ${templateId} extraction status to 'complete'`);
    console.log(`Current directory: ${process.cwd()}`);
    
    // Get the current template
    const currentTemplate = await prisma.template.findUnique({
      where: { id: templateId }
    });
    
    if (!currentTemplate) {
      console.error(`Template with ID ${templateId} not found`);
      return;
    }
    
    console.log('Current template data:', currentTemplate);
    
    // Parse metadata
    let metadata = {};
    try {
      metadata = JSON.parse(currentTemplate.metadata || '{}');
      
      // Update metadata extractionStatus
      metadata.extractionStatus = {
        status: 'complete',
        path: extractionPath,
        lastUpdated: new Date().toISOString()
      };
      
      console.log('Updated metadata:', metadata);
    } catch (err) {
      console.error('Error parsing metadata:', err);
    }
    
    // Update the template
    const updatedTemplate = await prisma.template.update({
      where: { id: templateId },
      data: {
        extractionStatus: 'complete',
        extractionPath: extractionPath,
        lastExtractionDate: new Date(),
        metadata: JSON.stringify(metadata)
      }
    });
    
    console.log('Template updated successfully:', updatedTemplate);
  } catch (error) {
    console.error('Error updating template:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update function
updateTemplateExtractionStatus()
  .then(() => console.log('Done'))
  .catch(err => console.error('Error:', err)); 