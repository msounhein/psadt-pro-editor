'use client';

import { useState, useEffect } from 'react';
import { psadtQdrantApi } from '../../lib/psadt-qdrant-api';

/**
 * QdrantManager component
 * Admin interface for managing the Qdrant integration
 */
export default function QdrantManager() {
  // States
  const [stats, setStats] = useState(null);
  const [syncStatus, setSyncStatus] = useState({ status: 'idle', message: '', stats: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchVersion, setSearchVersion] = useState(null);
  const [searchOptions, setSearchOptions] = useState({
    includeDeprecated: false,
    includeExamples: true,
    limit: 10,
  });
  const [isLoading, setIsLoading] = useState(false);
  
  // Add Record States
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRecord, setNewRecord] = useState({
    type: 'command', // 'command' or 'example'
    commandName: '',
    version: 3,
    description: '',
    syntax: '',
    notes: '',
    isDeprecated: false,
    code: '', // For examples
    title: '', // For examples
    parentCommandId: '', // For examples
  });
  const [addStatus, setAddStatus] = useState({ status: 'idle', message: '' });
  
  // Load stats on component mount
  useEffect(() => {
    fetchStats();
  }, []);
  
  // Fetch collection stats
  const fetchStats = async () => {
    try {
      setIsLoading(true);
      const stats = await psadtQdrantApi.getStats();
      setStats(stats);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Sync commands to Qdrant
  const handleSync = async (reset = false) => {
    try {
      setSyncStatus({ status: 'loading', message: 'Syncing commands...', stats: null });
      const result = await psadtQdrantApi.syncCommands(reset);
      setSyncStatus({ 
        status: 'success', 
        message: `Successfully synced ${result.stats.indexed} commands`,
        stats: result.stats
      });
      
      // Refresh stats
      fetchStats();
    } catch (error) {
      console.error('Failed to sync commands:', error);
      setSyncStatus({ status: 'error', message: `Error: ${error.message}`, stats: null });
    }
  };
  
  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setIsLoading(true);
      const results = await psadtQdrantApi.searchCommands(searchQuery, {
        ...searchOptions,
        version: searchVersion ? parseInt(searchVersion) : undefined,
      });
      setSearchResults(results);
    } catch (error) {
      console.error('Failed to search:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Clear only the Qdrant database without syncing afterward
   */
  const handleClearQdrantOnly = async () => {
    try {
      if (!confirm('Are you sure you want to clear the Qdrant database? This will delete all vector embeddings and cannot be undone.')) {
        return;
      }
      
      setSyncStatus({ status: 'loading', message: 'Clearing Qdrant database...', stats: null });
      
      // Call the clear endpoint
      const response = await fetch(window.location.origin + '/api/psadt-qdrant/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to clear Qdrant database');
      }
      
      const result = await response.json();
      
      setSyncStatus({ 
        status: 'success', 
        message: `Successfully cleared Qdrant database`,
        stats: null
      });
      
      // Refresh stats
      fetchStats();
    } catch (error) {
      console.error('Failed to clear Qdrant database:', error);
      setSyncStatus({ status: 'error', message: `Error: ${error.message}`, stats: null });
    }
  };
  
  // Handle option change
  const handleOptionChange = (key, value) => {
    setSearchOptions(prev => ({
      ...prev,
      [key]: value,
    }));
  };
  
  // Clear cache
  const handleClearCache = () => {
    psadtQdrantApi.clearCache();
    alert('API cache cleared');
  };
  
  // Handle new record field change
  const handleRecordFieldChange = (field, value) => {
    setNewRecord(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Toggle the type of record to add
  const toggleRecordType = () => {
    setNewRecord(prev => ({
      ...prev,
      type: prev.type === 'command' ? 'example' : 'command',
      // Clear fields that aren't relevant to the new type
      ...(prev.type === 'command' ? { code: '', title: '', parentCommandId: '' } : { syntax: '' })
    }));
  };
  
  // Test API connection
  const testApiConnection = async () => {
    try {
      setAddStatus({ status: 'loading', message: 'Testing API connection...' });
      
      // Call the test endpoint
      const response = await fetch(window.location.origin + '/api/psadt-qdrant/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: true }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to connect to API');
      }
      
      const result = await response.json();
      setAddStatus({ 
        status: 'success', 
        message: `API connection successful: ${result.message}` 
      });
      
    } catch (error) {
      console.error('API test failed:', error);
      setAddStatus({ 
        status: 'error', 
        message: `API test failed: ${error.message}. Check console for details.` 
      });
    }
  };
  
  // Submit new record
  const handleAddRecord = async () => {
    try {
      setAddStatus({ status: 'loading', message: 'Adding record...' });
      
      // Prepare the record based on type
      let recordToAdd;
      if (newRecord.type === 'command') {
        recordToAdd = {
          commandName: newRecord.commandName,
          version: parseInt(newRecord.version),
          description: newRecord.description,
          syntax: newRecord.syntax,
          notes: newRecord.notes,
          isDeprecated: newRecord.isDeprecated,
        };
      } else {
        // Example
        recordToAdd = {
          commandId: newRecord.parentCommandId,
          title: newRecord.title,
          description: newRecord.description,
          code: newRecord.code,
        };
      }
      
      // Make API call - Using absolute URL to avoid path issues
      const response = await fetch(window.location.origin + '/api/psadt-qdrant/records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: newRecord.type,
          record: recordToAdd
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add record');
      }
      
      // Success
      const result = await response.json();
      setAddStatus({ 
        status: 'success', 
        message: `Successfully added ${newRecord.type}: ${newRecord.type === 'command' ? newRecord.commandName : newRecord.title}` 
      });
      
      // Clear form
      setNewRecord({
        type: 'command',
        commandName: '',
        version: 3,
        description: '',
        syntax: '',
        notes: '',
        isDeprecated: false,
        code: '',
        title: '',
        parentCommandId: '',
      });
      
      // Refresh stats
      fetchStats();
      
    } catch (error) {
      console.error('Failed to add record:', error);
      
      // More detailed error logging
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        console.error('Network error: Could not connect to the API endpoint.');
        console.error('Current URL:', window.location.origin + '/api/psadt-qdrant/records');
        
        setAddStatus({ 
          status: 'error', 
          message: `Network error: Could not connect to the API. Make sure the server is running and the API route is properly set up.` 
        });
      } else {
        setAddStatus({ status: 'error', message: `Error: ${error.message}` });
      }
    }
  };
  
  return (
    <div className="p-6 dark:bg-gray-900 dark:text-white">
      <h1 className="text-2xl font-bold mb-6">PSADT Qdrant Manager</h1>
      
      {/* Stats Section */}
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded mb-6">
        <h2 className="text-xl font-semibold mb-2">Collection Statistics</h2>
        {stats ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-700 p-3 rounded shadow">
              <div className="text-sm text-gray-500 dark:text-gray-300">Vector Count</div>
              <div className="text-xl font-bold">{stats.vectorCount}</div>
            </div>
            <div className="bg-white dark:bg-gray-700 p-3 rounded shadow">
              <div className="text-sm text-gray-500 dark:text-gray-300">Segment Count</div>
              <div className="text-xl font-bold">{stats.segmentCount}</div>
            </div>
            <div className="bg-white dark:bg-gray-700 p-3 rounded shadow">
              <div className="text-sm text-gray-500 dark:text-gray-300">Dimensionality</div>
              <div className="text-xl font-bold">{stats.dimensionality}</div>
            </div>
            <div className="bg-white dark:bg-gray-700 p-3 rounded shadow">
              <div className="text-sm text-gray-500 dark:text-gray-300">Status</div>
              <div className="text-xl font-bold">{stats.status}</div>
            </div>
            <div className="bg-white dark:bg-gray-700 p-3 rounded shadow">
              <div className="text-sm text-gray-500 dark:text-gray-300">Disk Usage</div>
              <div className="text-xl font-bold">{(stats.diskUsage / (1024 * 1024)).toFixed(2)} MB</div>
            </div>
            <div className="bg-white dark:bg-gray-700 p-3 rounded shadow">
              <div className="text-sm text-gray-500 dark:text-gray-300">RAM Usage</div>
              <div className="text-xl font-bold">{(stats.ramUsage / (1024 * 1024)).toFixed(2)} MB</div>
            </div>
          </div>
        ) : (
          <div className="text-gray-500 dark:text-gray-400">Loading stats...</div>
        )}
        <div className="mt-4">
          <button 
            onClick={fetchStats}
            disabled={isLoading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300 dark:disabled:bg-blue-900"
          >
            Refresh Stats
          </button>
        </div>
      </div>
      
      {/* Sync Section */}
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded mb-6">
        <h2 className="text-xl font-semibold mb-2">Sync Commands</h2>
        <div className="flex flex-wrap gap-4 mb-4">
          <button 
            onClick={() => handleSync(false)}
            disabled={syncStatus.status === 'loading'}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-green-300 dark:disabled:bg-green-900"
          >
            Sync Commands
          </button>
          <button 
            onClick={() => handleSync(true)}
            disabled={syncStatus.status === 'loading'}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:bg-red-300 dark:disabled:bg-red-900"
          >
            Reset & Sync Commands
          </button>
          <button 
            onClick={handleClearQdrantOnly}
            disabled={syncStatus.status === 'loading'}
            className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 disabled:bg-yellow-400 dark:disabled:bg-yellow-900"
          >
            Clear Qdrant Only
          </button>
          <button 
            onClick={handleClearCache}
            className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 dark:hover:bg-yellow-700"
          >
            Clear API Cache
          </button>
        </div>
        {syncStatus.status !== 'idle' && (
          <div className={`p-3 rounded ${
            syncStatus.status === 'loading' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 
            syncStatus.status === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
            'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}>
            <div className="font-semibold">{syncStatus.message}</div>
            {syncStatus.stats && (
              <div className="mt-2">
                <div>Total: {syncStatus.stats.total}</div>
                <div>Indexed: {syncStatus.stats.indexed}</div>
                <div>Errors: {syncStatus.stats.errors}</div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Search Section */}
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded mb-6">
        <h2 className="text-xl font-semibold mb-2">Semantic Search</h2>
        
        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-300 mb-2">Search Query</label>
          <input 
            type="text" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Enter a search query..."
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-2">PSADT Version</label>
            <select 
              value={searchVersion || ''} 
              onChange={(e) => setSearchVersion(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">All Versions</option>
              <option value="3">Version 3</option>
              <option value="4">Version 4</option>
            </select>
          </div>
          
          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-2">Results Limit</label>
            <input 
              type="number" 
              value={searchOptions.limit} 
              onChange={(e) => handleOptionChange('limit', parseInt(e.target.value))}
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              min="1" 
              max="100"
            />
          </div>
          
          <div className="flex items-center">
            <label className="inline-flex items-center mt-6">
              <input 
                type="checkbox" 
                checked={searchOptions.includeDeprecated} 
                onChange={(e) => handleOptionChange('includeDeprecated', e.target.checked)}
                className="form-checkbox h-5 w-5 text-blue-600 dark:bg-gray-700"
              />
              <span className="ml-2 text-gray-700 dark:text-gray-300">Include Deprecated</span>
            </label>
          </div>
          
          <div className="flex items-center">
            <label className="inline-flex items-center mt-6">
              <input 
                type="checkbox" 
                checked={searchOptions.includeExamples} 
                onChange={(e) => handleOptionChange('includeExamples', e.target.checked)}
                className="form-checkbox h-5 w-5 text-blue-600 dark:bg-gray-700"
              />
              <span className="ml-2 text-gray-700 dark:text-gray-300">Include Examples</span>
            </label>
          </div>
        </div>
        
        <div className="mb-4">
          <button 
            onClick={handleSearch}
            disabled={isLoading || !searchQuery.trim()}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300 dark:disabled:bg-blue-900"
          >
            Search
          </button>
        </div>
        
        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Search Results ({searchResults.length})</h3>
            <div className="space-y-4">
              {searchResults.map((result) => (
                <div key={result.id} className="bg-white dark:bg-gray-700 p-4 rounded shadow">
                  <div className="flex justify-between items-start">
                    <div className="font-bold text-lg">{result.commandName}</div>
                    <div className="text-sm bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">
                      v{result.version} {result.isDeprecated && '(Deprecated)'}
                      {result.isExample && ' (Example)'}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Score: {result.score.toFixed(4)}
                  </div>
                  
                  {result.description && (
                    <div className="mt-2">{result.description}</div>
                  )}
                  
                  {result.syntax && !result.isExample && (
                    <div className="mt-2 bg-gray-100 dark:bg-gray-800 p-2 rounded font-mono text-sm">
                      {result.syntax}
                    </div>
                  )}
                  
                  {result.code && result.isExample && (
                    <div className="mt-2">
                      <div className="font-medium">{result.title || 'Example'}</div>
                      <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded font-mono text-sm mt-1">
                        {result.code}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {searchResults.length === 0 && searchQuery.trim() && !isLoading && (
          <div className="text-gray-500 dark:text-gray-400 mt-4">No results found</div>
        )}
      </div>
      
      {/* Add Record Section */}
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Add New Record</h2>
          <button 
            onClick={() => setShowAddForm(!showAddForm)} 
            className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-400"
          >
            {showAddForm ? 'Hide Form' : 'Show Form'}
          </button>
        </div>
        
        {showAddForm && (
          <div className="border dark:border-gray-700 rounded p-4">
            <div className="flex justify-between mb-4">
              <div className="font-medium text-lg">
                Adding new {newRecord.type === 'command' ? 'Command' : 'Example'}
              </div>
              <button 
                onClick={toggleRecordType}
                className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 text-sm"
              >
                Switch to {newRecord.type === 'command' ? 'Example' : 'Command'}
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Common Fields */}
              {newRecord.type === 'command' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 mb-1 text-sm font-medium">
                      Command Name*
                    </label>
                    <input 
                      type="text" 
                      value={newRecord.commandName} 
                      onChange={(e) => handleRecordFieldChange('commandName', e.target.value)}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                      placeholder="e.g., Show-InstallationWelcome"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 mb-1 text-sm font-medium">
                      PSADT Version*
                    </label>
                    <select 
                      value={newRecord.version} 
                      onChange={(e) => handleRecordFieldChange('version', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                      required
                    >
                      <option value={3}>Version 3</option>
                      <option value={4}>Version 4</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 mb-1 text-sm font-medium">
                      Syntax
                    </label>
                    <textarea 
                      value={newRecord.syntax} 
                      onChange={(e) => handleRecordFieldChange('syntax', e.target.value)}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm font-mono"
                      placeholder="e.g., Show-InstallationWelcome -Title '...' -Message '...'"
                      rows={4}
                    />
                  </div>
                </div>
              )}
              
              {newRecord.type === 'example' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 mb-1 text-sm font-medium">
                      Parent Command ID*
                    </label>
                    <input 
                      type="text" 
                      value={newRecord.parentCommandId} 
                      onChange={(e) => handleRecordFieldChange('parentCommandId', e.target.value)}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                      placeholder="e.g., 1a2b3c4d-5e6f-7g8h-9i0j-klmnopqrstuv"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 mb-1 text-sm font-medium">
                      Example Title*
                    </label>
                    <input 
                      type="text" 
                      value={newRecord.title} 
                      onChange={(e) => handleRecordFieldChange('title', e.target.value)}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                      placeholder="e.g., Basic Welcome Dialog"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 mb-1 text-sm font-medium">
                      Example Code*
                    </label>
                    <textarea 
                      value={newRecord.code} 
                      onChange={(e) => handleRecordFieldChange('code', e.target.value)}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm font-mono"
                      placeholder="e.g., Show-InstallationWelcome -Title 'Application Install'"
                      rows={4}
                      required
                    />
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-1 text-sm font-medium">
                    Description
                  </label>
                  <textarea 
                    value={newRecord.description} 
                    onChange={(e) => handleRecordFieldChange('description', e.target.value)}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                    placeholder="Enter a description..."
                    rows={4}
                  />
                </div>
                
                {newRecord.type === 'command' && (
                  <>
                    <div>
                      <label className="block text-gray-700 dark:text-gray-300 mb-1 text-sm font-medium">
                        Notes
                      </label>
                      <textarea 
                        value={newRecord.notes} 
                        onChange={(e) => handleRecordFieldChange('notes', e.target.value)}
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                        placeholder="Enter any additional notes..."
                        rows={3}
                      />
                    </div>
                    
                    <div className="flex items-center mt-2">
                      <input 
                        type="checkbox" 
                        id="isDeprecated"
                        checked={newRecord.isDeprecated} 
                        onChange={(e) => handleRecordFieldChange('isDeprecated', e.target.checked)}
                        className="h-4 w-4 text-blue-600 dark:bg-gray-700"
                      />
                      <label htmlFor="isDeprecated" className="ml-2 text-gray-700 dark:text-gray-300 text-sm">
                        Mark as Deprecated
                      </label>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div className="mt-6 flex justify-between">
              <button 
                onClick={testApiConnection}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Test API Connection
              </button>
              
              <button 
                onClick={handleAddRecord}
                disabled={addStatus.status === 'loading' || 
                  (newRecord.type === 'command' && !newRecord.commandName) ||
                  (newRecord.type === 'example' && (!newRecord.parentCommandId || !newRecord.title || !newRecord.code))}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-green-300 dark:disabled:bg-green-900"
              >
                {addStatus.status === 'loading' ? 'Adding...' : 'Add Record'}
              </button>
            </div>
            
            {addStatus.status !== 'idle' && (
              <div className={`mt-4 p-3 rounded ${
                addStatus.status === 'loading' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 
                addStatus.status === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}>
                <div className="font-semibold">{addStatus.message}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
