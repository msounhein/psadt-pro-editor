// src/lib/psadt-qdrant-db.js
import { PrismaClient } from '@prisma/client';
import { QdrantClient } from '@qdrant/js-client-rest';
import type { EmbeddingAlgorithm } from './embedding-service';
import fs from 'fs';
import path from 'path';

// Make sure DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL environment variable is not set. Using default SQLite path.');
  process.env.DATABASE_URL = 'file:./psadt-pro.db';
}

// Load MCP Server Qdrant configuration
function getQdrantConfig() {
  try {
    const configPath = path.join(process.cwd(), 'mcp-server-qdrant.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return {
        url: config.qdrant?.url || process.env.QDRANT_URL || 'http://localhost:6333',
        apiKey: config.qdrant?.apiKey || process.env.QDRANT_API_KEY || '',
      };
    }
  } catch (error) {
    console.error('Error loading Qdrant config:', error);
  }

  // Fallback to environment variables or default
  return {
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY || '',
  };
}

// Type definitions
export type QdrantDbOptions = {
  collectionName?: string;
  embeddingAlgorithm?: EmbeddingAlgorithm;
  host?: string;
  port?: number;
};

export type SearchOptions = {
  limit?: number;
  categories?: string[];
  offset?: number;
  version?: string | number;
  
  /**
   * @deprecated This field is no longer used as examples are now included by default
   */
  includeExamples?: boolean;
};

export type SearchResult = {
  id: string;
  score: number;
  payload: Record<string, any>;
};

// Define our own types based on the database schema
export type Command = {
  id: string;
  commandName: string;
  version?: string;
  description?: string | null;
  syntax?: string | null;
  notes?: string | null;
  deprecated?: boolean;
  examples?: Example[];
  // Add any other fields from your schema
};

export type Example = {
  id: string;
  commandId: string;
  title?: string | null;
  code?: string | null;
  description?: string | null;
  // Add any other fields from your schema
};

export type CommandWithExamples = Command & {
  examples: Example[];
};

/**
 * PSADT Qdrant Database service for vector search
 */
export class PsadtQdrantDb {
  prisma: PrismaClient;
  qdrantClient: QdrantClient;
  collectionName: string;
  embeddingAlgorithm: EmbeddingAlgorithm;
  initialized: boolean = false;
  
  /**
   * Initialize a new PSADT Qdrant DB instance
   * @param options Configuration options
   */
  constructor(options: QdrantDbOptions = {}) {
    // Set default options
    const {
      collectionName = 'psadt_commands',
      embeddingAlgorithm = 'transformer',
      host,
      port
    } = options;
    
    // Set instance properties
    this.collectionName = collectionName;
    this.embeddingAlgorithm = embeddingAlgorithm;
    
    // Initialize Prisma client for SQLite
    this.prisma = new PrismaClient();

    // Get Qdrant configuration from environment or config file
    let qdrantConfig;
    
    // If host/port were explicitly provided, use them
    if (host && port) {
      qdrantConfig = {
        url: `http://${host}:${port}`
      };
    } else {
      // Otherwise load from config
      qdrantConfig = getQdrantConfig();
    }
    
    console.log(`Connecting to Qdrant server at: ${qdrantConfig.url}`);

    // Initialize Qdrant client
    this.qdrantClient = new QdrantClient({ 
      url: qdrantConfig.url,
      ...(qdrantConfig.apiKey ? { apiKey: qdrantConfig.apiKey } : {})
    });
    
    console.log(`Initialized PsadtQdrantDb with collection: ${this.collectionName}, algorithm: ${this.embeddingAlgorithm}`);
  }
  
  /**
   * Check if Prisma client is initialized and connected
   * @private
   */
  async _checkPrismaClient() {
    if (!this.prisma) {
      throw new Error('Prisma client is not initialized. Please check your database configuration.');
    }
    
    try {
      // Test the connection with a simple query
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      console.error('Failed to connect to database:', error);
      throw new Error('Database connection failed. Please check your database configuration.');
    }
  }
  
