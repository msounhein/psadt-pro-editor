'use client';

import { useState, useCallback } from 'react';

/**
 * Custom hook for working with embeddings in components
 * 
 * @returns {Object} Hook methods and state
 */
export default function useEmbeddings() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);

  /**
   * Search using the semantic search API
   * 
   * @param {string} query - The search query
   * @param {string} type - The type of content to search ('commands' or 'documentation')
   * @param {number} limit - Maximum number of results to return
   * @returns {Promise<Array>} Search results
   */
  const search = useCallback(async (query, type = 'commands', limit = 5) => {
    if (!query || query.trim() === '') {
      setResults([]);
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, type, limit }),
      });

      if (!response.ok) {
        throw new Error(`Search failed with status: ${response.status}`);
      }

      const data = await response.json();
      setResults(data.results || []);
      return data.results || [];
    } catch (err) {
      console.error('Error in semantic search:', err);
      setError(err.message || 'Failed to perform search');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get suggestions based on input text
   * 
   * @param {string} input - The input text
   * @param {string} type - The type of content to search
   * @param {number} limit - Maximum number of suggestions
   * @returns {Promise<Array>} Suggestion results
   */
  const getSuggestions = useCallback(async (input, type = 'commands', limit = 3) => {
    if (!input || input.trim().length < 3) {
      return [];
    }

    try {
      const results = await search(input, type, limit);
      return results.map(result => ({
        id: result.id,
        title: type === 'commands' ? result.name : result.title,
        description: type === 'commands' ? result.synopsis : result.content.substring(0, 100) + '...',
        similarity: result.similarity
      }));
    } catch (err) {
      console.error('Error getting suggestions:', err);
      return [];
    }
  }, [search]);

  return {
    loading,
    error,
    results,
    search,
    getSuggestions
  };
}
