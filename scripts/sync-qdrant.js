// scripts/sync-qdrant.js
const { PrismaClient } = require('@prisma/client');
const { QdrantClient } = require('@qdrant/js-client-rest');
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config();

// Make sure DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL environment variable is not set. Using default SQLite path.');
  process.env.DATABASE_URL = 'file:./psadt-pro.db';
}

// Configuration
const config = {
  qdrantUrl: process.env.QDRANT_URL,
  qdrantApiKey: process.env.QDRANT_API_KEY,
  collectionName: process.env.QDRANT_COLLECTION || 'psadt_commands',
  embeddingModelName: process.env.EMBEDDING_MODEL || 'sentence-transformers/all-MiniLM-L6-v2',
  embeddingApiUrl: process.env.EMBEDDING_API_URL,
  embeddingApiKey: process.env.EMBEDDING_API_KEY,
  resetCollection: process.argv.includes('--reset'),
};

// Initialize clients
const prisma = new PrismaClient();
const qdrant = new QdrantClient({
  url: config.qdrantUrl,
  apiKey: config.qdrantApiKey,
});

// Embedding dimension for the MiniLM-L6-v2 model
const EMBEDDING_DIMENSION = 384;

/**
 * Generate embeddings for text using Hugging Face's Inference API
 * @param {string} text - The text to generate embeddings for
 * @returns {Promise<number[]>} - The vector embeddings
 */
async function generateEmbedding(text) {
  if (!config.embeddingApiUrl || !config.embeddingApiKey) {
    console.warn('EMBEDDING_API_URL or EMBEDDING_API_KEY not set. Using placeholder embeddings.');
    // Generate a placeholder embedding (random vector) for testing
    return Array.from({ length: EMBEDDING_DIMENSION }, () => Math.random() * 2 - 1);
  }
  
  try {
    // Call Hugging Face Inference API
    const response = await fetch(config.embeddingApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.embeddingApiKey}`
      },
      body: JSON.stringify({
        inputs: text,
        options: {
          wait_for_model: true
        }
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Hugging Face API error: ${response.status} ${response.statusText} - ${error}`);
    }
    
    // Hugging Face returns the embedding directly as an array
    const embedding = await response.json();
    
    // If we got an array of arrays (for multiple sentences), just take the first one
    return Array.isArray(embedding[0]) ? embedding[0] : embedding;
  } catch (error) {
    console.error('Failed to generate embedding:', error);
    throw error;
  }
}

/**
 * Check if collection exists and create it if it doesn't
 */
async function ensureCollection() {
  try {
    // Check if collection exists
    const collections = await qdrant.getCollections();
    const collectionExists = collections.collections && 
                              collections.collections.some(c => c.name === config.collectionName);
    
    if (collectionExists && config.resetCollection) {
      console.log(`Deleting existing collection: ${config.collectionName}`);
      await qdrant.deleteCollection(config.collectionName);
      collectionExists = false;
    }
    
    if (!collectionExists) {
      console.log(`Creating collection: ${config.collectionName}`);
      await qdrant.createCollection(config.collectionName, {
        vectors: {
          size: EMBEDDING_DIMENSION,
          distance: 'Cosine',
        },
        optimizers_config: {
          default_segment_number: 2,
        },
        replication_factor: 1,
      });
      
      // Create payload indices
      await qdrant.createPayloadIndex(config.collectionName, {
        field_name: 'commandName',
        field_schema: 'keyword',
        field_type: 'text',
      });
      
      await qdrant.createPayloadIndex(config.collectionName, {
        field_name: 'version',
        field_schema: 'integer',
        field_type: 'integer',
      });
      
      await qdrant.createPayloadIndex(config.collectionName, {
        field_name: 'isDeprecated',
        field_schema: 'bool',
        field_type: 'bool',
      });
      
      await qdrant.createPayloadIndex(config.collectionName, {
        field_name: 'isExample',
        field_schema: 'bool',
        field_type: 'bool',
      });
      
      console.log('Collection created successfully');
    } else {
      console.log(`Collection ${config.collectionName} already exists`);
    }
  } catch (error) {
    console.error('Failed to ensure collection:', error);
    throw error;
  }
}

/**
 * Index a single PSADT command in Qdrant
 * @param {Object} command - The PSADT command to index
 */
