// Script to fix the template database record
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixTemplate() {
  console.log('Fixing template record...');
  
  try {
    // Get the current template
    const template = await prisma.template.findUnique({
      where: { id: '41a21636-e9fd-4054-adb1-dd52d4b449fc' }
    });
    
    if (!template) {
      console.error('Template not found!');
      return;
    }
    
    console.log('Found template:', template.name);
    
    // Parse and update metadata
    let metadata = {};
    try {
      metadata = JSON.parse(template.metadata || '{}');
    } catch (e) {
      console.log('Error parsing metadata, creating new object');
    }
    
    // Update extraction status in metadata
    metadata.extractionStatus = {
      status: 'complete',
      path: '9c2b6b42-4794-426f-a1c8-fc272970c1df/Default/PSAppDeployToolkit_Template_v4_v4.0.6',
      lastUpdated: new Date().toISOString()
    };
    
    // Update template record
    const updatedTemplate = await prisma.template.update({
      where: { id: '41a21636-e9fd-4054-adb1-dd52d4b449fc' },
      data: {
        extractionStatus: 'complete',
        extractionPath: '9c2b6b42-4794-426f-a1c8-fc272970c1df/Default/PSAppDeployToolkit_Template_v4_v4.0.6',
        lastExtractionDate: new Date(),
        metadata: JSON.stringify(metadata)
      }
    });
    
    console.log('Template updated successfully:', updatedTemplate.name);
    console.log('New extraction status:', updatedTemplate.extractionStatus);
    console.log('New extraction path:', updatedTemplate.extractionPath);
    
  } catch (error) {
    console.error('Error updating template:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixTemplate();
