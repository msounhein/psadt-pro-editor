// Script to create a template with extraction status set to complete
const { PrismaClient } = require('@prisma/client');

// Initialize Prisma client
const prisma = new PrismaClient();

async function createTemplate() {
  const userId = '01d7a616-e40c-44fc-9819-a95ae27aab89';
  const extractionPath = `${userId}/Default/PSAppDeployToolkit_Template_v4_v4.0.6`;
  
  try {
    console.log('Creating template with complete extraction status...');
    
    // First create a user if it doesn't exist
    let user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      console.log(`Creating user with ID ${userId}...`);
      user = await prisma.user.create({
        data: {
          id: userId,
          email: 'user@example.com',
          name: 'Example User',
          password: 'password123' // In a real app, this would be hashed
        }
      });
      console.log('User created:', user);
    } else {
      console.log('User already exists:', user);
    }
    
    // Prepare metadata
    const metadata = {
      files: [
        {
          name: "PSAppDeployToolkit_Template_v4.zip",
          path: "releases/4.0.6/PSAppDeployToolkit_Template_v4.zip",
          url: "https://github.com/PSAppDeployToolkit/PSAppDeployToolkit/releases/download/4.0.6/PSAppDeployToolkit_Template_v4.zip"
        }
      ],
      isDefault: true,
      version: "4.0.6",
      storagePath: extractionPath,
      extractionStatus: {
        status: "complete",
        path: extractionPath,
        lastUpdated: new Date().toISOString()
      }
    };
    
    // Create the template
    const template = await prisma.template.create({
      data: {
        id: 'd0e1af94-6cab-4d78-bb3a-fcb318e0ad86',
        name: 'PSAppDeployToolkit_Template_v4',
        packageType: 'PowerShellAppDeploymentToolkit',
        userId: userId,
        isPublic: true,
        isDefault: true,
        version: '4.0.6',
        storagePath: extractionPath,
        extractionStatus: 'complete',
        extractionPath: extractionPath,
        lastExtractionDate: new Date(),
        metadata: JSON.stringify(metadata)
      }
    });
    
    console.log('Template created successfully:');
    console.log(`ID: ${template.id}`);
    console.log(`Name: ${template.name}`);
    console.log(`User ID: ${template.userId}`);
    console.log(`Version: ${template.version}`);
    console.log(`Extraction Status: ${template.extractionStatus}`);
    console.log(`Extraction Path: ${template.extractionPath}`);
  } catch (error) {
    console.error('Error creating template:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
createTemplate()
  .then(() => console.log('Done'))
  .catch(err => console.error('Error:', err)); 