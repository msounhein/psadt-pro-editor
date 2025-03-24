"use client";

import React, { useState, useEffect } from 'react';

export default function QdrantDebugPage() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [testContext, setTestContext] = useState<string>("Show-InstallationWelcome -CloseApps notepad,chrome -AllowDefer");
  const [testApiLoading, setTestApiLoading] = useState<boolean>(false);
  
  // Fetch debug info on load
  useEffect(() => {
    const fetchDebugInfo = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/psadt-qdrant/debug');
        
        if (!response.ok) {
          throw new Error(`Debug API returned ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        setDebugInfo(data);
      } catch (err: any) {
        setError(err.message || 'Unknown error');
        console.error('Failed to fetch debug info:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDebugInfo();
  }, []);
  
  // Test the context-suggestions API
  const testContextApi = async () => {
    try {
      setTestApiLoading(true);
      setApiResponse(null);
      
      const response = await fetch('/api/psadt-qdrant/context-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: testContext,
          limit: 5,
          version: 4,
          includeDeprecated: false
        })
      });
      
      const responseText = await response.text();
      
      try {
        // Try to parse as JSON
        const data = JSON.parse(responseText);
        setApiResponse({
          status: response.status,
          statusText: response.statusText,
          isJson: true,
          data: data
        });
      } catch (jsonError) {
        // If it's not valid JSON, show the raw text
        setApiResponse({
          status: response.status,
          statusText: response.statusText,
          isJson: false,
          rawText: responseText
        });
      }
    } catch (err: any) {
      setApiResponse({
        error: err.message || 'Unknown error'
      });
      console.error('Failed to test API:', err);
    } finally {
      setTestApiLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Qdrant Debug Info</h1>
      
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
          <span className="ml-2">Loading debug information...</span>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          <p className="font-bold">Error:</p>
          <p>{error}</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="p-4 bg-gray-100 rounded-md">
            <h2 className="text-lg font-bold mb-2">General Status</h2>
            <p><strong>Status:</strong> {debugInfo?.status}</p>
            <p><strong>Qdrant Connection:</strong> {debugInfo?.qdrantConnection ? '✅ Connected' : '❌ Failed'}</p>
            <p><strong>Embedding Generation:</strong> {debugInfo?.embeddingGeneration ? '✅ Working' : '❌ Failed'}</p>
            
            <h3 className="text-md font-bold mt-4 mb-2">Environment</h3>
            <ul className="list-disc pl-5">
              <li>QDRANT_URL: {debugInfo?.environment.qdrantUrl}</li>
              <li>QDRANT_API_KEY: {debugInfo?.environment.qdrantApiKey}</li>
              <li>EMBEDDING_API_URL: {debugInfo?.environment.embeddingApiUrl}</li>
              <li>EMBEDDING_API_KEY: {debugInfo?.environment.embeddingApiKey}</li>
            </ul>
          </div>
          
          {debugInfo?.collectionInfo && (
            <div className="p-4 bg-gray-100 rounded-md">
              <h2 className="text-lg font-bold mb-2">Collection Info</h2>
              <p><strong>Vector Count:</strong> {debugInfo.collectionInfo.vectorCount}</p>
              <p><strong>Segment Count:</strong> {debugInfo.collectionInfo.segmentCount}</p>
              <p><strong>Status:</strong> {debugInfo.collectionInfo.status}</p>
              <p><strong>Dimensionality:</strong> {debugInfo.collectionInfo.dimensionality}</p>
              <p><strong>Disk Usage:</strong> {debugInfo.collectionInfo.diskUsage} bytes</p>
              <p><strong>RAM Usage:</strong> {debugInfo.collectionInfo.ramUsage} bytes</p>
            </div>
          )}
          
          {debugInfo?.testEmbedding && (
            <div className="p-4 bg-gray-100 rounded-md">
              <h2 className="text-lg font-bold mb-2">Test Embedding</h2>
              <p><strong>Test Text:</strong> {debugInfo.testEmbedding.text}</p>
              <p><strong>Embedding:</strong> {debugInfo.testEmbedding.embedding}</p>
              <p><strong>Sample:</strong> {JSON.stringify(debugInfo.testEmbedding.sample)}</p>
              <p><strong>Using Random Embeddings:</strong> {debugInfo.testEmbedding.isRandom ? 'Yes (for testing)' : 'No (using real embeddings)'}</p>
            </div>
          )}
          
          {debugInfo?.errors?.length > 0 && (
            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
              <h2 className="text-lg font-bold mb-2">Errors</h2>
              {debugInfo.errors.map((err: any, index: number) => (
                <div key={index} className="mb-4">
                  <p><strong>Stage:</strong> {err.stage}</p>
                  <p><strong>Message:</strong> {err.message}</p>
                  <details>
                    <summary>Stack Trace</summary>
                    <pre className="text-xs overflow-auto p-2 bg-red-50 mt-2">{err.stack}</pre>
                  </details>
                </div>
              ))}
            </div>
          )}
          
          <div className="p-4 bg-gray-100 rounded-md">
            <h2 className="text-lg font-bold mb-2">Test Context Suggestions API</h2>
            <div className="mb-4">
              <label htmlFor="test-context" className="block mb-2 font-medium">Test Context:</label>
              <textarea 
                id="test-context"
                className="w-full p-2 border rounded-md"
                rows={3}
                value={testContext}
                onChange={(e) => setTestContext(e.target.value)}
              />
            </div>
            
            <button
              onClick={testContextApi}
              disabled={testApiLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              {testApiLoading ? 'Testing...' : 'Test API'}
            </button>
            
            {apiResponse && (
              <div className="mt-4">
                <h3 className="text-md font-bold mb-2">API Response</h3>
                <p><strong>Status:</strong> {apiResponse.status} {apiResponse.statusText}</p>
                
                {apiResponse.error ? (
                  <div className="p-2 bg-red-100 rounded-md">
                    <p><strong>Error:</strong> {apiResponse.error}</p>
                  </div>
                ) : apiResponse.isJson ? (
                  <div>
                    <p><strong>Suggestion Count:</strong> {apiResponse.data?.suggestions?.length || 0}</p>
                    <details>
                      <summary>Response Data</summary>
                      <pre className="text-xs overflow-auto p-2 bg-gray-50 mt-2 max-h-96">
                        {JSON.stringify(apiResponse.data, null, 2)}
                      </pre>
                    </details>
                  </div>
                ) : (
                  <div>
                    <p><strong>Raw Response:</strong></p>
                    <pre className="text-xs overflow-auto p-2 bg-gray-50 mt-2 max-h-96">
                      {apiResponse.rawText}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
