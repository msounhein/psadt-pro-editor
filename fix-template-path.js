// Script to fix the template path in the database record
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixTemplate() {
  console.log('Fixing template path...');
  
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
    
    // Parse metadata
    let metadata = {};
    try {
      metadata = JSON.parse(template.metadata || '{}');
    } catch (e) {
      console.log('Error parsing metadata, creating new object');
    }
    
    // Update the path in metadata (remove version number)
    const newPath = '9c2b6b42-4794-426f-a1c8-fc272970c1df/Default/PSAppDeployToolkit_Template_v4';
    
    metadata.storagePath = newPath;
    
    // Update extraction status in metadata
    if (metadata.extractionStatus) {
      metadata.extractionStatus.path = newPath;
      metadata.extractionStatus.lastUpdated = new Date().toISOString();
    } else {
      metadata.extractionStatus = {
        status: 'complete',
        path: newPath,
        lastUpdated: new Date().toISOString()
      };
    }
    
    // Update template record
    const updatedTemplate = await prisma.template.update({
      where: { id: '41a21636-e9fd-4054-adb1-dd52d4b449fc' },
      data: {
        extractionPath: newPath,
        metadata: JSON.stringify(metadata)
      }
    });
    
    console.log('Template path updated successfully:', updatedTemplate.name);
    console.log('New extraction path:', updatedTemplate.extractionPath);
    console.log('Updated metadata:', updatedTemplate.metadata);
    
  } catch (error) {
    console.error('Error updating template path:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixTemplate();
