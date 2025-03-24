"use client";

import React from 'react';
import { SimpleEditor } from '@/components/ide/simple-editor';

export default function EditorTestPage() {
  return (
    <div className="container mx-auto p-4 h-screen">
      <h1 className="text-2xl font-bold mb-4">Monaco Editor Demo</h1>
      <div className="h-[85vh]">
        <SimpleEditor />
      </div>
    </div>
  );
} 