  /**
   * Initialize the Qdrant collection and embedding service
   */
  async initialize() {
    try {
      // Check if already initialized
      if (this.initialized) {
        console.log(`PsadtQdrantDb collection ${this.collectionName} already initialized`);
        return;
      }
      
      console.log(`Initializing PsadtQdrantDb for collection: ${this.collectionName}`);
      
      // Check if collection exists
      const collections = await this.qdrantClient.getCollections();
      const collectionNames = collections.collections.map(c => c.name);
      console.log(`Available collections: ${collectionNames.join(', ')}`);
      
      const collectionExists = collectionNames.includes(this.collectionName);
      
      if (!collectionExists) {
        console.warn(`Collection ${this.collectionName} does not exist, creating it now...`);
        await this.createCollection();
      } else {
        console.log(`Collection ${this.collectionName} exists, checking stats...`);
        try {
          const collectionInfo = await this.qdrantClient.getCollection(this.collectionName);
          console.log(`Collection ${this.collectionName} stats:`, {
            vectorCount: collectionInfo.vectors_count,
            status: collectionInfo.status,
          });
        } catch (error: unknown) {
          const statError = error as Error;
          console.error(`Error getting collection stats: ${statError.message}`);
        }
      }
      
      this.initialized = true;
      console.log(`PsadtQdrantDb collection ${this.collectionName} initialized successfully`);
    } catch (error) {
      console.error(`Failed to initialize PsadtQdrantDb collection ${this.collectionName}:`, error);
      throw error;
    }
  }
  
