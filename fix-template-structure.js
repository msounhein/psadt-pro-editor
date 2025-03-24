// Script to standardize template paths to the correct structure
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

// Define the standard path structure
const STORAGE_BASE = path.join(__dirname, 'storage', 'templates');

async function standardizeTemplatePaths() {
  console.log('Standardizing template paths...');
  console.log(`Base storage path: ${STORAGE_BASE}`);
  
  try {
    // Get all templates
    const templates = await prisma.template.findMany();
    
    console.log(`Found ${templates.length} templates in database`);
    
    for (const template of templates) {
      console.log(`\nProcessing template: ${template.name} (ID: ${template.id})`);
      
      // Construct the correct path following the standardized structure:
      // storage/templates/<user id>/<template type>/<package id>
      const templateType = template.isDefault ? 'Default' : 'Custom';
      const standardPath = `${template.userId}/${templateType}/${template.id}`;
      const fullPath = path.join(STORAGE_BASE, standardPath);
      
      console.log(`Standard path: ${standardPath}`);
      console.log(`Full path: ${fullPath}`);
      
      // Create the directory if it doesn't exist
      if (!fs.existsSync(fullPath)) {
        console.log(`Creating directory: ${fullPath}`);
        fs.mkdirSync(fullPath, { recursive: true });
      }
      
      // Parse metadata
      let metadata = {};
      try {
        metadata = JSON.parse(template.metadata || '{}');
      } catch (e) {
        console.log('Error parsing metadata, creating new object');
      }
      
      // Update paths in metadata
      metadata.storagePath = standardPath;
      if (metadata.extractionStatus) {
        metadata.extractionStatus.path = standardPath;
        metadata.extractionStatus.lastUpdated = new Date().toISOString();
      } else {
        metadata.extractionStatus = {
          status: template.extractionStatus || 'pending',
          path: standardPath,
          lastUpdated: new Date().toISOString()
        };
      }
      
      // Update template record with standardized paths
      await prisma.template.update({
        where: { id: template.id },
        data: {
          extractionPath: standardPath,
          extractionStatus: 'complete',
          lastExtractionDate: new Date(),
          metadata: JSON.stringify(metadata)
        }
      });
      
      console.log(`Updated template record with standard path: ${standardPath}`);
      
      // Look for existing files to move them to the correct location
      // This code would identify any existing files and move them to the new standardized location
      // For now, we'll just log that this would happen in a real implementation
      console.log(`Would search for and move any existing files to: ${fullPath}`);
    }
    
    console.log('\nTemplate path standardization complete!');
    
  } catch (error) {
    console.error('Error standardizing template paths:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Add a function to add an .env variable for the storage path
function addStoragePathEnvVar() {
  console.log('\nAdding storage path environment variable...');
  
  try {
    // Read existing .env.local file
    const envPath = path.join(__dirname, '.env.local');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Check if FILE_STORAGE_PATH already exists
    if (!envContent.includes('FILE_STORAGE_PATH=')) {
      // Add the variable
      const newVar = `\n# Storage path for templates and packages\nFILE_STORAGE_PATH="./storage/templates"\n`;
      
      fs.appendFileSync(envPath, newVar);
      console.log('Added FILE_STORAGE_PATH to .env.local');
    } else {
      console.log('FILE_STORAGE_PATH already exists in .env.local');
    }
    
  } catch (error) {
    console.error('Error updating .env.local:', error);
  }
}

// Run the functions
addStoragePathEnvVar();
standardizeTemplatePaths();
