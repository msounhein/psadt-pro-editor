// Script to check the template details in the database
const { PrismaClient } = require('@prisma/client');

// Initialize Prisma client
const prisma = new PrismaClient();

async function checkTemplate() {
  const templateId = 'd0e1af94-6cab-4d78-bb3a-fcb318e0ad86';
  
  try {
    // Get the template
    const template = await prisma.template.findUnique({
      where: { id: templateId }
    });
    
    if (!template) {
      console.log(`Template with ID ${templateId} not found`);
      return;
    }
    
    console.log('Template details:');
    console.log('----------------------------------------');
    console.log(`ID: ${template.id}`);
    console.log(`Name: ${template.name}`);
    console.log(`User ID: ${template.userId}`);
    console.log(`Version: ${template.version}`);
    console.log(`Extraction Status: ${template.extractionStatus}`);
    console.log(`Extraction Path: ${template.extractionPath}`);
    console.log(`Last Extraction Date: ${template.lastExtractionDate}`);
    console.log('----------------------------------------');
    
    // Parse and display metadata
    try {
      const metadata = JSON.parse(template.metadata || '{}');
      console.log('Metadata:');
      console.log(JSON.stringify(metadata, null, 2));
    } catch (err) {
      console.log('Metadata: Invalid JSON');
    }
  } catch (error) {
    console.error('Error checking template:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
checkTemplate()
  .then(() => console.log('Done'))
  .catch(err => console.error('Error:', err)); 