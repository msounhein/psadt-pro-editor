#!/usr/bin/env node
/**
 * Consolidated template management script
 * 
 * This script combines the functionality of:
 * - check-template.js
 * - list-templates.js
 * - create-template.js
 * - update-db-directly.js
 * - clone-template.js (new)
 * 
 * Usage:
 *   node template-management.js <command> [options]
 * 
 * Commands:
 *   list                   List all templates
 *   check <templateId>     Check a specific template
 *   create                 Create a new template
 *   update <templateId>    Update template extraction status
 *   clone <templateId>     Clone a template (creates a copy as Custom type)
 * 
 * Options:
 *   --userId <id>          User ID for create/update operations
 *   --name <n>             Template name for create/update operations
 *   --version <version>    Version for create/update operations
 *   --status <status>      Status for update operations (default: "complete") 
 *   --type <type>          Template type (Default or Custom, default: "Custom")
 *   --description <desc>   Template description for create/clone operations
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs/promises');
const path = require('path');
const prisma = new PrismaClient();

// Process command-line arguments
const args = process.argv.slice(2);
const command = args[0];

// Extract options
const getOption = (flag) => {
  const index = args.indexOf(flag);
  return index !== -1 && index < args.length - 1 ? args[index + 1] : null;
};

// Help text
function showHelp() {
  console.log(`
Template Management Tool

Usage:
  node template-management.js <command> [options]

Commands:
  list                   List all templates
  check <templateId>     Check a specific template
  create                 Create a new template
  update <templateId>    Update template extraction status
  clone <templateId>     Clone a template (creates a copy as Custom type)

Options:
  --userId <id>          User ID for create/update operations
  --name <n>             Template name for create/update operations
  --version <version>    Version for create/update operations
  --status <status>      Status for update operations (default: "complete")
  --type <type>          Template type (Default or Custom, default: "Custom")
  --description <desc>   Template description for create/clone operations

Examples:
  node template-management.js list
  node template-management.js check d0e1af94-6cab-4d78-bb3a-fcb318e0ad86
  node template-management.js create --userId 01d7a616-e40c-44fc-9819-a95ae27aab89 --name "Template" --version "1.0.0" --type "Default"
  node template-management.js update d0e1af94-6cab-4d78-bb3a-fcb318e0ad86 --status "complete"
  node template-management.js clone d0e1af94-6cab-4d78-bb3a-fcb318e0ad86 --userId 01d7a616-e40c-44fc-9819-a95ae27aab89 --name "Custom Template"
  `);
}

// List all templates
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
      console.log(`Type: ${template.type || 'N/A'}`);
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
  }
}

// Check a specific template
async function checkTemplate(templateId) {
  try {
    if (!templateId) {
      console.error('Template ID is required');
      return;
    }
    
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
    console.log(`Type: ${template.type || 'Not set'}`);
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
  }
}

// Create a new template
async function createTemplate(options) {
  const userId = options.userId;
  const templateName = options.name;
  const version = options.version;
  const type = options.type || 'Custom';
  const description = options.description || `${templateName} template`;
  
  if (!userId || !templateName || !version) {
    console.error('Missing required options: --userId, --name, --version');
    return;
  }
  
  // Create appropriate path based on type
  const extractionPath = `${userId}/${type}/${templateName}_v${version}`;
  
  try {
    console.log(`Creating ${type} template with complete extraction status...`);
    
    // First check if user exists
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
    
    // Generate a unique template ID
    const templateId = require('crypto').randomUUID();
    
    // Prepare metadata
    const metadata = {
      files: [
        {
          name: `${templateName}.zip`,
          path: `releases/${version}/${templateName}.zip`,
          url: `https://example.com/releases/${version}/${templateName}.zip`
        }
      ],
      isDefault: type === 'Default',
      version: version,
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
        id: templateId,
        name: templateName,
        description: description,
        packageType: 'PowerShellAppDeploymentToolkit',
        userId: userId,
        isPublic: true,
        isDefault: type === 'Default',
        type: type,
        version: version,
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
    console.log(`Type: ${template.type}`);
    console.log(`User ID: ${template.userId}`);
    console.log(`Version: ${template.version}`);
    console.log(`Extraction Status: ${template.extractionStatus}`);
    console.log(`Extraction Path: ${template.extractionPath}`);
  } catch (error) {
    console.error('Error creating template:', error);
  }
}

// Update template extraction status
async function updateTemplate(templateId, options) {
  const status = options.status || 'complete';
  
  if (!templateId) {
    console.error('Template ID is required');
    return;
  }
  
  try {
    console.log(`Updating template ${templateId} extraction status to '${status}'`);
    
    // Get template record
    const template = await prisma.template.findUnique({
      where: { id: templateId }
    });
    
    if (!template) {
      console.error(`Template with ID ${templateId} not found`);
      return;
    }
    
    console.log('Found template:', template.name);
    
    // Check if attempting to edit a Default template
    if (template.type === 'Default' && options.type === 'Custom') {
      console.log('Warning: Changing a Default template to Custom type');
    }
    
    // Extract path from options or use existing
    let extractionPath = options.extractionPath;
    if (!extractionPath) {
      if (template.extractionPath) {
        extractionPath = template.extractionPath;
      } else {
        // Try to construct from metadata
        try {
          const metadata = JSON.parse(template.metadata || '{}');
          extractionPath = metadata.storagePath || metadata.extractionStatus?.path;
        } catch (err) {
          console.error('Could not determine extraction path');
          return;
        }
      }
    }
    
    // Parse and update metadata
    let metadata = {};
    try {
      metadata = JSON.parse(template.metadata || '{}');
      
      // Update metadata for backward compatibility
      metadata.extractionStatus = {
        status,
        path: extractionPath,
        lastUpdated: new Date().toISOString()
      };
      
      console.log('Updated metadata with extraction status');
    } catch (err) {
      console.error('Failed to parse template metadata:', err);
      // Continue anyway since we're using dedicated columns
    }
    
    // Prepare update data
    const updateData = {
      extractionStatus: status,
      extractionPath: extractionPath,
      lastExtractionDate: new Date(),
      metadata: JSON.stringify(metadata)
    };
    
    // Add type if provided
    if (options.type) {
      updateData.type = options.type;
    }
    
    // Update template record
    const updatedTemplate = await prisma.template.update({
      where: { id: templateId },
      data: updateData
    });
    
    console.log('Template updated successfully:');
    console.log(`ID: ${updatedTemplate.id}`);
    console.log(`Name: ${updatedTemplate.name}`);
    console.log(`Type: ${updatedTemplate.type}`);
    console.log(`Status: ${updatedTemplate.extractionStatus}`);
    console.log(`Path: ${updatedTemplate.extractionPath}`);
  } catch (error) {
    console.error('Error updating template:', error);
  }
}

// Clone a template
async function cloneTemplate(templateId, options) {
  const userId = options.userId;
  const newName = options.name;
  const description = options.description || `Cloned from template ${templateId}`;
  
  if (!templateId || !userId || !newName) {
    console.error('Missing required options: templateId, --userId, --name');
    return;
  }
  
  try {
    console.log(`Cloning template ${templateId} as '${newName}'...`);
    
    // Get the source template
    const sourceTemplate = await prisma.template.findUnique({
      where: { id: templateId }
    });
    
    if (!sourceTemplate) {
      console.error(`Template with ID ${templateId} not found`);
      return;
    }
    
    console.log(`Source template: ${sourceTemplate.name} (${sourceTemplate.type})`);
    
    // Always create clones as Custom type
    const type = 'Custom';
    
    // Create new extraction path
    const extractionPath = `${userId}/${type}/${newName}`;
    
    // Generate a unique template ID
    const newTemplateId = require('crypto').randomUUID();
    
    // Parse metadata
    let metadata = {};
    try {
      metadata = JSON.parse(sourceTemplate.metadata || '{}');
      
      // Update metadata
      metadata.isDefault = false;
      metadata.clonedFrom = templateId;
      metadata.storagePath = extractionPath;
      metadata.extractionStatus = {
        status: "pending", // Will need to copy files
        path: extractionPath,
        lastUpdated: new Date().toISOString()
      };
    } catch (err) {
      console.error('Warning: Failed to parse source template metadata');
      metadata = {
        isDefault: false,
        clonedFrom: templateId,
        storagePath: extractionPath,
        extractionStatus: {
          status: "pending",
          path: extractionPath,
          lastUpdated: new Date().toISOString()
        }
      };
    }
    
    // Create the cloned template
    const clonedTemplate = await prisma.template.create({
      data: {
        id: newTemplateId,
        name: newName,
        description: description,
        packageType: sourceTemplate.packageType,
        userId: userId,
        isPublic: sourceTemplate.isPublic,
        isDefault: false,
        type: type,
        version: sourceTemplate.version,
        storagePath: extractionPath,
        extractionStatus: 'pending', // Set to pending initially
        extractionPath: extractionPath,
        metadata: JSON.stringify(metadata)
      }
    });
    
    console.log('Template cloned successfully:');
    console.log(`ID: ${clonedTemplate.id}`);
    console.log(`Name: ${clonedTemplate.name}`);
    console.log(`Type: ${clonedTemplate.type}`);
    console.log(`User ID: ${clonedTemplate.userId}`);
    console.log(`Version: ${clonedTemplate.version}`);
    console.log(`Extraction Status: ${clonedTemplate.extractionStatus}`);
    console.log(`Extraction Path: ${clonedTemplate.extractionPath}`);
    
    // Handle file copying - this would typically be done by the backend
    console.log(`\nNote: Files need to be copied from source: ${sourceTemplate.extractionPath}`);
    console.log(`to target: ${extractionPath}`);
    console.log(`Use the following command to update status after copying files:`);
    console.log(`node template-management.js update ${newTemplateId} --status "complete"`);
  } catch (error) {
    console.error('Error cloning template:', error);
  }
}

// Main function
async function main() {
  try {
    if (!command || command === 'help' || command === '--help') {
      showHelp();
      return;
    }
    
    const options = {
      userId: getOption('--userId'),
      name: getOption('--name'),
      version: getOption('--version'),
      status: getOption('--status'),
      extractionPath: getOption('--extractionPath'),
      type: getOption('--type'),
      description: getOption('--description')
    };
    
    switch (command) {
      case 'list':
        await listTemplates();
        break;
      case 'check':
        await checkTemplate(args[1]);
        break;
      case 'create':
        await createTemplate(options);
        break;
      case 'update':
        await updateTemplate(args[1], options);
        break;
      case 'clone':
        await cloneTemplate(args[1], options);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the main function
main()
  .then(() => console.log('\nDone'))
  .catch(err => console.error('Unhandled error:', err));