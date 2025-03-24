#!/usr/bin/env node
// scripts/import-docs-to-db.js
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { getPsadtQdrantDb } = require('../src/lib/psadt-qdrant-db');
const matter = require('gray-matter');
const parseArgs = require('minimist');

// Parse command line arguments
const argv = parseArgs(process.argv.slice(2));
const docsPath = argv.docsPath || path.join(process.cwd(), 'temp/docs');

// Initialize clients
const prisma = new PrismaClient();
const qdrantDb = getPsadtQdrantDb();

// Regular expressions for parsing documentation
const commandNameRegex = /^(\w+)-(\w+)/;
const syntaxRegex = /^([\w-]+)\s+(?:\[)?([^[\]]+(?:\s+\[[^\]]+\])*)(?:\])?/;
const paramRegex = /-(\w+)(?:\s+([^-][^\s]*))?/g;

// Process a documentation file and extract command information
async function processDocFile(filePath) {
  console.log(`Processing file: ${filePath}`);
  
  try {
    // Read file content
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Extract filename and determine if it's a command
    const fileName = path.basename(filePath);
    const fileNameWithoutExt = fileName.replace(/\.\w+$/, '');
    
    // Check if it's a command file (follows the pattern Name-Action.md)
    const commandMatch = fileNameWithoutExt.match(commandNameRegex);
    if (!commandMatch) {
      console.log(`Skipping file ${fileName} - not a command documentation`);
      return null;
    }
    
    // Parse frontmatter if any
    const { data: frontMatter, content: markdownContent } = matter(content);
    
    // Extract command information
    const commandName = fileNameWithoutExt;
    let description = '';
    let syntax = '';
    let notes = '';
    let isDeprecated = false;
    let version = 4; // Now default to version 4 only
    
    // Check if frontmatter has version information (but still ensure it's 4)
    if (frontMatter.version) {
      const parsedVersion = parseInt(frontMatter.version, 10);
      // Only accept version 4
      if (parsedVersion === 4) {
        version = parsedVersion;
      }
    }
    
    // Check for deprecation status
    if (frontMatter.deprecated === true || markdownContent.toLowerCase().includes('this command is deprecated')) {
      isDeprecated = true;
    }
    
    // Extract description (first paragraph after a "DESCRIPTION" heading)
    const descriptionMatch = markdownContent.match(/##\s*DESCRIPTION\s*\n\n([^#]+)/i);
    if (descriptionMatch) {
      description = descriptionMatch[1].trim();
    }
    
    // Extract syntax (first code block after "SYNTAX" heading)
    const syntaxMatch = markdownContent.match(/##\s*SYNTAX\s*\n\n```[^\n]*\n([^`]+)```/i);
    if (syntaxMatch) {
      syntax = syntaxMatch[1].trim();
    }
    
    // Extract notes (content after "NOTES" heading)
    const notesMatch = markdownContent.match(/##\s*NOTES\s*\n\n([^#]+)/i);
    if (notesMatch) {
      notes = notesMatch[1].trim();
    }
    
    // Create or update command in database
    const command = await prisma.psadtCommand.upsert({
      where: {
        commandName_version: {
          commandName,
          version
        }
      },
      update: {
        description,
        syntax,
        notes,
        isDeprecated,
        updatedAt: new Date()
      },
      create: {
        commandName,
        version,
        description,
        syntax,
        notes,
        isDeprecated,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    console.log(`Saved command to database: ${commandName} (Version ${version})`);
    
    // Extract parameters
    const parameters = [];
    let paramMatch;
    if (syntax) {
      // Reset the regex
      paramRegex.lastIndex = 0;
      
      while ((paramMatch = paramRegex.exec(syntax)) !== null) {
        const paramName = paramMatch[1];
        const defaultValue = paramMatch[2] || null;
        
        // Look for parameter description in the PARAMETERS section
        const paramDescriptionRegex = new RegExp(`-${paramName}\\s*([^-#]+)`, 'i');
        const paramDescriptionMatch = markdownContent.match(paramDescriptionRegex);
        let paramDescription = '';
        
        if (paramDescriptionMatch) {
          paramDescription = paramDescriptionMatch[1].trim();
        }
        
        // Determine if parameter is required (heuristic)
        const isRequired = !syntax.includes(`[-${paramName}`) && !syntax.includes(`[-${paramName.toUpperCase()}`);
        
        // Determine if parameter is critical (heuristic)
        const isCritical = paramName.toLowerCase() === 'deploymenttype' || 
                          paramName.toLowerCase() === 'deploymode' || 
                          paramName.toLowerCase() === 'installphase';
        
        parameters.push({
          paramName,
          description: paramDescription,
          defaultValue,
          isRequired,
          isCritical
        });
      }
    }
    
    // Add parameters to database
    if (parameters.length > 0) {
      // First delete existing parameters
      await prisma.psadtParameter.deleteMany({
        where: { commandId: command.id }
      });
      
      // Then add new parameters
      for (const param of parameters) {
        await prisma.psadtParameter.create({
          data: {
            commandId: command.id,
            paramName: param.paramName,
            description: param.description,
            defaultValue: param.defaultValue,
            isRequired: param.isRequired,
            isCritical: param.isCritical
          }
        });
      }
      
      console.log(`Added ${parameters.length} parameters for command ${commandName}`);
    }
    
    // Extract examples
    const examples = [];
    const exampleSections = markdownContent.match(/##\s*EXAMPLE\s*\d*[^#]+(```[^`]+```)/gi);
    
    if (exampleSections) {
      for (let i = 0; i < exampleSections.length; i++) {
        const exampleSection = exampleSections[i];
        const titleMatch = exampleSection.match(/##\s*EXAMPLE\s*\d*\s*(.+?)(?:\n|$)/i);
        const codeMatch = exampleSection.match(/```[^\n]*\n([^`]+)```/i);
        
        let title = '';
        if (titleMatch && titleMatch[1]) {
          title = titleMatch[1].trim();
        } else {
          title = `Example ${i + 1}`;
        }
        
        let code = '';
        if (codeMatch && codeMatch[1]) {
          code = codeMatch[1].trim();
        }
        
        // Get any description text between title and code block
        let description = '';
        if (titleMatch && codeMatch) {
          const titleIndex = exampleSection.indexOf(titleMatch[0]) + titleMatch[0].length;
          const codeIndex = exampleSection.indexOf('```');
          if (codeIndex > titleIndex) {
            description = exampleSection.substring(titleIndex, codeIndex).trim();
          }
        }
        
        if (code) {
          examples.push({
            title,
            description,
            code
          });
        }
      }
    }
    
    // Add examples to database
    if (examples.length > 0) {
      // First delete existing examples
      await prisma.psadtExample.deleteMany({
        where: { commandId: command.id }
      });
      
      // Then add new examples
      for (const example of examples) {
        await prisma.psadtExample.create({
          data: {
            commandId: command.id,
            title: example.title,
            description: example.description,
            code: example.code
          }
        });
      }
      
      console.log(`Added ${examples.length} examples for command ${commandName}`);
    }
    
    return command;
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return null;
  }
}

// Find all the documentation files and process them
async function processAllDocFiles() {
  try {
    // Find all markdown files
    const files = findAllFiles(docsPath, ['.md', '.mdx']);
    console.log(`Found ${files.length} documentation files to process`);
    
    const commands = [];
    
    // Process each file
    for (const file of files) {
      const command = await processDocFile(file);
      if (command) {
        commands.push(command);
      }
    }
    
    console.log(`Processed ${commands.length} commands successfully`);
    
    // Now sync commands to Qdrant for semantic search
    console.log('Syncing commands to Qdrant for semantic search...');
    await qdrantDb.syncCommandsToQdrant();
    console.log('Qdrant sync completed');
    
    // Update source information
    await updateSourceInfo();
    
    return commands;
  } catch (error) {
    console.error('Error processing documentation files:', error);
    throw error;
  }
}

// Update documentation source information
async function updateSourceInfo() {
  try {
    // Update or create source information for version 4 only
    await prisma.psadtDocumentationSource.upsert({
      where: {
        version_fileName: {
          version: 4,
          fileName: 'github-repository'
        }
      },
      update: {
        lastUpdated: new Date(),
        lastParsed: new Date(),
        status: 'success'
      },
      create: {
        version: 4,
        sourceUrl: 'https://github.com/PSAppDeployToolkit/PSAppDeployToolkit',
        fileName: 'github-repository',
        lastUpdated: new Date(),
        lastParsed: new Date(),
        status: 'success'
      }
    });
    
    console.log('Documentation source information updated');
  } catch (error) {
    console.error('Error updating source information:', error);
  }
}

// Helper function to find all files with specific extensions recursively
function findAllFiles(dir, extensions) {
  let results = [];
  
  const list = fs.readdirSync(dir);
  
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Recursively search subdirectories
      results = results.concat(findAllFiles(filePath, extensions));
    } else {
      // Check if the file has a matching extension
      const ext = path.extname(file).toLowerCase();
      if (extensions.includes(ext)) {
        results.push(filePath);
      }
    }
  }
  
  return results;
}

// Main function to run the import process
async function main() {
  try {
    console.log('Starting documentation import process');
    console.log(`Using documentation path: ${docsPath}`);
    
    // Process all documentation files
    await processAllDocFiles();
    
    console.log('Documentation import completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Documentation import failed:', error);
    process.exit(1);
  }
}

// Run the main function
main();