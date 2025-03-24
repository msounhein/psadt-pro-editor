// Script to list all templates in the database
const { PrismaClient } = require('@prisma/client');

// Initialize Prisma with the correct schema path
const prisma = new PrismaClient();

async function listTemplates() {
  try {
    console.log('Fetching all templates from the database...');
    
    // Get all templates
    const templates = await prisma.template.findMany();
    
    if (templates.length === 0) {
      console.log('No templates found in the database');
      return;
    }
    
    console.log(`Found ${templates.length} templates:`);
    
    // Display each template
    templates.forEach((template, index) => {
      console.log(`\n--- Template ${index + 1} ---`);
      console.log(`ID: ${template.id}`);
      console.log(`Name: ${template.name}`);
      console.log(`User ID: ${template.userId}`);
      console.log(`Version: ${template.version || 'N/A'}`);
      console.log(`Extraction Status: ${template.extractionStatus || 'N/A'}`);
      console.log(`Extraction Path: ${template.extractionPath || 'N/A'}`);
      
      // Parse and display metadata summary
      try {
        const metadata = JSON.parse(template.metadata || '{}');
        console.log('Metadata Summary:', Object.keys(metadata).join(', '));
      } catch (err) {
        console.log('Metadata: Invalid JSON');
      }
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
listTemplates()
  .then(() => console.log('\nDone'))
  .catch(err => console.error('Error:', err)); 