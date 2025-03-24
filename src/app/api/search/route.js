/**
 * API Route: /api/search
 * 
 * Handles semantic search requests using fastembed
 */

import { NextResponse } from 'next/server';
import { searchSimilarDocuments } from '@/lib/embedding-service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Search for PSADT commands or documentation using semantic search
 */
export async function POST(request) {
  try {
    const { query, type = 'commands', limit = 5 } = await request.json();
    
    if (!query || typeof query !== 'string' || query.trim() === '') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }
    
    let results = [];
    const startTime = Date.now();
    
    // Search for different types of content
    if (type === 'commands') {
      // Fetch commands from the database
      const commands = await prisma.command.findMany({
        include: {
          parameters: true,
          examples: true,
        },
      });
      
      // Prepare documents for search
      const documents = commands.map(command => ({
        id: command.id,
        name: command.name,
        synopsis: command.synopsis,
        syntax: command.syntax,
        parameters: command.parameters,
        examples: command.examples,
        // Create a combined text field for embedding
        text: `${command.name}: ${command.synopsis}\n${command.syntax}${
          command.parameters 
            ? '\nParameters: ' + command.parameters.map(p => `${p.name}: ${p.description}`).join('\n')
            : ''
        }${
          command.examples
            ? '\nExamples: ' + command.examples.map(e => e.code).join('\n')
            : ''
        }`
      }));
      
      // Search for similar commands
      results = await searchSimilarDocuments(query, documents, 'text', limit);
    } 
    else if (type === 'documentation') {
      // Fetch documentation from the database
      const docs = await prisma.documentation.findMany();
      
      // Prepare documents for search
      const documents = docs.map(doc => ({
        id: doc.id,
        title: doc.title,
        content: doc.content,
        path: doc.path,
        // Create a combined text field for embedding
        text: `${doc.title}\n${doc.content}`
      }));
      
      // Search for similar documentation
      results = await searchSimilarDocuments(query, documents, 'text', limit);
    }
    
    const duration = Date.now() - startTime;
    
    return NextResponse.json({
      results,
      query,
      type,
      limit,
      duration,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in search:', error);
    return NextResponse.json(
      { error: 'Search failed', message: error.message },
      { status: 500 }
    );
  }
}
