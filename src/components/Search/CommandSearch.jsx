import React, { useState, useCallback, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import { debounce } from 'lodash';
import { CollectionSelector } from '../CollectionSelector';

const CommandSearch = () => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  const [collection, setCollection] = useState('psadt_commands_v4');
  
  // Define search options state
  const [searchOptions, setSearchOptions] = useState({
    limit: 10
  });
  
  // Debug effect to log the current collection
  useEffect(() => {
    console.log('🔍 Current search collection:', collection);
  }, [collection]);
  
  // Handle checkbox changes
  const handleCheckboxChange = (name) => (e) => {
    setSearchOptions({
      ...searchOptions,
      [name]: e.target.checked
    });
  };

  // Handle input changes
  const handleInputChange = (e) => {
    setQuery(e.target.value);
  };

  // Handle collection change
  const handleCollectionChange = (value) => {
    console.log(`Switching collection to: ${value}`);
    setCollection(value);
    
    // Clear results when changing collection
    setSearchResults([]);
    
    // If there's an active query, re-run search with new collection
    if (query && query.length >= 2) {
      handleSearch(query);
    }
  };

  // Fallback search function for when main collection has no results
  const searchFallback = async (searchQuery) => {
    try {
      console.log('Attempting fallback search in psadt_commands collection');
      const response = await fetch(`/api/psadt-qdrant/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          collection: 'psadt_commands',
          options: {
            ...searchOptions,
            includeDeprecated: true, // Always include all documents
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Fallback search failed with status: ${response.status}`);
      }

      const data = await response.json();
      if (data.results && data.results.length > 0) {
        // Transform results to ensure commandName is at the top level
        const transformedResults = data.results.map(result => {
          if (result.payload && (result.payload.commandName || result.payload.name)) {
            // Extract command info from payload and place at top level
            return {
              ...result,
              commandName: result.payload.commandName || result.payload.name,
              name: result.payload.name || result.payload.commandName,
              synopsis: result.payload.synopsis || result.payload.description || '',
              syntax: result.payload.syntax || ''
            };
          }
          return result;
        });
        
        console.log('Fallback search returned transformed results:', transformedResults.length);
        setSearchResults(transformedResults);
      }
    } catch (fallbackError) {
      console.error('Fallback search error:', fallbackError);
    }
  };

  const searchApi = async (query, collection = 'psadt_commands_v4', options = {}) => {
    console.log(`Searching for "${query}" in collection: ${collection}`);
    const response = await fetch(`/api/psadt-qdrant/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        collection,
        options: {
          ...searchOptions,
          ...options,
        },
      }),
    });
   
    if (!response.ok) {
      throw new Error(`Search failed with status: ${response.status}`);
    }
   
    return await response.json();
  };

  const handleSearch = useCallback(
    debounce(async (query) => {
      if (!query || query.length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      setError(null);

      // Test API connectivity first
      try {
        const testResponse = await fetch('/api/test');
        if (!testResponse.ok) {
          throw new Error('API connectivity test failed');
        }
        
        // Perform the search
        try {
          const response = await fetch(`/api/psadt-qdrant/search`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query,
              collection,
              options: {
                ...searchOptions,
                includeDeprecated: true, // Always include all documents regardless of deprecation status
              },
            }),
          });

          if (!response.ok) {
            if (response.status === 404) {
              // Try fallback collection if the main one doesn't exist
              console.log(`Collection ${collection} not found, trying fallback...`);
              await searchFallback(query);
              return;
            }
            throw new Error(`Search failed with status: ${response.status}`);
          }

          const data = await response.json();
          console.log('Search API returned data:', JSON.stringify(data, null, 2));
          
          // Debug the first result to see its structure
          if (data.results && data.results.length > 0) {
            console.log('First result sample:', JSON.stringify(data.results[0], null, 2));
            
            // Check if payload exists directly in result
            if (data.results[0].payload && data.results[0].payload.commandName) {
              console.log('Command name found in payload:', data.results[0].payload.commandName);
            }
          }
          
          // Transform results to ensure commandName is at the top level
          const transformedResults = (data.results || []).map(result => {
            if (result.payload && (result.payload.commandName || result.payload.name)) {
              // Extract command info from payload and place at top level
              return {
                ...result,
                commandName: result.payload.commandName || result.payload.name,
                name: result.payload.name || result.payload.commandName,
                synopsis: result.payload.synopsis || result.payload.description || '',
                syntax: result.payload.syntax || ''
              };
            }
            return result;
          });
          
          console.log('Transformed results:', JSON.stringify(transformedResults[0] || {}, null, 2));
          
          setSearchResults(transformedResults);
          
          // If no results found, try the default collection as fallback
          if ((transformedResults || []).length === 0 && collection !== 'psadt_commands') {
            console.log('No results found, trying fallback collection...');
            await searchFallback(query);
          }
        } catch (error) {
          console.error('Search error:', error);
          setError(`Search failed: ${error.message}`);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } catch (error) {
        console.error('API connectivity test failed:', error);
        setError('Cannot connect to search API. Please check your network connection.');
        setIsSearching(false);
        setSearchResults([]);
      }
    }, 300),
    [collection, searchOptions, searchFallback]
  );
  
  // Effect to trigger search when query changes
  useEffect(() => {
    handleSearch(query);
  }, [query, handleSearch]);

  // Render component
  return (
    <div className="bg-[#1E293B] p-6 rounded-lg shadow-md border border-gray-800">
      <h2 className="text-xl font-bold mb-4 text-white">Command Search</h2>
      
      <div className="mb-4">
        <label htmlFor="collection" className="block text-sm font-medium mb-2 text-gray-300">
          Collection
        </label>
        <CollectionSelector
          value={collection}
          onChange={handleCollectionChange}
          className="w-full"
        />
      </div>
      
      <div className="mb-4">
        <label htmlFor="searchQuery" className="block text-sm font-medium mb-2 text-gray-300">
          Search Query
        </label>
        <input
          id="searchQuery"
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="Type to search..."
          className="w-full px-3 py-2 bg-[#0F172A] border border-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label htmlFor="limitInput" className="block text-sm font-medium mb-2 text-gray-300">
            Results Limit
          </label>
          <input
            id="limitInput"
            type="number"
            value={searchOptions.limit}
            onChange={(e) => setSearchOptions({...searchOptions, limit: parseInt(e.target.value) || 10})}
            className="w-full px-3 py-2 bg-[#0F172A] border border-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="1"
            max="100"
          />
        </div>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-900/30 text-red-400 rounded-md">
          {error}
        </div>
      )}
      
      {isSearching ? (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-300">Searching...</p>
        </div>
      ) : (
        <>
          {searchResults.length === 0 && query.length >= 2 && (
            <div className="text-center py-4 text-gray-400">
              No results found for "{query}" in collection "{collection}"
            </div>
          )}
          
          {searchResults.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2 text-white">Results ({searchResults.length}) in {collection}</h3>
              <div className="space-y-4">
                {searchResults.map((result) => {
                  // Since we pre-transform the data, we can simplify this
                  const displayName = result.commandName || result.name || 'N/A';
                  const description = result.synopsis || result.description || '';
                  const syntax = result.syntax || null;
                  
                  return (
                  <div key={result.id} className="bg-[#0F172A] p-4 rounded-md border border-gray-700/50">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium text-white">{displayName}</h4>
                      <div className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-300">
                        Score: {result.scoreDisplay || (result.score ? (result.score * 100).toFixed(1) + '%' : 'N/A')}
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-300 mt-2">
                      {description}
                    </div>
                    
                    {syntax && (
                      <pre className="mt-2 bg-[#1E293B] p-2 rounded text-xs text-gray-300 overflow-x-auto">
                        <code>{syntax}</code>
                      </pre>
                    )}
                    
                    <details className="mt-2 text-xs text-gray-500">
                      <summary>Debug Info</summary>
                      <pre className="mt-1 p-2 bg-gray-900 rounded overflow-x-auto text-xs">
                        <code>{JSON.stringify(result, null, 2)}</code>
                      </pre>
                    </details>
                    
                    <div className="text-xs text-gray-400 mt-1">
                      Score: {result.scoreDisplay || (result.score ? (result.score * 100).toFixed(1) + '%' : 'N/A')} 
                      <span className="text-gray-500 ml-2">ID: {result.id}</span>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CommandSearch; 