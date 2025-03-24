// src/lib/psadt-qdrant-api.js

/**
 * PSADT Qdrant API Client
 * Client-side API for interacting with the PSADT Qdrant service
 */
export class PsadtQdrantApi {
  constructor() {
    // Cache for frequent queries
    this.cache = new Map();
    this.cacheTTL = 1000 * 60 * 10; // 10 minute cache TTL
  }
  
  /**
   * Search for PSADT commands using semantic search
   * @param {string} query - The search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} - Search results
   */
  async searchCommands(query, options = {}) {
    try {
      // Check cache first
      const cacheKey = `search-${query}-${JSON.stringify(options)}`;
      const cachedResult = this.getCachedResult(cacheKey);
      if (cachedResult) return cachedResult;
      
      // Make API request
      const response = await fetch('/api/psadt-qdrant/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          options,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to search commands');
      }
      
      const data = await response.json();
      
      // Cache the result
      this.setCachedResult(cacheKey, data.results);
      
      return data.results;
    } catch (error) {
      console.error('Failed to search commands:', error);
      throw error;
    }
  }
  
  /**
   * Find similar commands to a given command
   * @param {string} commandId - The ID of the command
   * @param {Object} options - Search options
   * @returns {Promise<Array>} - Similar commands
   */
  async findSimilarCommands(commandId, options = {}) {
    try {
      // Check cache first
      const cacheKey = `similar-${commandId}-${JSON.stringify(options)}`;
      const cachedResult = this.getCachedResult(cacheKey);
      if (cachedResult) return cachedResult;
      
      // Make API request
      const response = await fetch('/api/psadt-qdrant/similar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commandId,
          options,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to find similar commands');
      }
      
      const data = await response.json();
      
      // Cache the result
      this.setCachedResult(cacheKey, data.results);
      
      return data.results;
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
      // For context, we don't cache as the context might change frequently
      
      // Make API request
      const response = await fetch('/api/psadt-qdrant/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          codeContext,
          options,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get contextual suggestions');
      }
      
      const data = await response.json();
      return data.results;
    } catch (error) {
      console.error('Failed to get contextual suggestions:', error);
      throw error;
    }
  }
  
  /**
   * Sync commands from Prisma to Qdrant
   * @param {boolean} reset - Whether to reset the collection before syncing
   * @returns {Promise<Object>} - Sync statistics
   */
  async syncCommands(reset = false) {
    try {
      // Make API request
      const response = await fetch('/api/psadt-qdrant/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reset,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sync commands');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to sync commands:', error);
      throw error;
    }
  }
  
  /**
   * Get Qdrant collection statistics
   * @returns {Promise<Object>} - Collection statistics
   */
  async getStats() {
    try {
      // Make API request
      const response = await fetch('/api/psadt-qdrant/sync', {
        method: 'GET',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get stats');
      }
      
      const data = await response.json();
      return data.stats;
    } catch (error) {
      console.error('Failed to get stats:', error);
      throw error;
    }
  }
  
  /**
   * Get a cached result if it's still valid
   * @param {string} key - The cache key
   * @returns {any} - The cached result or null
   */
  getCachedResult(key) {
    if (!this.cache.has(key)) return null;
    
    const { timestamp, data } = this.cache.get(key);
    if (Date.now() - timestamp > this.cacheTTL) {
      // Cache expired, remove it
      this.cache.delete(key);
      return null;
    }
    
    return data;
  }
  
  /**
   * Set a cached result
   * @param {string} key - The cache key
   * @param {any} data - The data to cache
   */
  setCachedResult(key, data) {
    this.cache.set(key, {
      timestamp: Date.now(),
      data,
    });
  }
  
  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.clear();
    console.log('API cache cleared');
  }
}

// Export a singleton instance
export const psadtQdrantApi = new PsadtQdrantApi();

// Also export the class for testing
export default PsadtQdrantApi;
