// src/lib/psadt-qdrant-db.js
import { QdrantClient } from '@qdrant/js-client-rest';
import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';

// Make sure DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL environment variable is not set. Using default SQLite path.');
  process.env.DATABASE_URL = 'file:./psadt-pro.db';
}

/**
 * PSADT Qdrant Database Service
 * Handles integration between Prisma database and Qdrant vector database
 * for semantic search capabilities
 */
export class PsadtQdrantDb {
  constructor(config = {}) {
    // Initialize Qdrant client
    this.qdrantClient = new QdrantClient({
      url: config.qdrantUrl || process.env.QDRANT_URL,
      apiKey: config.qdrantApiKey || process.env.QDRANT_API_KEY,
    });
    
    // Initialize Prisma client with error handling
    try {
      this.prisma = new PrismaClient();
    } catch (error) {
      console.error('Failed to initialize Prisma:', error);
      this.prisma = null;
    }
    
    // Collection settings
    this.collectionName = config.collectionName || 'psadt_commands';
    this.embeddingModelName = config.embeddingModelName || 'sentence-transformers/all-MiniLM-L6-v2';
    this.embeddingDimension = 384; // Dimension for the MiniLM-L6-v2 model
    
    // Embedding service configuration
    this.useLocalEmbeddings = config.useLocalEmbeddings !== false; // Default to true
    this.localEmbeddingService = null;
    
    // Initialize collections
    this.initialized = false;
  }
  
  /**
   * Initialize the Qdrant collection and embedding service
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      // Check if collection exists
      const collections = await this.qdrantClient.getCollections();
      const collectionExists = collections.collections && 
                              collections.collections.some(c => c.name === this.collectionName);
      
      if (!collectionExists) {
        console.log(`Creating Qdrant collection: ${this.collectionName}`);
        await this.createCollection();
      }
      
      // Initialize local embedding service if enabled
      if (this.useLocalEmbeddings) {
        try {
          console.log('Initializing local embedding service...');
          const { getLocalEmbeddingService } = await import('./local-embedding-service.js');
          const embeddingService = getLocalEmbeddingService({ 
            modelName: this.embeddingModelName,
            debug: true // Enable debug mode
          });
          await embeddingService.initialize();
          console.log('Local embedding service initialized successfully');
        } catch (error) {
          console.error('Failed to initialize local embedding service:', error);
          console.warn('Falling back to deterministic random embeddings');
          this.useLocalEmbeddings = false;
        }
      }
      
      this.initialized = true;
      console.log('PSADT Qdrant Database Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize PSADT Qdrant Database:', error);
      throw error;
    }
  }
  
  /**
   * Create the Qdrant collection for PSADT commands
   */
  async createCollection() {
    try {
      await this.qdrantClient.createCollection(this.collectionName, {
        vectors: {
          size: this.embeddingDimension,
          distance: 'Cosine',
        },
        optimizers_config: {
          default_segment_number: 2,
        },
        replication_factor: 1,
      });
      
      // Create payload schema with field types
      await this.qdrantClient.createPayloadIndex(this.collectionName, {
        field_name: 'commandName',
        field_schema: 'keyword',
        field_type: 'text',
      });
      
      await this.qdrantClient.createPayloadIndex(this.collectionName, {
        field_name: 'version',
        field_schema: 'integer',
        field_type: 'integer',
      });
      
      await this.qdrantClient.createPayloadIndex(this.collectionName, {
        field_name: 'isDeprecated',
        field_schema: 'bool',
        field_type: 'bool',
      });
      
      await this.qdrantClient.createPayloadIndex(this.collectionName, {
        field_name: 'isExample',
        field_schema: 'bool',
        field_type: 'bool',
      });
      
      console.log(`Collection ${this.collectionName} created successfully`);
    } catch (error) {
      console.error('Failed to create collection:', error);
      throw error;
    }
  }
  
  /**
   * Generate embeddings for text using local sentence-transformers model
   * @param {string} text - The text to generate embeddings for
   * @returns {Promise<number[]>} - The vector embeddings
   */
  async generateEmbedding(text) {
    try {
      // Import local embedding service (dynamic import to avoid circular dependencies)
      const { getLocalEmbeddingService } = await import('./local-embedding-service.js');
      
      // Get the embedding service instance
      const embeddingService = getLocalEmbeddingService();
      
      // Generate the embedding
      const embedding = await embeddingService.generateEmbeddings(text);
      
      // Return the embedding
      return embedding;
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      console.warn('Falling back to deterministic random embeddings');
      
      // Fallback to deterministic random embeddings if the local service fails
      let hash = 0;
      for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      
      // Seed the random number generator with the hash
      const seededRandom = function() {
        const x = Math.sin(hash++) * 10000;
        return x - Math.floor(x);
      };
      
      return Array.from({ length: this.embeddingDimension }, () => seededRandom() * 2 - 1);
    }
  }
  
