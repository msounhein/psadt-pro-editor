'use client';

import React from 'react';
import SemanticSearch from '@/components/Search/SemanticSearch';

/**
 * Search Page
 * 
 * Provides a dedicated page for semantic search functionality
 */
export default function SearchPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">PSADT Semantic Search</h1>
      
      <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <h2 className="text-lg font-semibold text-blue-700">About Semantic Search</h2>
        <p className="mt-2 text-gray-700">
          This search uses embeddings to find results based on meaning rather than just keywords.
          Try searching with natural language queries like &quot;close applications before installation&quot;
          or &quot;how to show dialogs to users&quot;.
        </p>
      </div>
      
      <SemanticSearch />
      
      <div className="mt-12 text-sm text-gray-500">
        <h3 className="font-medium mb-2">Search Tips:</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Use complete sentences or phrases for better results</li>
          <li>Be specific about what you&apos;re looking for</li>
          <li>Results are ranked by semantic similarity, not keyword matching</li>
          <li>Switch between Commands and Documentation using the dropdown</li>
        </ul>
      </div>
    </div>
  );
}