async function indexCommand(command) {
  try {
    // Prepare the text for embedding
    const commandText = [
      command.commandName,
      command.description || '',
      command.syntax || '',
      command.notes || '',
    ].filter(Boolean).join(' ');
    
    // Generate the embedding
    const embedding = await generateEmbedding(commandText);
    
    // Prepare the payload
    const payload = {
      id: command.id,
      commandName: command.commandName,
      version: command.version,
      description: command.description,
      syntax: command.syntax,
      returnValue: command.returnValue,
      notes: command.notes,
      aliases: command.aliases,
      isDeprecated: command.isDeprecated,
      mappedCommandId: command.mappedCommandId,
      templateId: command.templateId,
      parameterCount: command.parameters ? command.parameters.length : 0,
      exampleCount: command.examples ? command.examples.length : 0,
      isExample: false,
    };
    
    // Upsert the command in Qdrant
    await qdrant.upsert(config.collectionName, {
      points: [
        {
          id: command.id,
          vector: embedding,
          payload,
        },
      ],
    });
    
    console.log(`Indexed command: ${command.commandName}`);
    
    // If the command has examples, index them too
    if (command.examples && command.examples.length > 0) {
      for (const example of command.examples) {
        await indexCommandExample(command, example);
      }
    }
  } catch (error) {
    console.error(`Failed to index command ${command.commandName}:`, error);
    throw error;
  }
}

/**
 * Index a single PSADT command example in Qdrant
 * @param {Object} command - The parent PSADT command
 * @param {Object} example - The example to index
 */
async function indexCommandExample(command, example) {
  try {
    // Prepare the text for embedding
    const exampleText = [
      command.commandName,
      example.title || '',
      example.description || '',
      example.code || '',
    ].filter(Boolean).join(' ');
    
    // Generate the embedding
    const embedding = await generateEmbedding(exampleText);
    
    // Prepare the payload
    const payload = {
      id: example.id,
      commandId: command.id,
      commandName: command.commandName,
      version: command.version,
      title: example.title,
      description: example.description,
      code: example.code,
      isExample: true,
    };
    
    // Upsert the example in Qdrant
    await qdrant.upsert(config.collectionName, {
      points: [
        {
          id: `example-${example.id}`,
          vector: embedding,
          payload,
        },
      ],
    });
    
    console.log(`Indexed example for command: ${command.commandName}`);
  } catch (error) {
    console.error(`Failed to index example for command ${command.commandName}:`, error);
    throw error;
  }
}

/**
 * Sync all PSADT commands from Prisma to Qdrant
 */
async function syncCommandsToQdrant() {
  try {
    console.log('Starting sync of commands to Qdrant...');
    
    // Get all commands from Prisma with their parameters and examples
    const commands = await prisma.psadtCommand.findMany({
      include: {
        parameters: true,
        examples: true,
      },
    });
    
    console.log(`Found ${commands.length} commands to sync`);
    
    // Sync statistics
    const stats = {
      total: commands.length,
      indexed: 0,
      errors: 0,
    };
    
    // Process commands in batches to avoid memory issues
    const batchSize = 10;
    for (let i = 0; i < commands.length; i += batchSize) {
      const batch = commands.slice(i, i + batchSize);
      
      // Process each command in the batch
      for (const command of batch) {
        try {
          await indexCommand(command);
          stats.indexed++;
        } catch (error) {
          console.error(`Error indexing command ${command.commandName}:`, error);
          stats.errors++;
        }
      }
      
      console.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(commands.length / batchSize)}`);
    }
    
    console.log(`Sync completed: ${stats.indexed} commands indexed, ${stats.errors} errors`);
    return stats;
  } catch (error) {
    console.error('Failed to sync commands to Qdrant:', error);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('PSADT Qdrant Sync Tool');
    console.log('=====================');
    console.log(`Collection: ${config.collectionName}`);
    console.log(`Embedding Model: ${config.embeddingModelName}`);
    console.log(`Reset Collection: ${config.resetCollection}`);
    console.log('');
    
    // Ensure the collection exists
    await ensureCollection();
    
    // Sync commands to Qdrant
    await syncCommandsToQdrant();
    
    console.log('Sync completed successfully');
  } catch (error) {
    console.error('Sync failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the main function
main();
