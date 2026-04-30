'use client';

import React, { useEffect, useState, useRef } from 'react';
import * as Y from 'yjs';
import { DocumentSyncManager } from '../utils/yjs-manager';

interface CollaborativeEditorProps {
  docId: string;
}

export const CollaborativeEditor: React.FC<CollaborativeEditorProps> = ({ docId }) => {
  const [text, setText] = useState<string>('');
  const [status, setStatus] = useState<'online' | 'offline'>('online');
  const syncManagerRef = useRef<DocumentSyncManager | null>(null);
  const yTextRef = useRef<Y.Text | null>(null);

  useEffect(() => {
    // Initialize the sync manager
    const manager = new DocumentSyncManager(docId);
    syncManagerRef.current = manager;
    
    const doc = manager.getDoc();
    const yText = doc.getText('content');
    yTextRef.current = yText;

    // Set initial text
    setText(yText.toString());

    // Listen for changes from Y.js (local or remote)
    yText.observe(() => {
      setText(yText.toString());
    });

    // Connect to WebSocket
    manager.connectWebSocket();

    // Listen for network status changes
    const handleStatusChange = () => {
      setStatus(navigator.onLine ? 'online' : 'offline');
    };
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    handleStatusChange();

    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, [docId]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    const yText = yTextRef.current;
    if (!yText) return;

    // Simple diffing to apply changes to Y.Text
    // In a production app, you'd use a binding like y-monaco or y-prosemirror
    const currentText = yText.toString();
    
    // For demo purposes, we'll just clear and re-insert if changed
    // This is NOT efficient but shows the CRDT in action
    yText.delete(0, currentText.length);
    yText.insert(0, newText);
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Collaborative Notes</h2>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
          status === 'online' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
        }`}>
          <div className={`w-2 h-2 rounded-full ${status === 'online' ? 'bg-green-500' : 'bg-orange-500'}`} />
          {status === 'online' ? 'Online' : 'Offline Mode'}
        </div>
      </div>
      
      <textarea
        value={text}
        onChange={handleChange}
        className="w-full h-64 p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none text-gray-800 dark:text-gray-200"
        placeholder="Start typing your notes here..."
      />
      
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        {status === 'offline' ? (
          'Changes are saved locally and will sync when you reconnect.'
        ) : (
          'Changes are synced in real-time.'
        )}
      </div>
    </div>
  );
};
