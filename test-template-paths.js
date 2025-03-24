// Script to test template paths
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

// Define the standard path structure
const STORAGE_BASE = path.join(__dirname, 'storage', 'templates');

async function testTemplatePaths() {
  console.log('Testing template paths...');
  console.log(`Base storage path: ${STORAGE_BASE}`);
  
  try {
    // Get all templates
    const templates = await prisma.template.findMany();
    
    console.log(`Found ${templates.length} templates in database`);
    
    for (const template of templates) {
      console.log(`\nTemplate: ${template.name} (ID: ${template.id})`);
      
      // Parse metadata
      let metadata = {};
      try {
        metadata = JSON.parse(template.metadata || '{}');
        console.log(`Metadata parsed successfully`);
      } catch (e) {
        console.log(`Error parsing metadata: ${e.message}`);
        continue;
      }
      
      // Check paths in database record
      console.log(`Extraction path: ${template.extractionPath || 'Not set'}`);
      console.log(`Storage path in metadata: ${metadata.storagePath || 'Not set'}`);
      console.log(`Extraction status path: ${metadata.extractionStatus?.path || 'Not set'}`);
      
      // Validate standardized format
      const expectedFormat = `${template.userId}/Default/${template.id}`;
      
      const paths = [
        template.extractionPath,
        metadata.storagePath,
        metadata.extractionStatus?.path
      ];
      
      const pathsValid = paths.every(p => p === expectedFormat);
      
      console.log(`Path format is standardized: ${pathsValid ? 'YES' : 'NO'}`);
      
      if (!pathsValid) {
        console.log(`- Expected format: ${expectedFormat}`);
        
        for (const [i, p] of paths.entries()) {
          const pathName = ['extractionPath', 'metadata.storagePath', 'metadata.extractionStatus.path'][i];
          if (p !== expectedFormat) {
            console.log(`- ${pathName} is incorrect: ${p}`);
          }
        }
      }
      
      // Check if files exist in the correct location
      const fullPath = path.join(STORAGE_BASE, expectedFormat);
      const directoryExists = fs.existsSync(fullPath);
      console.log(`Directory exists at ${fullPath}: ${directoryExists ? 'YES' : 'NO'}`);
      
      if (directoryExists) {
        try {
          const files = fs.readdirSync(fullPath);
          console.log(`Found ${files.length} files/directories in the template directory`);
          if (files.length > 0) {
            console.log(`First few entries: ${files.slice(0, 5).join(', ')}${files.length > 5 ? '...' : ''}`);
          }
        } catch (e) {
          console.log(`Error reading directory: ${e.message}`);
        }
      }
      
      // Check legacy paths (for reference)
      const legacyPaths = [
        // Check without version number
        path.join(STORAGE_BASE, template.userId, 'Default', `${template.name.replace(/[<>:"\/\\|?*]+/g, '_')}`),
        // Check with version number
        path.join(STORAGE_BASE, template.userId, 'Default', `${template.name.replace(/[<>:"\/\\|?*]+/g, '_')}_v${metadata.version || 'unknown'}`),
        // Check double storage path
        path.join(__dirname, 'storage', 'storage', 'templates', template.userId, 'Default', `${template.name.replace(/[<>:"\/\\|?*]+/g, '_')}`)
      ];
      
      console.log(`\nChecking legacy paths for files:`);
      for (const [i, legacyPath] of legacyPaths.entries()) {
        const exists = fs.existsSync(legacyPath);
        console.log(`Legacy path #${i+1} exists: ${exists ? 'YES' : 'NO'}`);
        console.log(`- ${legacyPath}`);
        
        if (exists) {
          try {
            const files = fs.readdirSync(legacyPath);
            console.log(`  Found ${files.length} files/directories`);
            
            // If we have files in a legacy location but not in the standardized one, we could copy them
            if (files.length > 0 && (!directoryExists || fs.readdirSync(fullPath).length === 0)) {
              console.log(`  ⚠️ Files exist in legacy path but not in standardized path!`);
              console.log(`  Recommend copying files from legacy path to standardized path.`);
            }
          } catch (e) {
            console.log(`  Error reading directory: ${e.message}`);
          }
        }
      }
    }
    
    console.log('\nTemplate path testing complete!');
    
  } catch (error) {
    console.error('Error testing template paths:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test function
testTemplatePaths();
