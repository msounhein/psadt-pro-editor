/**
 * Embedding Service
 * 
 * A service for generating and managing embeddings using fastembed
 */

import { EmbeddingModel, FlagEmbedding } from 'fastembed';

let embeddingModel = null;
let initializationPromise = null;

/**
 * Initialize the embedding model
 * @returns {Promise<Object>} The initialized embedding model
 */
export async function initializeEmbedding() {
  if (embeddingModel) {
    return embeddingModel;
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  console.log('Initializing embedding model...');
  
  initializationPromise = FlagEmbedding.init({
    model: EmbeddingModel.BGEBaseEN,
    // Optionally use a local model path
    // modelPath: '/path/to/local/model'
  }).then(model => {
    console.log('Embedding model initialized successfully');
    embeddingModel = model;
    return model;
  }).catch(error => {
    console.error('Error initializing embedding model:', error);
    initializationPromise = null;
    throw error;
  });

  return initializationPromise;
}

/**
 * Generate embeddings for documents
 * @param {string[]} documents - Array of text documents to embed
 * @param {number} batchSize - Batch size for processing (optional)
 * @returns {Promise<number[][]>} Array of embeddings
 */
export async function generateEmbeddings(documents, batchSize = 32) {
  const model = await initializeEmbedding();
  
  const embeddings = [];
  const embeddingGenerator = model.embed(documents, batchSize);
  
  for await (const batch of embeddingGenerator) {
    embeddings.push(...batch);
  }
  
  return embeddings;
}

/**
 * Generate embedding for a query
 * @param {string} query - Query text to embed
 * @returns {Promise<number[]>} Query embedding
 */
export async function generateQueryEmbedding(query) {
  const model = await initializeEmbedding();
  return await model.queryEmbed(query);
}

/**
 * Calculate cosine similarity between two embeddings
 * @param {number[]} embedding1 - First embedding
 * @param {number[]} embedding2 - Second embedding
 * @returns {number} Similarity score between 0 and 1
 */
export function calculateSimilarity(embedding1, embedding2) {
  if (!embedding1 || !embedding2 || embedding1.length !== embedding2.length) {
    return 0;
  }

  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    magnitude1 += embedding1[i] * embedding1[i];
    magnitude2 += embedding2[i] * embedding2[i];
  }

  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);

  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0;
  }

  return dotProduct / (magnitude1 * magnitude2);
}

/**
 * Search for similar documents using embeddings
 * @param {string} query - Query text
 * @param {Object[]} documents - Array of document objects
 * @param {string} textField - Field name containing the document text
 * @param {number} topK - Number of results to return
 * @returns {Promise<Object[]>} Array of search results with similarity scores
 */
export async function searchSimilarDocuments(query, documents, textField = 'text', topK = 5) {
  if (!documents || documents.length === 0) {
    return [];
  }

  // Get document texts
  const docTexts = documents.map(doc => doc[textField]);
  
  // Generate embeddings
  const queryEmbedding = await generateQueryEmbedding(query);
  const docEmbeddings = await generateEmbeddings(docTexts);
  
  // Calculate similarities
  const results = documents.map((doc, i) => {
    const similarity = calculateSimilarity(queryEmbedding, docEmbeddings[i]);
    return {
      ...doc,
      similarity
    };
  });
  
  // Sort by similarity (highest first)
  results.sort((a, b) => b.similarity - a.similarity);
  
  // Return top K results
  return results.slice(0, topK);
}
