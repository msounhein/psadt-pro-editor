/**
 * Migration script to update existing templates with the new 'type' field
 * This script will set the type field for all templates based on the isDefault flag
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs/promises');
const path = require('path');

const prisma = new PrismaClient();

async function migrateTemplateTypes() {
  try {
    console.log('Starting template type migration...');

    // Get all templates
    const templates = await prisma.template.findMany();
    console.log(`Found ${templates.length} templates to process`);

    // Process each template
    for (const template of templates) {
      // Determine the type based on isDefault flag or metadata
      let type = "Custom"; // Default to Custom
      
      // If isDefault is true, set type to Default
      if (template.isDefault) {
        type = "Default";
      } 
      // If metadata contains isDefault=true, set type to Default
      else if (template.metadata) {
        try {
          const metadata = JSON.parse(template.metadata);
          if (metadata.isDefault) {
            type = "Default";
          }
        } catch (e) {
          console.error(`Error parsing metadata for template ${template.id}:`, e);
        }
      }
      
      console.log(`Setting template "${template.name}" (${template.id}) to type: ${type}`);
      
      // Update the template type
      await prisma.template.update({
        where: { id: template.id },
        data: { type },
      });
      
      // Reorganize files if needed
      if (template.storagePath) {
        try {
          const userId = template.userId;
          const templateName = template.name;
          
          // Current path
          const currentPath = template.storagePath;
          
          // New path structure
          const storageDir = process.env.STORAGE_DIR || "storage";
          const newPath = path.join(
            storageDir,
            "templates",
            userId,
            type,
            templateName
          );
          
          // If paths are different, move files
          if (currentPath !== newPath) {
            console.log(`Moving template files from ${currentPath} to ${newPath}`);
            
            // Create directory if it doesn't exist
            await fs.mkdir(path.dirname(newPath), { recursive: true });
            
            // Check if source exists
            const sourceExists = await fs.stat(currentPath).catch(() => false);
            
            if (sourceExists) {
              // Copy files to new location
              await fs.cp(currentPath, newPath, { recursive: true });
              
              // Update database record
              await prisma.template.update({
                where: { id: template.id },
                data: { storagePath: newPath },
              });
              
              console.log(`Template files moved for "${templateName}"`);
            } else {
              console.log(`Source path ${currentPath} does not exist, skipping file move`);
            }
          }
        } catch (error) {
          console.error(`Error organizing files for template ${template.id}:`, error);
        }
      }
    }
    
    console.log('Template type migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateTemplateTypes()
  .then(() => {
    console.log('Migration script completed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration script failed:', err);
    process.exit(1);
  });