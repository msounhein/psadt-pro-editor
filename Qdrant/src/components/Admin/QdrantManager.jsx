/**
 * QdrantManager Component
 * 
 * Administrative interface to manage Qdrant collections for PSADT documentation.
 */

import React, { useState, useEffect } from 'react';

const QdrantManager = () => {
  const [loading, setLoading] = useState(false);
  const [syncInfo, setSyncInfo] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch current statistics
  const fetchStatistics = async () => {
    try {
      const response = await fetch('/api/psadt-qdrant/stats', {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching statistics:', err);
      setError('Failed to fetch database statistics');
    }
  };

  // Load initial statistics
  useEffect(() => {
    fetchStatistics();
  }, []);

  // Handle syncing commands
  const handleSyncCommands = async () => {
    await handleSync('commands');
  };

  // Handle syncing documentation
  const handleSyncDocumentation = async () => {
    await handleSync('documentation');
  };

  // Handle reset and sync all
  const handleResetAndSyncAll = async () => {
    await handleSync('all', true);
  };

  // Generic sync handler
  const handleSync = async (type, reset = false) => {
    setLoading(true);
    setError(null);
    setSuccessMessage('');

    try {
      const response = await fetch('/api/psadt-qdrant/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          reset,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to sync ${type}`);
      }

      const data = await response.json();
      setSyncInfo(data);

      // Show success message
      if (reset) {
        setSuccessMessage('Successfully reset and synced all collections');
      } else {
        setSuccessMessage(`Successfully synced ${type}`);
      }

      // Refresh statistics
      fetchStatistics();
    } catch (err) {
      console.error('Error syncing data:', err);
      setError(`Failed to sync ${type}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Qdrant Vector Database Management</h1>

      {/* Actions Panel */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Database Actions</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <button
            onClick={handleSyncCommands}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            Sync Commands
          </button>
          
          <button
            onClick={handleSyncDocumentation}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            Sync Documentation
          </button>
          
          <button
            onClick={handleResetAndSyncAll}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            Reset & Sync All
          </button>
        </div>
        
        {loading && (
          <div className="flex items-center space-x-2 text-gray-600 my-4">
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
            <span>Processing request...</span>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md my-4">
            {error}
          </div>
        )}
        
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md my-4">
            {successMessage}
          </div>
        )}
        
        {syncInfo && (
          <div className="bg-gray-50 border border-gray-200 px-4 py-3 rounded-md my-4">
            <h3 className="font-medium mb-2">Sync Results:</h3>
            <ul className="space-y-1 text-sm">
              {syncInfo.commandsCount !== undefined && (
                <li>Commands synced: {syncInfo.commandsCount}</li>
              )}
              {syncInfo.docsCount !== undefined && (
                <li>Documentation pages synced: {syncInfo.docsCount}</li>
              )}
              <li>
                Timestamp: {new Date(syncInfo.timestamp).toLocaleString()}
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* Statistics Panel */}
      {stats && (
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Database Statistics</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Commands Collection */}
            <div className="border border-gray-200 rounded-md p-4">
              <h3 className="text-lg font-medium mb-2">Commands Collection</h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={stats.commands?.status === 'green' ? 'text-green-600 font-medium' : 'text-yellow-600 font-medium'}>
                    {stats.commands?.status === 'green' ? 'Healthy' : stats.commands?.status || 'N/A'}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Vector Count:</span>
                  <span className="font-medium">{stats.commands?.vectors_count || 0}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Segment Count:</span>
                  <span className="font-medium">{stats.commands?.segments_count || 0}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Storage Type:</span>
                  <span className="font-medium">{stats.commands?.vector_config?.on_disk ? 'On Disk' : 'In Memory'}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Distance:</span>
                  <span className="font-medium">{stats.commands?.vector_config?.distance || 'N/A'}</span>
                </div>
              </div>
            </div>
            
            {/* Documentation Collection */}
            <div className="border border-gray-200 rounded-md p-4">
              <h3 className="text-lg font-medium mb-2">Documentation Collection</h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={stats.documentation?.status === 'green' ? 'text-green-600 font-medium' : 'text-yellow-600 font-medium'}>
                    {stats.documentation?.status === 'green' ? 'Healthy' : stats.documentation?.status || 'N/A'}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Vector Count:</span>
                  <span className="font-medium">{stats.documentation?.vectors_count || 0}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Segment Count:</span>
                  <span className="font-medium">{stats.documentation?.segments_count || 0}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Storage Type:</span>
                  <span className="font-medium">{stats.documentation?.vector_config?.on_disk ? 'On Disk' : 'In Memory'}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Distance:</span>
                  <span className="font-medium">{stats.documentation?.vector_config?.distance || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 text-sm text-gray-500">
            Last updated: {stats.timestamp ? new Date(stats.timestamp).toLocaleString() : 'Never'}
            {' '}
            <button
              onClick={fetchStatistics}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QdrantManager;