  /**
   * Sync all PSADT commands from Prisma to Qdrant
   * @returns {Promise<{ total: number, indexed: number, errors: number }>} - Sync statistics
   */
  async syncCommandsToQdrant() {
    try {
      await this.initialize();
      
      // Get all commands from Prisma with their parameters and examples
      const commands = await this.prisma.psadtCommand.findMany({
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
        const batchPromises = batch.map(async (command) => {
          try {
            await this.indexCommand(command);
            stats.indexed++;
          } catch (error) {
            console.error(`Error indexing command ${command.commandName}:`, error);
            stats.errors++;
          }
        });
        
        // Wait for all commands in the batch to be processed
        await Promise.all(batchPromises);
        
        console.log(`Processed batch ${i / batchSize + 1}/${Math.ceil(commands.length / batchSize)}`);
      }
      
      console.log(`Sync completed: ${stats.indexed} commands indexed, ${stats.errors} errors`);
      return stats;
    } catch (error) {
      console.error('Failed to sync commands to Qdrant:', error);
      throw error;
    }
  }
  
  /**
   * Index a single PSADT command in Qdrant
   * @param {Object} command - The PSADT command to index
   * @returns {Promise<void>}
   */
  async indexCommand(command) {
    try {
      // Prepare the text for embedding
      // Combine the command name, description, and syntax
      const commandText = [
        command.commandName,
        command.description || '',
        command.syntax || '',
        command.notes || '',
      ].filter(Boolean).join(' ');
      
      // Generate the embedding
      const embedding = await this.generateEmbedding(commandText);
      
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
      await this.qdrantClient.upsert(this.collectionName, {
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
          await this.indexCommandExample(command, example);
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
   * @returns {Promise<void>}
   */
  async indexCommandExample(command, example) {
    try {
      // Prepare the text for embedding
      const exampleText = [
        command.commandName,
        example.title || '',
        example.description || '',
        example.code || '',
      ].filter(Boolean).join(' ');
      
      // Generate the embedding
      const embedding = await this.generateEmbedding(exampleText);
      
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
      await this.qdrantClient.upsert(this.collectionName, {
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
   * Search for PSADT commands using semantic search
   * @param {string} query - The search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} - Search results
   */
  async searchCommands(query, options = {}) {
    try {
      await this.initialize();
      
      // Generate embedding for the query
      const embedding = await this.generateEmbedding(query);
      
      // Build filter based on options
      const filter = {
        must: [
          // Always filter to version 4 only
          {
            key: 'version',
            match: {
              value: 4,
            },
          }
        ]
      };
      
      // Version filter is now hardcoded to 4
      
      // Add deprecated filter if specified
      if (options.includeDeprecated === false) {
        filter.must.push({
          key: 'isDeprecated',
          match: {
            value: false,
          },
        });
      }
      
      // Add examples filter if specified
      if (options.includeExamples === false) {
        filter.must.push({
          key: 'isExample',
          match: {
            value: false,
          },
        });
      } else if (options.onlyExamples === true) {
        filter.must.push({
          key: 'isExample',
          match: {
            value: true,
          },
        });
      }
      
      // Search options
      const searchOptions = {
        vector: embedding,
        limit: options.limit || 10,
        offset: options.offset || 0,
        with_payload: true,
        with_vectors: false,
      };
      
      // Add filter if there are any conditions
      if (filter.must.length > 0) {
        searchOptions.filter = filter;
      }
      
      // Perform the search
      const response = await this.qdrantClient.search(this.collectionName, searchOptions);
      
      // Format the results
      return response.map(item => ({
        ...item.payload,
        score: item.score,
      }));
    } catch (error) {
      console.error('Failed to search commands:', error);
      throw error;
    }
  }
  
  /**
   * Find similar commands based on a command ID
   * @param {string} commandId - The ID of the command
   * @param {Object} options - Search options
   * @returns {Promise<Array>} - Similar commands
   */
  async findSimilarCommands(commandId, options = {}) {
    try {
      await this.initialize();
      
      // Get the vector for the specified command
      const points = await this.qdrantClient.retrieve(this.collectionName, {
        ids: [commandId],
        with_vectors: true,
      });
      
      if (points.length === 0) {
        throw new Error(`Command with ID ${commandId} not found`);
      }
      
      const vector = points[0].vector;
      
      // Build filter
      const filter = {
        must: [
          // Exclude the original command
          {
            key: 'id',
            match: {
              value: commandId,
              is_negated: true,
            },
          },
          // Always filter to version 4 only
          {
            key: 'version',
            match: {
              value: 4,
            },
          }
        ]
      };
      
      // Add examples filter if specified
      if (options.includeExamples === false) {
        filter.must.push({
          key: 'isExample',
          match: {
            value: false,
          },
        });
      }
      
      // Search for similar commands
      const response = await this.qdrantClient.search(this.collectionName, {
        vector,
        limit: options.limit || 5,
        with_payload: true,
        filter,
      });
      
      // Format the results
      return response.map(item => ({
        ...item.payload,
        score: item.score,
      }));
    } catch (error) {
      console.error('Failed to find similar commands:', error);
      throw error;
    }
  }
  
  /**
   * Get contextual suggestions based on code context
   * @param {string} codeContext - The code context
   * @param {Object} options - Suggestion options
   * @returns {Promise<Array>} - Suggestions
   */
  async getContextualSuggestions(codeContext, options = {}) {
    try {
      await this.initialize();
      
      // Generate embedding for the code context
      const embedding = await this.generateEmbedding(codeContext);
      
      // Build filter based on options
      const filter = {
        must: [
          // Always filter to version 4 only
          {
            key: 'version',
            match: {
              value: 4,
            },
          }
        ]
      };
      
      // Add deprecated filter
      if (options.includeDeprecated !== true) {
        filter.must.push({
          key: 'isDeprecated',
          match: {
            value: false,
          },
        });
      }
      
      // Search options
      const searchOptions = {
        vector: embedding,
        limit: options.limit || 5,
        with_payload: true,
        with_vectors: false,
      };
      
      // Add filter if there are any conditions
      if (filter.must.length > 0) {
        searchOptions.filter = filter;
      }
      
      // Perform the search
      const response = await this.qdrantClient.search(this.collectionName, searchOptions);
      
      // Format the results
      return response.map(item => ({
        ...item.payload,
        score: item.score,
      }));
    } catch (error) {
      console.error('Failed to get contextual suggestions:', error);
      throw error;
    }
  }
  
  /**
   * Delete a command from Qdrant
   * @param {string} commandId - The ID of the command to delete
   * @returns {Promise<boolean>} - Success status
   */
  async deleteCommand(commandId) {
    try {
      await this.initialize();
      
      // Delete the command
      await this.qdrantClient.delete(this.collectionName, {
        points: [commandId],
      });
      
      // Delete associated examples
      const examples = await this.prisma.psadtExample.findMany({
        where: {
          commandId,
        },
      });
      
      for (const example of examples) {
        await this.qdrantClient.delete(this.collectionName, {
          points: [`example-${example.id}`],
        });
      }
      
      console.log(`Deleted command ${commandId} and its examples from Qdrant`);
      return true;
    } catch (error) {
      console.error(`Failed to delete command ${commandId}:`, error);
      throw error;
    }
  }
  
  /**
   * Delete the entire Qdrant collection and recreate it
   * @returns {Promise<boolean>} - Success status
   */
  async resetCollection() {
    try {
      await this.initialize();
      
      console.log(`Deleting collection ${this.collectionName}...`);
      await this.qdrantClient.deleteCollection(this.collectionName);
      
      console.log(`Recreating collection ${this.collectionName}...`);
      await this.createCollection();
      
      console.log('Collection reset successfully');
      return true;
    } catch (error) {
      console.error('Failed to reset collection:', error);
      throw error;
    }
  }
  
  /**
   * Get collection statistics
   * @returns {Promise<Object>} - Statistics
   */
  async getCollectionStats() {
    try {
      await this.initialize();
      
      const collectionInfo = await this.qdrantClient.getCollection(this.collectionName);
      
      return {
        vectorCount: collectionInfo.vectors_count,
        segmentCount: collectionInfo.segments_count,
        status: collectionInfo.status,
        dimensionality: this.embeddingDimension,
        diskUsage: collectionInfo.disk_data_size,
        ramUsage: collectionInfo.ram_data_size,
      };
    } catch (error) {
      console.error('Failed to get collection stats:', error);
      throw error;
    }
  }
}

// Export a singleton instance
let instance = null;
export function getPsadtQdrantDb(config) {
  if (!instance) {
    instance = new PsadtQdrantDb(config);
  }
  return instance;
}

// Export the class for testing
export default PsadtQdrantDb;
