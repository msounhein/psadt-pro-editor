'use client';

/**
 * Qdrant Admin Page
 * 
 * Admin interface for managing the Qdrant vector database integration.
 */

import React from 'react';
import QdrantManager from '@/components/Admin/QdrantManager';

export default function QdrantAdminPage() {
  return (
    <div className="container mx-auto py-8">
      <QdrantManager />
    </div>
  );
}
