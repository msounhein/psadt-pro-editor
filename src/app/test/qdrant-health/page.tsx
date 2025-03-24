"use client";

import React, { useState, useEffect } from 'react';

export default function QdrantHealthPage() {
  const [healthInfo, setHealthInfo] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  
  // Fetch health info
  useEffect(() => {
    const fetchHealthInfo = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/psadt-qdrant/health');
        
        if (!response.ok) {
          throw new Error(`Health API returned status ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        setHealthInfo(data);
      } catch (err: any) {
        console.error('Failed to fetch health info:', err);
        setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchHealthInfo();
  }, [refreshKey]);
  
  // Function to refresh the health check
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };
  
  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch (err) {
      return timestamp;
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Qdrant Health Check</h1>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        
        <div className="p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded-md">
          <h2 className="text-lg font-bold mb-2">AI Completions Configuration</h2>
          <p>The application has been configured to use <strong>Local Sentence Transformers</strong> for generating embeddings.</p>
          <p className="mt-2">This provides high-quality semantic embeddings without API costs or limitations. The model runs locally on your machine using your GPU if available.</p>
        </div>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
          <span className="ml-2">Loading health information...</span>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          <p className="font-bold">Error:</p>
          <p>{error}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overall Status */}
          <div className={`p-4 rounded-md ${
            healthInfo.status === 'healthy' ? 'bg-green-100 border-green-400 text-green-700' :
            healthInfo.status === 'warning_empty_collection' || healthInfo.status === 'warning_partial_functionality' ? 'bg-yellow-100 border-yellow-400 text-yellow-700' :
            'bg-red-100 border-red-400 text-red-700'
          } border`}>
            <div className="flex items-center">
              <div className={`w-4 h-4 rounded-full mr-2 ${
                healthInfo.status === 'healthy' ? 'bg-green-500' :
                healthInfo.status === 'warning_empty_collection' || healthInfo.status === 'warning_partial_functionality' ? 'bg-yellow-500' :
                'bg-red-500'
              }`}></div>
              <h2 className="text-lg font-bold capitalize">{healthInfo.status.replace(/_/g, ' ')}</h2>
            </div>
            <p className="mt-2">Timestamp: {formatTimestamp(healthInfo.timestamp)}</p>
          </div>
          
          {/* Environment Configuration */}
          <div className="p-4 bg-gray-100 rounded-md">
            <h2 className="text-lg font-bold mb-2">Environment Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${healthInfo.environment.qdrantUrlConfigured ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>Qdrant URL: {healthInfo.environment.qdrantUrlConfigured ? 'Configured' : 'Missing'}</span>
              </div>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${healthInfo.environment.qdrantApiKeyConfigured ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>Qdrant API Key: {healthInfo.environment.qdrantApiKeyConfigured ? 'Configured' : 'Missing'}</span>
              </div>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${healthInfo.environment.embeddingApiUrlConfigured ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <span>Embedding API URL: {healthInfo.environment.embeddingApiUrlConfigured ? 'Configured' : 'Using Random (Test Mode)'}</span>
              </div>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${healthInfo.environment.embeddingApiKeyConfigured ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <span>Embedding API Key: {healthInfo.environment.embeddingApiKeyConfigured ? 'Configured' : 'Using Random (Test Mode)'}</span>
              </div>
            </div>
          </div>
          
          {/* Service Status */}
          <div className="p-4 bg-gray-100 rounded-md">
            <h2 className="text-lg font-bold mb-2">Services Status</h2>
            
            <div className="mb-4">
              <h3 className="font-medium">Qdrant Vector Database</h3>
              <div className="flex items-center mt-1">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  healthInfo.services.qdrant.status === 'connected' ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className="capitalize">{healthInfo.services.qdrant.status}</span>
              </div>
              {healthInfo.services.qdrant.error && (
                <div className="mt-1 text-sm text-red-600">
                  Error: {healthInfo.services.qdrant.error}
                </div>
              )}
            </div>
            
            <div className="mb-4">
              <h3 className="font-medium">Embedding Generation</h3>
              <div className="flex items-center mt-1">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  healthInfo.services.embedding.status === 'working' ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className="capitalize">{healthInfo.services.embedding.status}</span>
                {healthInfo.services.embedding.usingRandom && (
                  <span className="ml-2 text-yellow-600 text-sm">(Using random embeddings for testing)</span>
                )}
              </div>
              {healthInfo.services.embedding.error && (
                <div className="mt-1 text-sm text-red-600">
                  Error: {healthInfo.services.embedding.error}
                </div>
              )}
            </div>
          </div>
          
          {/* Collection Info */}
          {healthInfo.collection && (
            <div className="p-4 bg-gray-100 rounded-md">
              <h2 className="text-lg font-bold mb-2">Collection Information</h2>
              <p><strong>Collection Name:</strong> {healthInfo.collection.name}</p>
              <p><strong>Vector Count:</strong> {healthInfo.collection.vectorCount || 0}</p>
              
              {healthInfo.collection.stats && (
                <div className="mt-4">
                  <h3 className="font-medium mb-2">Statistics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <p><strong>Status:</strong> {healthInfo.collection.stats.status}</p>
                    <p><strong>Segment Count:</strong> {healthInfo.collection.stats.segmentCount}</p>
                    <p><strong>Dimensionality:</strong> {healthInfo.collection.stats.dimensionality}</p>
                    <p><strong>Disk Usage:</strong> {Math.round(healthInfo.collection.stats.diskUsage / 1024)} KB</p>
                    <p><strong>RAM Usage:</strong> {Math.round(healthInfo.collection.stats.ramUsage / 1024)} KB</p>
                  </div>
                </div>
              )}
              
              {healthInfo.collection.vectorCount === 0 && (
                <div className="mt-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-md">
                  <p className="font-bold">Warning: Empty Collection</p>
                  <p>The Qdrant collection has no vectors. This means that no PSADT commands have been indexed yet.</p>
                  <p className="mt-2">To populate the collection, sync commands using the Admin interface or the API.</p>
                </div>
              )}
            </div>
          )}
          
          {/* Functionality Tests */}
          <div className="p-4 bg-gray-100 rounded-md">
            <h2 className="text-lg font-bold mb-2">Functionality Tests</h2>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${healthInfo.testFunctionality.embedding ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>Embedding Generation: {healthInfo.testFunctionality.embedding ? 'Working' : 'Failed'}</span>
              </div>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${healthInfo.testFunctionality.search ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>Search Functionality: {healthInfo.testFunctionality.search ? 'Working' : 'Failed'}</span>
              </div>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${healthInfo.testFunctionality.contextSuggestions ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>Context Suggestions: {healthInfo.testFunctionality.contextSuggestions ? 'Working' : 'Failed'}</span>
              </div>
            </div>
          </div>
          
          {/* Troubleshooting Tips */}
          {healthInfo.status !== 'healthy' && (
            <div className="p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded-md">
              <h2 className="text-lg font-bold mb-2">Troubleshooting Tips</h2>
              <ul className="list-disc pl-5 space-y-2">
                {healthInfo.services.qdrant.status !== 'connected' && (
                  <>
                    <li>Check that the Qdrant URL and API key are correctly configured in your environment variables.</li>
                    <li>Verify that the Qdrant server is running and accessible from the application.</li>
                  </>
                )}
                {healthInfo.services.embedding.status !== 'working' && (
                  <li>If using a real embedding API, check that the API URL and key are correctly configured.</li>
                )}
                {healthInfo.collection.vectorCount === 0 && (
                  <li>Use the admin interface to sync PSADT commands to the Qdrant collection.</li>
                )}
                {!healthInfo.testFunctionality.search && healthInfo.services.qdrant.status === 'connected' && (
                  <li>The search functionality is not working despite a valid connection. Check that the vector collection has been properly created with the correct schema.</li>
                )}
                {!healthInfo.testFunctionality.contextSuggestions && healthInfo.services.qdrant.status === 'connected' && (
                  <li>Context suggestions are not working. This might be related to the embeddings being generated or the search query formatting.</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