  /**
   * Create the Qdrant collection for PSADT commands
   */
  async createCollection() {
    try {
      // Create the collection with the specified vector configuration
      await this.qdrantClient.createCollection(this.collectionName, {
        vectors: {
          size: 384, // Size for sentence-transformers/all-MiniLM-L6-v2 model
          distance: 'Cosine'
        }
      });
      
      // Create payload schema with field types - first create the basic indices
      try {
        await this.qdrantClient.createPayloadIndex(this.collectionName, {
          field_name: 'commandName',
          field_schema: 'keyword'
        });
      } catch (error) {
        console.warn(`Error creating commandName index: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      try {
        await this.qdrantClient.createPayloadIndex(this.collectionName, {
          field_name: 'version',
          field_schema: 'integer'
        });
      } catch (error) {
        console.warn(`Error creating version index: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      try {
        await this.qdrantClient.createPayloadIndex(this.collectionName, {
          field_name: 'isDeprecated',
          field_schema: 'bool'
        });
      } catch (error) {
        console.warn(`Error creating isDeprecated index: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      console.log(`Collection ${this.collectionName} created successfully`);
    } catch (error) {
      console.error('Failed to create collection:', error);
      throw error;
    }
  }
  
  /**
   * Generate deterministic embeddings for text
   * @param {string} text - The text to generate embeddings for
   * @param {string} algorithm - Algorithm to use: 'original' or 'ngram'
   * @returns {Promise<number[]>} - The vector embeddings
   */
  async generateEmbedding(text: string, algorithm: string = 'original'): Promise<number[]> {
    console.log(`Generating embedding for text (length: ${text.length}) using algorithm: ${algorithm}`);
    
    if (algorithm === 'ngram') {
      // This is an improved deterministic embedding function that tries to capture
      // some semantic meaning by using character n-grams as features
      const ngrams = (str: string, n: number): string[] => {
        const result: string[] = [];
        for (let i = 0; i <= str.length - n; i++) {
          result.push(str.slice(i, i + n));
        }
        return result;
      };
      
      // Normalize and clean the text
      const normalizedText = text.toLowerCase().trim();
      
      // Generate character trigrams
      const trigrams = ngrams(normalizedText, 3);
      
      // Create a feature vector where each dimension corresponds to a specific feature
      // We'll use a hash function to map trigrams to dimensions
      const dimensions = 384;
      const vector = new Array(dimensions).fill(0);
      
      // Calculate trigram frequencies and map them to vector dimensions
      const trigramCounts: Record<string, number> = {};
      for (const trigram of trigrams) {
        trigramCounts[trigram] = (trigramCounts[trigram] || 0) + 1;
      }
      
      // Map trigrams to dimensions using a hash function
      for (const [trigram, count] of Object.entries(trigramCounts)) {
        // Hash the trigram to a dimension index
        let dimension = 0;
        for (let i = 0; i < trigram.length; i++) {
          dimension = ((dimension << 5) - dimension) + trigram.charCodeAt(i);
          dimension = dimension & dimension; // Convert to 32bit integer
        }
        
        // Ensure the dimension is within bounds
        dimension = Math.abs(dimension % dimensions);
        
        // Add the count to that dimension
        vector[dimension] += count;
      }
      
      // Special keyword boosting for PowerShell cmdlets and common terms
      const keywords = [
        'get', 'set', 'new', 'remove', 'start', 'stop', 'update', 'install',
        'uninstall', 'show', 'hide', 'enable', 'disable', 'test', 'invoke',
        'psadt', 'powershell', 'command', 'function', 'parameter'
      ];
      
      keywords.forEach((keyword, index) => {
        if (normalizedText.includes(keyword)) {
          // Hash the keyword to a dimension for consistency
          let dimension = 0;
          for (let i = 0; i < keyword.length; i++) {
            dimension = ((dimension << 5) - dimension) + keyword.charCodeAt(i);
            dimension = dimension & dimension;
          }
          dimension = Math.abs(dimension % dimensions);
          
          // Boost this dimension
          vector[dimension] += 5; // Significant boost for exact keyword matches
        }
      });
      
      // Normalize the vector to unit length (like real embeddings)
      const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
      if (magnitude === 0) {
        // If magnitude is zero, create a random vector to avoid division by zero
        return Array.from({ length: dimensions }, () => Math.random() * 2 - 1);
      }
      
      const normalizedVector = vector.map(val => val / magnitude);
      
      console.log(`Generated ngram-based embedding of dimension ${dimensions}`);
      return normalizedVector;
    }
    else {
      // Original algorithm (random-based)
      // Generate a deterministic hash from the input text
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
      
      // Generate a deterministic vector with values between -1 and 1
      const vector = Array.from({ length: 384 }, () => seededRandom() * 2 - 1);
      
      // Normalize the vector to unit length (like real embeddings)
      const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
      const normalizedVector = vector.map(val => val / magnitude);
      
      console.log(`Generated random-based embedding of dimension 384`);
      return normalizedVector;
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
  async indexCommand(command: Command): Promise<void> {
    try {
      await this.initialize();
      
      console.log(`Indexing command: ${command.id} - ${command.commandName || 'Unnamed'}`);
      
      // Ensure command has necessary fields
      if (!command.id) {
        throw new Error('Command must have an ID');
      }
      
      // Generate embedding for command text
      const textToEmbed = [
        command.commandName || '',
        command.description || '',
        command.syntax || '',
        command.notes || ''
      ].filter(Boolean).join(' ');
      
      if (!textToEmbed.trim()) {
        throw new Error(`Command ${command.id} has no text to embed`);
      }
      
      const embedding = await this.generateEmbedding(textToEmbed, this.embeddingAlgorithm);
      
      // Ensure a valid command name
      const commandName = command.commandName || `Command ID: ${command.id}`;
      
      // Create the point payload with consistent field naming
      const payload: Record<string, any> = {
        id: command.id,
        commandName: commandName,
        command_name: commandName, // Add snake_case version for consistency
        version: parseInt(command.version || '3', 10),
        description: command.description || '',
        syntax: command.syntax || '',
        notes: command.notes || '',
        isDeprecated: !!command.deprecated,
        // Add a clear identifier that this is a command
        type: 'command'
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
      
      console.log(`Indexed command: ${commandName}`);
      
      // If the command has examples, index them too
      if (command.examples && command.examples.length > 0) {
        for (const example of command.examples) {
          await this.indexCommandExample(command, example);
        }
      }
      
      return;
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
  async indexCommandExample(command: Command, example: Example): Promise<void> {
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
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
        
        // Ensure we have a valid command name
        const commandName = command.commandName || 
                           (command.id ? `Command ID: ${command.id}` : 'Unknown Command');
        
        // Prepare the payload with robust naming
        const payload: Record<string, any> = {
          id: example.id,
          commandName: commandName, 
          command_name: commandName, // Add snake_case version for consistency
          parentCommandId: command.id,
          version: command.version,
          title: example.title || '',
          description: example.description || '',
          code: example.code || '',
          isDeprecated: !!command.deprecated,
          // Add a clear identifier that this is an example
          type: 'example'
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
        
        console.log(`Indexed example for command: ${commandName}`);
        return;
      } catch (error) {
        lastError = error as Error;
        console.error(`Failed to index example for command ${command.commandName} (attempt ${attempt}/${maxRetries}):`, error);
        
        // If this wasn't the last attempt, wait before retrying
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`Retrying in ${delay/1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // If we get here, all retries failed
    throw lastError;
  }
  
  /**
   * Search for PSADT commands using semantic search
   * @param {string} query - The search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} - Search results
   */
  async searchCommands(query: string, options: SearchOptions = {}): Promise<any[]> {
    try {
      console.log(`searchCommands called with query: "${query}" in collection: ${this.collectionName}`);
      console.log(`Search options:`, JSON.stringify(options, null, 2));
      
      await this.initialize();
      
      // Generate embedding for the query
      const embedding = await this.generateEmbedding(query);
      
      // Build filter based on options
      const filter: { must: any[] } = {
        must: []
      };
      
      // Add version filter if specified
      if (options.version) {
        console.log(`Adding version filter: ${options.version}`);
        filter.must.push({
          key: 'version',
          match: {
            value: String(options.version),
          },
        });
      }
      
      // Search options
      const searchOptions: any = {
        vector: embedding,
        limit: options.limit || 10,
        offset: options.offset || 0,
        with_payload: true,
        with_vectors: false,
      };
      
      // Add filter if there are any conditions
      if (filter.must.length > 0) {
        searchOptions.filter = filter;
        console.log('Using filter:', JSON.stringify(filter, null, 2));
      }
      
      console.log(`Performing search in ${this.collectionName} with limit: ${searchOptions.limit}`);
      
      // Perform the search
      const response = await this.qdrantClient.search(this.collectionName, searchOptions);
      
      console.log(`Search completed. Found ${response.length} results`);
      
      // Log the first result for debugging
      if (response.length > 0) {
        console.log('First result sample:', JSON.stringify(response[0], null, 2));
      }
      
      // Format the results
      const formattedResults = response.map(item => {
        // For debugging
        const result = {
          ...item.payload,
          score: item.score,
        };
        return result;
      });
      
      return formattedResults;
    } catch (error) {
      console.error('Failed to search commands:', error);
      throw error;
    }
  }
  
  /**
   * Search for PSADT commands using a pre-generated embedding
   * @param {number[]} embedding - The pre-generated embedding vector
   * @param {Object} options - Search options
   * @returns {Promise<Array>} - Search results
   */
  async searchWithEmbedding(embedding: number[], options: SearchOptions = {}): Promise<any[]> {
    try {
      console.log(`searchWithEmbedding called with options:`, JSON.stringify(options, null, 2));
      
      await this.initialize();
      
      // Build filter based on options
      const filter: { must: any[] } = {
        must: []
      };
      
      // Add version filter if specified
      if (options.version) {
        console.log(`Adding version filter: ${options.version}`);
        filter.must.push({
          key: 'version',
          match: {
            value: String(options.version),
          }
        });
      }
      
      // Search options
      const searchOptions: any = {
        vector: embedding,
        limit: options.limit || 10,
        offset: options.offset || 0,
        with_payload: true,
        with_vectors: false,
      };
      
      // Add filter if there are any conditions
      if (filter.must.length > 0) {
        searchOptions.filter = filter;
        console.log('Using filter:', JSON.stringify(filter, null, 2));
      }
      
      console.log(`Performing search in ${this.collectionName} with limit: ${searchOptions.limit}`);
      
      // Perform the search
      const response = await this.qdrantClient.search(this.collectionName, searchOptions);
      
      console.log(`Search completed. Found ${response.length} results`);
      
      // Log the first result for debugging
      if (response.length > 0) {
        console.log('First result sample:', JSON.stringify(response[0], null, 2));
      }
      
      // Format the results
      const formattedResults = response.map(item => {
        // Ensure payload has necessary fields
        const payload = item.payload || {};
        
        // More robust command name handling
        let commandName = payload.commandName || payload.command_name;
        
        // If commandName still doesn't exist, derive it from other fields
        if (!commandName) {
          // Check the type field first
          if (payload.type === 'example') {
            commandName = payload.title ? 
              `Example: ${payload.title}` : 
              (payload.parentCommandId ? `Example for command ID: ${payload.parentCommandId}` : 'Example');
          } 
          else if (payload.type === 'command') {
            commandName = payload.id ? `Command ID: ${payload.id}` : 'Command';
          }
          // If no type field, try to infer from other fields
          else if (payload.title) {
            commandName = `Example: ${payload.title}`;
          }
          else if (payload.parentCommandId) {
            commandName = `Example for command ID: ${payload.parentCommandId}`;
          }
          else if (payload.id) {
            commandName = `Command ID: ${payload.id}`;
          }
          else {
            commandName = 'Command';
          }
        }
        
        // Format the score for display
        const scoreDisplay = (item.score * 100).toFixed(1) + '%';
        
        // For debugging
        const result = {
          ...payload,
          commandName, // Ensure commandName is set
          score: item.score,
          scoreDisplay, // Add formatted score
        };
        
        return result;
      });
      
      return formattedResults;
    } catch (error) {
      console.error('Failed to search with embedding:', error);
      throw error;
    }
  }
  
  /**
   * Find similar commands based on a command ID
   * @param {string} commandId - The ID of the command
   * @param {Object} options - Search options
   * @returns {Promise<Array>} - Similar commands
   */
  async findSimilarCommands(commandId: string, options: SearchOptions = {}): Promise<any[]> {
    try {
      await this.initialize();
      
      // Get the vector for the specified command
      const points = await this.qdrantClient.retrieve(this.collectionName, {
        ids: [commandId],
        with_vector: true, // Correct property name
      });
      
      if (points.length === 0) {
        throw new Error(`Command with ID ${commandId} not found`);
      }
      
      const vector = points[0].vector;
      
      // Build filter
      const filter: { must: any[] } = {
        must: [
          // Exclude the original command
          {
            key: 'id',
            match: {
              value: commandId,
              is_negated: true,
            },
          }
        ]
      };
      
      // Add version filter if specified
      if (options.version) {
        filter.must.push({
          key: 'version',
          match: {
            value: String(options.version),
            is_negated: false,
          },
        });
      }
      
      // Search options
      const searchOptions: any = {
        vector,
        limit: options.limit || 5,
        with_payload: true,
        filter,
      };
      
      // Search for similar commands
      const response = await this.qdrantClient.search(this.collectionName, searchOptions);
      
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
  async getContextualSuggestions(codeContext: string, options: Record<string, any> = {}): Promise<any[]> {
    try {
      await this.initialize();
      
      // Generate embedding for the code context
      const embedding = await this.generateEmbedding(codeContext);
      
      // Build filter based on options
      const filter: { must: any[] } = {
        must: [
          // Always filter to version 4 only
          {
            key: 'version',
            match: {
              value: '4',
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
      const searchOptions: any = {
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
  async deleteCommand(commandId: string): Promise<boolean> {
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
  async getCollectionStats(): Promise<Record<string, any>> {
    try {
      await this.initialize();
      
      const collectionInfo = await this.qdrantClient.getCollection(this.collectionName);
      
      return {
        vectorCount: collectionInfo.vectors_count,
        segmentCount: collectionInfo.segments_count,
        status: collectionInfo.status,
        dimensionality: 384,
        // Use optional chaining to safely access potentially missing properties
        diskUsage: (collectionInfo as any).disk_data_size || 0,
        ramUsage: (collectionInfo as any).ram_data_size || 0,
      };
    } catch (error) {
      console.error('Failed to get collection stats:', error);
      throw error;
    }
  }
  
  /**
   * Index a command with a pre-generated embedding
   * @param {Object} command - The command to index
   * @param {number[]} embedding - The pre-generated embedding
   * @returns {Promise<void>}
   */
  async indexWithEmbedding(command: Command, embedding: number[]): Promise<void> {
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Ensure a valid command name
        const commandName = command.commandName || 
                           (command.id ? `Command ID: ${command.id}` : 'Unknown Command');
        
        // Prepare the payload with consistent field naming
        const payload: Record<string, any> = {
          id: command.id,
          commandName: commandName,
          command_name: commandName, // Add snake_case version for consistency
          version: command.version,
          description: command.description || '',
          syntax: command.syntax || '',
          notes: command.notes || '',
          isDeprecated: !!command.deprecated,
          // Add a clear identifier that this is a command
          type: 'command'
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
        
        console.log(`Indexed command: ${commandName} with external embedding (${embedding.length} dimensions)`);
        
        // If the command has examples, index them too
        if (command.examples && command.examples.length > 0) {
          for (const example of command.examples) {
            await this.indexExampleWithEmbedding(command, example, embedding);
          }
        }
        
        return;
      } catch (error) {
        lastError = error as Error;
        console.error(`Failed to index command ${command.commandName} (attempt ${attempt}/${maxRetries}):`, error);
        
        // If this wasn't the last attempt, wait before retrying
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`Retrying in ${delay/1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // If we get here, all retries failed
    throw lastError;
  }
  
  /**
   * Index an example with a pre-generated embedding
   * @param {Object} command - The parent command
   * @param {Object} example - The example to index
   * @param {number[]} embedding - The pre-generated embedding
   * @returns {Promise<void>}
   */
  async indexExampleWithEmbedding(command: Command, example: Example, embedding: number[]): Promise<void> {
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Ensure we have a valid command name
        const commandName = command.commandName || 
                          (command.id ? `Command ID: ${command.id}` : 'Unknown Command');
        
        // Prepare the payload with consistent field naming
        const payload: Record<string, any> = {
          id: example.id,
          commandName: commandName,
          command_name: commandName, // Add snake_case version for consistency
          parentCommandId: command.id,
          version: command.version,
          title: example.title || '',
          description: example.description || '',
          code: example.code || '',
          isDeprecated: !!command.deprecated,
          // Add a clear identifier that this is an example
          type: 'example'
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
        
        console.log(`Indexed example for command: ${commandName} with external embedding`);
        return;
      } catch (error) {
        lastError = error as Error;
        console.error(`Failed to index example for command ${command.commandName} (attempt ${attempt}/${maxRetries}):`, error);
        
        // If this wasn't the last attempt, wait before retrying
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`Retrying in ${delay/1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // If we get here, all retries failed
    throw lastError;
  }

  /**
   * Perform hybrid search combining direct command name matching with vector similarity
   * @param query - The search query string
   * @param embedding - Pre-generated embedding for the query
   * @param options - Search options
   * @returns Array of search results with prioritized exact matches
   */
  async hybridSearch(query: string, embedding: number[], options: SearchOptions = {}): Promise<any[]> {
    try {
      console.log(`Hybrid search called with query: "${query}"`);
      await this.initialize();
      
      // Normalize the query - lowercase, trim whitespace
      const normalizedQuery = query.toLowerCase().trim();
      
      // Check if the query looks like a command name (contains a dash)
      const isCommandQuery = normalizedQuery.includes('-');
      
      // Results we'll combine
      let directResults: any[] = [];
      let vectorResults: any[] = [];
      
      // 1. If query looks like a command name, try direct command name search first
      if (isCommandQuery) {
        try {
          console.log(`Query "${normalizedQuery}" looks like a command name, trying direct search first`);
          directResults = await this.searchByCommandName(normalizedQuery, {
            ...options,
            limit: 5 // Limit direct results
          });
          console.log(`Direct search found ${directResults.length} results`);
        } catch (directSearchError) {
          console.error('Direct search failed, falling back to vector search:', directSearchError);
        }
      }
      
      // 2. Perform vector semantic search
      vectorResults = await this.searchWithEmbedding(embedding, {
        ...options,
        // Increase limit to ensure we get enough results to rerank
        limit: Math.max((options.limit || 10) * 3, 30)
      });
      
      console.log(`Vector search returned ${vectorResults.length} results`);
      
      // 3. Rerank vector results based on command name matches
      const rerankedVectorResults = vectorResults.map(result => {
        const commandName = (result.commandName || '').toLowerCase();
        let boostFactor = 1.0; // Default no boost
        
        // a. Exact match - highest boost
        if (commandName === normalizedQuery) {
          boostFactor = 2.5; // 2.5x boost
          console.log(`Exact match boost for: ${result.commandName}`);
        }
        // b. Starts with query - high boost
        else if (commandName.startsWith(normalizedQuery)) {
          boostFactor = 2.0; // 2x boost
          console.log(`Starts with boost for: ${result.commandName}`);
        }
        // c. Contains query as a word - medium boost
        else if (commandName.includes(`-${normalizedQuery}`) || 
                 commandName.includes(`${normalizedQuery}-`)) {
          boostFactor = 1.75; // 75% boost
          console.log(`Contains word boost for: ${result.commandName}`);
        }
        // d. Contains query - small boost
        else if (commandName.includes(normalizedQuery)) {
          boostFactor = 1.5; // 50% boost
          console.log(`Contains boost for: ${result.commandName}`);
        }
        // e. Special case for "Get-ADT" style queries - check if command contains all parts
        else if (isCommandQuery) {
          const queryParts = normalizedQuery.split('-');
          if (queryParts.length === 2) {
            const [verb, noun] = queryParts;
            if (commandName.includes(verb) && commandName.includes(noun)) {
              boostFactor = 1.25; // 25% boost
              console.log(`Contains all parts boost for: ${result.commandName}`);
            }
          }
        }
        
        // Apply the boost factor
        const boostedScore = Math.min(result.score * boostFactor, 1.0); // Cap at 1.0
        
        return {
          ...result,
          originalScore: result.score,
          score: boostedScore,
          scoreDisplay: (boostedScore * 100).toFixed(1) + '%',
          boosted: boostFactor > 1.0,
          boostFactor: boostFactor
        };
      });
      
      // 4. Sort reranked vector results by score
      rerankedVectorResults.sort((a, b) => b.score - a.score);
      
      // 5. Combine results: direct matches first, then vector matches
      // Create a set of IDs from direct results to avoid duplicates
      const directResultIds = new Set(directResults.map(r => r.id));
      
      // Filter out any vector results that are already in direct results
      const filteredVectorResults = rerankedVectorResults.filter(r => !directResultIds.has(r.id));
      
      // Combine the results
      const combinedResults = [...directResults, ...filteredVectorResults];
      
      // 6. Return limited results
      return combinedResults.slice(0, options.limit || 10);
    } catch (error) {
      console.error('Failed to perform hybrid search:', error);
      throw error;
    }
  }

  /**
   * Search for commands by exact command name matching
   * This provides fast, exact matching for command names
   * @param query The command name to search for
   * @param options Search options
   * @returns Promise with search results
   */
  async searchByCommandName(query: string, options: SearchOptions = {}): Promise<any[]> {
    try {
      console.log(`Command name search called with query: "${query}"`);
      await this.initialize();

      // Build filter for command name matching
      const normalizedQuery = query.toLowerCase().trim();
      
      // Set up filter for prefix match only
      const filter: any = {
        should: [
          // Prefix match on command_name (using prefix filter)
          {
            key: 'command_name', // Check snake_case field
            prefix: {
              value: normalizedQuery // Ensure value is lowercase
            }
          },
          // Prefix match on commandName (using prefix filter)
          {
            key: 'commandName', // Check camelCase field
            prefix: {
              value: normalizedQuery // Ensure value is lowercase
            }
          }
        ]
      };
      
      // Add version filter if specified
      if (options.version) {
        console.log(`Adding version filter: ${options.version}`);
        filter.must = [
          {
            key: 'version',
            match: {
              value: String(options.version),
            }
          }
        ];
      }
      
      // Search options
      const searchOptions: any = {
        filter,
        limit: options.limit || 10,
        offset: options.offset || 0,
        with_payload: true,
      };
      
      console.log(`Performing direct command name search in ${this.collectionName}`);
      
      // Perform the search (using scroll since we're not using vectors)
      const response = await this.qdrantClient.scroll(this.collectionName, searchOptions);
      
      console.log(`Command name search completed. Found ${response.points.length} results`);
      
      // Format the results similar to searchWithEmbedding
      const formattedResults = response.points.map(item => {
        // Extract the payload
        const payload = item.payload || {};
        
        // Determine command name
        let commandName = payload.commandName || payload.command_name;
        if (!commandName) {
          if (payload.type === 'example') {
            commandName = payload.title ? 
              `Example: ${payload.title}` : 
              (payload.parentCommandId ? `Example for command ID: ${payload.parentCommandId}` : 'Example');
          } else if (payload.id) {
            commandName = `Command ID: ${payload.id}`;
          } else {
            commandName = 'Command';
          }
        }
        
        // Calculate a "score" based on match quality
        let score = 1.0; // Perfect score for exact matches
        if (!payload.commandName || typeof payload.commandName !== 'string' || 
            !payload.commandName.toLowerCase().startsWith(normalizedQuery)) {
          // Slight penalty for non-exact matches
          score = 0.95;
        }
        
        return {
          ...payload,
          id: item.id,
          commandName,
          score,
          scoreDisplay: (score * 100).toFixed(1) + '%',
          exactMatch: true
        };
      });
      
      return formattedResults;
    } catch (error) {
      console.error('Failed to search by command name:', error);
      throw error;
    }
  }
}

// Export a singleton instance
let instance: PsadtQdrantDb | null = null;

/**
 * Get or create the singleton instance of PsadtQdrantDb
 * @param {Object} config - Configuration object
 * @returns {PsadtQdrantDb} - The singleton instance
 */
export function getPsadtQdrantDb(config: QdrantDbOptions = {}): PsadtQdrantDb {
  try {
    // If instance exists but collection name is different, update the collection name
    if (instance && config.collectionName && instance.collectionName !== config.collectionName) {
      console.log(`Switching collection from ${instance.collectionName} to ${config.collectionName}`);
      instance.collectionName = config.collectionName;
      // Reset initialization to make sure we check the new collection on next use
      instance.initialized = false;
    }
    
    // If instance doesn't exist, create it
    if (!instance) {
      instance = new PsadtQdrantDb(config);
    }
    
    return instance;
  } catch (error) {
    console.error('Error in getPsadtQdrantDb:', error);
    
    // Create a fallback instance with the default collection if there's an error
    if (!instance) {
      console.warn('Creating fallback instance with default collection');
      instance = new PsadtQdrantDb({ 
        collectionName: 'psadt_commands',
        embeddingAlgorithm: 'transformer' 
      });
    }
    
    return instance;
  }
}

// Export the class for testing
export default PsadtQdrantDb;
