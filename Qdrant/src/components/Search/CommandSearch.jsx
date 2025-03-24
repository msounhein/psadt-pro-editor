/**
 * CommandSearch Component
 * 
 * Provides a search interface for PSADT commands using Qdrant vector search.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { debounce } from 'lodash';

const CommandSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchType, setSearchType] = useState('sparse'); // 'sparse' = BM25, 'dense' = Text embeddings

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchQuery) => {
      if (!searchQuery || searchQuery.trim() === '') {
        setResults([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/psadt-qdrant/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: searchQuery,
            useSparse: searchType === 'sparse', // Use BM25 or dense embeddings
            limit: 5,
            type: 'commands' // Search commands by default
          }),
        });

        if (!response.ok) {
          throw new Error('Search failed');
        }

        const data = await response.json();
        setResults(data.results || []);
      } catch (err) {
        console.error('Error searching commands:', err);
        setError('Failed to search commands. Please try again.');
      } finally {
        setLoading(false);
      }
    }, 300),
    [searchType]
  );

  // Update search when query changes
  useEffect(() => {
    debouncedSearch(query);
  }, [query, debouncedSearch]);

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-6">
        <label htmlFor="command-search" className="block text-sm font-medium mb-2">
          Search PSADT Commands
        </label>
        <div className="flex space-x-2">
          <input
            id="command-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter search query..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
            className="px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="sparse">BM25 Search</option>
            <option value="dense">Semantic Search</option>
          </select>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          {searchType === 'sparse' 
            ? 'Using BM25 vector search - better for exact keyword matching' 
            : 'Using semantic search - better for meaning and concepts'}
        </p>
      </div>

      {loading && (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}

      {!loading && results.length === 0 && query.trim() !== '' && (
        <div className="text-center py-8 text-gray-500">
          No commands found matching your query.
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Search Results</h2>
          
          {results.map((result) => (
            <div
              key={result.id}
              className="border border-gray-200 rounded-md p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-blue-600">{result.name}</h3>
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  Score: {(result.score * 100).toFixed(1)}%
                </span>
              </div>
              
              <p className="text-gray-700 mb-3">{result.synopsis}</p>
              
              <div className="bg-gray-50 p-3 rounded-md font-mono text-sm overflow-x-auto">
                {result.syntax}
              </div>
              
              {result.parameters && result.parameters.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-sm text-gray-700 mb-2">Parameters:</h4>
                  <div className="space-y-1">
                    {result.parameters.slice(0, 3).map((param) => (
                      <div key={param.id || param.name} className="text-sm">
                        <span className="font-mono text-blue-600">{param.name}</span>
                        {param.description && (
                          <span className="text-gray-600 ml-2">- {param.description}</span>
                        )}
                      </div>
                    ))}
                    {result.parameters.length > 3 && (
                      <div className="text-sm text-gray-500">
                        +{result.parameters.length - 3} more parameters
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {result.examples && result.examples.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-sm text-gray-700 mb-2">Example:</h4>
                  <div className="bg-gray-50 p-3 rounded-md font-mono text-sm overflow-x-auto">
                    {result.examples[0].code}
                  </div>
                  {result.examples.length > 1 && (
                    <div className="text-sm text-gray-500 mt-1">
                      +{result.examples.length - 1} more examples
                    </div>
                  )}
                </div>
              )}
              
              <div className="mt-3 pt-3 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => {
                    // Handle clicking on a result, e.g., navigate to detail page
                    console.log('Selected command:', result.name);
                    // You can add your own handler here
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  View Full Documentation →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CommandSearch;
