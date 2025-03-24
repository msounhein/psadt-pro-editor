'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { debounce } from 'lodash';

/**
 * Semantic Search Component
 * 
 * Provides an interface for searching PSADT commands and documentation using embeddings
 */
const SemanticSearch = () => {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('commands');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchDuration, setSearchDuration] = useState(null);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchQuery, type) => {
      if (!searchQuery || searchQuery.trim() === '') {
        setResults([]);
        setSearchDuration(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: searchQuery,
            type: type,
            limit: 5,
          }),
        });

        if (!response.ok) {
          throw new Error('Search failed');
        }

        const data = await response.json();
        setResults(data.results || []);
        setSearchDuration(data.duration);
      } catch (err) {
        console.error('Error searching:', err);
        setError('Failed to search. Please try again.');
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  // Update search when query changes
  useEffect(() => {
    if (query.length > 2) {
      debouncedSearch(query, searchType);
    } else {
      setResults([]);
      setSearchDuration(null);
    }
  }, [query, searchType, debouncedSearch]);

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="mb-6">
        <label htmlFor="semantic-search" className="block text-sm font-medium mb-2">
          Search PSADT {searchType === 'commands' ? 'Commands' : 'Documentation'}
        </label>
        <div className="flex space-x-2">
          <input
            id="semantic-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search using natural language...`}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
            className="px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="commands">Commands</option>
            <option value="documentation">Documentation</option>
          </select>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Powered by semantic search - find content based on meaning, not just keywords
          {searchDuration !== null && (
            <span className="ml-2 text-xs text-gray-400">
              (search took {searchDuration}ms)
            </span>
          )}
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

      {!loading && results.length === 0 && query.trim().length > 2 && (
        <div className="text-center py-8 text-gray-500">
          No results found matching your query.
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Search Results</h2>
          
          {results.map((result) => (
            <ResultCard 
              key={result.id} 
              result={result} 
              type={searchType} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Result Card Component for displaying search results
const ResultCard = ({ result, type }) => {
  // Format similarity as percentage
  const similarityPercentage = Math.round(result.similarity * 100);
  
  // Command result card
  if (type === 'commands') {
    return (
      <div className="border border-gray-200 rounded-md p-4 hover:bg-gray-50 transition-colors">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-blue-600">{result.name}</h3>
          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
            Match: {similarityPercentage}%
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
                <div key={param.id} className="text-sm">
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
      </div>
    );
  }
  
  // Documentation result card
  return (
    <div className="border border-gray-200 rounded-md p-4 hover:bg-gray-50 transition-colors">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-semibold text-blue-600">{result.title}</h3>
        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
          Match: {similarityPercentage}%
        </span>
      </div>
      
      <p className="text-gray-700 mb-3">
        {result.content.length > 200 
          ? result.content.substring(0, 200) + '...' 
          : result.content
        }
      </p>
      
      {result.path && (
        <div className="text-sm text-gray-500 mt-2">
          Path: {result.path}
        </div>
      )}
      
      <div className="mt-3 pt-3 border-t border-gray-200 flex justify-end">
        <button
          onClick={() => {
            // Handle viewing full documentation
            console.log('View documentation:', result.id);
            // You can add your own handler here
          }}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          View Full Documentation →
        </button>
      </div>
    </div>
  );
};

export default SemanticSearch;
