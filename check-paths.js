// Script to check the system paths
const fs = require('fs-extra');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSystemPaths() {
  console.log('Checking system paths...');
  
  // Get all environment variables
  console.log('Environment Variables:');
  console.log(`FILE_STORAGE_PATH: ${process.env.FILE_STORAGE_PATH || 'Not set (using default: storage/templates)'}`);
  
  // Base paths to check
  const basePaths = [
    'storage/templates',
    './storage/templates',
    process.env.FILE_STORAGE_PATH || 'storage/templates'
  ];
  
  // Check if each base path exists
  console.log('\nChecking base storage paths:');
  for (const basePath of basePaths) {
    const fullPath = path.join(process.cwd(), basePath);
    const exists = await fs.pathExists(fullPath);
    console.log(`${basePath}: ${exists ? 'EXISTS' : 'MISSING'} (${fullPath})`);
  }
  
  // Get all templates
  const templates = await prisma.template.findMany();
  console.log(`\nFound ${templates.length} templates in database`);
  
  // Check each template's paths
  for (const template of templates) {
    console.log(`\nTemplate: ${template.name} (ID: ${template.id})`);
    
    // Parse metadata
    let metadata = {};
    try {
      metadata = JSON.parse(template.metadata || '{}');
    } catch (e) {
      console.log(`Error parsing metadata: ${e.message}`);
    }
    
    // Display paths from database
    console.log(`Database paths:`);
    console.log(`- extractionPath: ${template.extractionPath || 'Not set'}`);
    console.log(`- metadata.storagePath: ${metadata.storagePath || 'Not set'}`);
    if (metadata.extractionStatus) {
      console.log(`- metadata.extractionStatus.path: ${metadata.extractionStatus.path || 'Not set'}`);
    }
    
    // Check if paths exist on disk
    const pathsToCheck = [
      // Standard path: <userID>/Default/<templateID>
      {
        name: 'Standardized path (userId/Default/templateId)',
        path: path.join(process.cwd(), 'storage/templates', template.userId, 'Default', template.id)
      },
      // Legacy name path: <userID>/Default/<templateName>
      {
        name: 'Legacy name path (userId/Default/templateName)',
        path: path.join(process.cwd(), 'storage/templates', template.userId, 'Default', template.name.replace(/[<>:"\/\\|?*]+/g, '_'))
      },
      // Versioned path: <userID>/Default/<templateName_vVersion>
      {
        name: 'Versioned path (userId/Default/templateName_vVersion)',
        path: path.join(process.cwd(), 'storage/templates', template.userId, 'Default', `${template.name.replace(/[<>:"\/\\|?*]+/g, '_')}_v${metadata.version || ''}`)
      },
      // Double storage path: storage/storage/templates/...
      {
        name: 'Double storage path',
        path: path.join(process.cwd(), 'storage/storage/templates', template.userId, 'Default', template.name.replace(/[<>:"\/\\|?*]+/g, '_'))
      }
    ];
    
    // Add database paths to check
    if (template.extractionPath) {
      pathsToCheck.push({
        name: 'Database extractionPath',
        path: path.join(process.cwd(), 'storage/templates', template.extractionPath)
      });
    }
    
    if (metadata.storagePath) {
      pathsToCheck.push({
        name: 'Metadata storagePath',
        path: path.join(process.cwd(), 'storage/templates', metadata.storagePath)
      });
    }
    
    // Check each path
    console.log('\nChecking paths on disk:');
    for (const pathInfo of pathsToCheck) {
      const exists = await fs.pathExists(pathInfo.path);
      const fileCount = exists ? (await fs.readdir(pathInfo.path)).length : 0;
      console.log(`${pathInfo.name}: ${exists ? 'EXISTS' : 'MISSING'} (${fileCount} files)`);
      console.log(`  Path: ${pathInfo.path}`);
      
      // List files if directory exists and has files
      if (exists && fileCount > 0) {
        const files = await fs.readdir(pathInfo.path);
        console.log(`  Files: ${files.slice(0, 5).join(', ')}${files.length > 5 ? '...' : ''}`);
      }
    }
  }
  
  console.log('\nPath checking complete!');
}

// Run the check function
checkSystemPaths()
  .catch(error => {
    console.error('Error checking paths:', error);
  })
  .finally(() => {
    prisma.$disconnect();
  });
