/**
 * Verify PSADT Commands in Database
 * 
 * This script queries the Prisma database to verify that PSADT commands,
 * parameters, examples, and patterns have been properly populated.
 */

const { PrismaClient } = require('@prisma/client');

// Initialize Prisma client
const prisma = new PrismaClient();

// Main function to verify the database
async function verifyPsadtCommands() {
  console.log('Verifying PSADT documentation tables...');
  
  try {
    // Count commands by version
    const v3CommandsCount = await prisma.psadtCommand.count({
      where: { version: 3 }
    });
    
    const v4CommandsCount = await prisma.psadtCommand.count({
      where: { version: 4 }
    });
    
    console.log(`PSADT v3 Commands: ${v3CommandsCount}`);
    console.log(`PSADT v4 Commands: ${v4CommandsCount}`);
    
    // Count parameters
    const parametersCount = await prisma.psadtParameter.count();
    console.log(`Parameters: ${parametersCount}`);
    
    // Count critical parameters
    const criticalParametersCount = await prisma.psadtParameter.count({
      where: { isCritical: true }
    });
    console.log(`Critical Parameters: ${criticalParametersCount}`);
    
    // Count examples
    const examplesCount = await prisma.psadtExample.count();
    console.log(`Examples: ${examplesCount}`);
    
    // Count patterns
    const patternsCount = await prisma.psadtPattern.count();
    console.log(`Syntax Highlighting Patterns: ${patternsCount}`);
    
    // Count mapped commands
    const mappedCommandsCount = await prisma.psadtCommand.count({
      where: {
        NOT: { mappedCommandId: null }
      }
    });
    console.log(`Mapped Commands: ${mappedCommandsCount}`);
    
    // Print all v3 commands and their v4 equivalents
    console.log('\nPSADT v3 to v4 Command Mappings:');
    
    const v3Commands = await prisma.psadtCommand.findMany({
      where: {
        version: 3,
        NOT: { mappedCommandId: null }
      },
      select: {
        commandName: true,
        mappedCommandId: true
      }
    });
    
    for (const v3Command of v3Commands) {
      const v4Command = await prisma.psadtCommand.findUnique({
        where: { id: v3Command.mappedCommandId },
        select: { commandName: true }
      });
      
      console.log(`  ${v3Command.commandName} → ${v4Command?.commandName}`);
    }
    
    // Print templates associated with commands
    const templates = await prisma.template.findMany({
      where: {
        commands: {
          some: {}
        }
      },
      include: {
        _count: {
          select: {
            commands: true
          }
        }
      }
    });
    
    console.log('\nTemplates with PSADT Commands:');
    for (const template of templates) {
      console.log(`  ${template.name}: ${template._count.commands} commands`);
    }
    
  } catch (error) {
    console.error('Error verifying PSADT documentation tables:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
verifyPsadtCommands()
  .then(() => {
    console.log('\nVerification completed successfully');
  })
  .catch(error => {
    console.error('Error running verification script:', error);
    process.exit(1);
  });
