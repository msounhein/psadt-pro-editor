// src/app/api/psadt-qdrant/records/route.js
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getPsadtQdrantDb } from '../../../../lib/psadt-qdrant-db';
// Import uuid with fallback for compatibility
let uuidv4;
try {
  // Try to import uuid v4
  const uuid = require('uuid');
  uuidv4 = uuid.v4;
} catch (error) {
  // Fallback implementation if uuid module is not available
  console.warn('UUID module not available, using fallback implementation');
  uuidv4 = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
}

// Initialize Prisma client
let prisma;

// Initialize Prisma with error handling
try {
  prisma = new PrismaClient();
} catch (error) {
  console.error('Failed to initialize Prisma:', error);
}

export async function POST(request) {
  // Check if Prisma is initialized
  if (!prisma) {
    return NextResponse.json(
      { error: 'Database connection not available. Check DATABASE_URL environment variable.' },
      { status: 500 }
    );
  }
  try {
    const { type, record } = await request.json();
    
    if (!type || !record) {
      return NextResponse.json(
        { error: 'Type and record are required' },
        { status: 400 }
      );
    }
    
    let result;
    
    // Handle commands
    if (type === 'command') {
      if (!record.commandName || !record.version) {
        return NextResponse.json(
          { error: 'Command name and version are required' },
          { status: 400 }
        );
      }
      
      // Check if command already exists
      const existingCommand = await prisma.psadtCommand.findFirst({
        where: {
          commandName: record.commandName,
          version: record.version
        }
      });
      
      if (existingCommand) {
        return NextResponse.json(
          { error: `Command ${record.commandName} already exists for version ${record.version}` },
          { status: 400 }
        );
      }
      
      // Create command in Prisma
      result = await prisma.psadtCommand.create({
        data: {
          id: uuidv4(),
          commandName: record.commandName,
          version: record.version,
          description: record.description || null,
          syntax: record.syntax || null,
          notes: record.notes || null,
          isDeprecated: record.isDeprecated || false,
        }
      });
      
      // Index the command in Qdrant
      const qdrantDb = getPsadtQdrantDb();
      await qdrantDb.indexCommand(result);
      
    } 
    // Handle examples
    else if (type === 'example') {
      if (!record.commandId || !record.title || !record.code) {
        return NextResponse.json(
          { error: 'Command ID, title, and code are required for examples' },
          { status: 400 }
        );
      }
      
      // Check if parent command exists
      const parentCommand = await prisma.psadtCommand.findUnique({
        where: {
          id: record.commandId
        }
      });
      
      if (!parentCommand) {
        return NextResponse.json(
          { error: `Parent command with ID ${record.commandId} not found` },
          { status: 400 }
        );
      }
      
      // Create example in Prisma
      result = await prisma.psadtExample.create({
        data: {
          id: uuidv4(),
          commandId: record.commandId,
          title: record.title,
          description: record.description || null,
          code: record.code,
        }
      });
      
      // Index the example in Qdrant
      const qdrantDb = getPsadtQdrantDb();
      await qdrantDb.indexCommandExample(parentCommand, result);
    }
    else {
      return NextResponse.json(
        { error: 'Invalid record type. Type must be "command" or "example"' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ 
      message: `${type === 'command' ? 'Command' : 'Example'} added successfully`,
      record: result
    });
  } catch (error) {
    console.error('Error adding record:', error);
    return NextResponse.json(
      { error: `Failed to add record: ${error.message}` },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
