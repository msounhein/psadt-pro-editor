// Script to clean up zip files in template directories
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

// Define the standard path structure
const STORAGE_BASE = path.join(__dirname, 'storage', 'templates');

async function cleanupZipFiles() {
  console.log('Cleaning up zip files in template directories...');
  console.log(`Base storage path: ${STORAGE_BASE}`);
  
  try {
    // Get all templates
    const templates = await prisma.template.findMany();
    
    console.log(`Found ${templates.length} templates in database`);
    
    let totalZipsRemoved = 0;
    let totalZipsFound = 0;
    
    for (const template of templates) {
      console.log(`\nTemplate: ${template.name} (ID: ${template.id})`);
      
      // Check standardized path
      const standardPath = path.join(STORAGE_BASE, template.userId, 'Default', template.id);
      console.log(`Checking for zip files in: ${standardPath}`);
      
      if (fs.existsSync(standardPath)) {
        try {
          const files = fs.readdirSync(standardPath);
          const zipFiles = files.filter(file => file.toLowerCase().endsWith('.zip'));
          
          totalZipsFound += zipFiles.length;
          console.log(`Found ${zipFiles.length} zip files`);
          
          for (const zipFile of zipFiles) {
            const fullZipPath = path.join(standardPath, zipFile);
            try {
              fs.unlinkSync(fullZipPath);
              console.log(`Deleted: ${fullZipPath}`);
              totalZipsRemoved++;
            } catch (deleteError) {
              console.error(`Failed to delete: ${fullZipPath}`, deleteError);
            }
          }
        } catch (e) {
          console.error(`Error reading directory: ${standardPath}`, e);
        }
      } else {
        console.log(`Directory does not exist: ${standardPath}`);
      }
      
      // Also check for zip files in legacy locations
      const legacyPaths = [
        path.join(STORAGE_BASE, template.userId, 'Default', template.name.replace(/[<>:"\/\\|?*]+/g, '_')),
        path.join(STORAGE_BASE, template.userId, 'Default', `${template.name.replace(/[<>:"\/\\|?*]+/g, '_')}_v${template.version || ''}`)
      ];
      
      for (const legacyPath of legacyPaths) {
        if (fs.existsSync(legacyPath)) {
          console.log(`Checking legacy path: ${legacyPath}`);
          try {
            const files = fs.readdirSync(legacyPath);
            const zipFiles = files.filter(file => file.toLowerCase().endsWith('.zip'));
            
            totalZipsFound += zipFiles.length;
            console.log(`Found ${zipFiles.length} zip files`);
            
            for (const zipFile of zipFiles) {
              const fullZipPath = path.join(legacyPath, zipFile);
              try {
                fs.unlinkSync(fullZipPath);
                console.log(`Deleted: ${fullZipPath}`);
                totalZipsRemoved++;
              } catch (deleteError) {
                console.error(`Failed to delete: ${fullZipPath}`, deleteError);
              }
            }
          } catch (e) {
            console.error(`Error reading directory: ${legacyPath}`, e);
          }
        }
      }
    }
    
    console.log(`\n=== ZIP Cleanup Summary ===`);
    console.log(`Total zip files found: ${totalZipsFound}`);
    console.log(`Total zip files removed: ${totalZipsRemoved}`);
    console.log(`Cleanup complete!`);
    
  } catch (error) {
    console.error('Error cleaning up zip files:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup function
cleanupZipFiles();
