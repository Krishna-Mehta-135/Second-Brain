import * as Y from 'yjs';
import { ProtocolCodec, applyUpdateSafe } from '@repo/crdt';
import { WSMessage } from '@repo/types';
import { 
  saveDocumentState, 
  getDocumentState, 
  queueUpdate, 
  getPendingUpdates, 
  deletePendingUpdate 
} from './persistence';

export class DocumentSyncManager {
  private doc: Y.Doc;
  private docId: string;
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private ws: WebSocket | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private MAX_PENDING_UPDATES = 1000;

  constructor(docId: string) {
    this.docId = docId;
    this.doc = new Y.Doc();
    
    this.init();
  }

  private async init() {
    // 1. Restore from IndexedDB immediately for instant load
    const saved = await getDocumentState(this.docId);
    if (saved) {
      applyUpdateSafe(this.doc, saved.state);
    }

    // 2. Setup Y.js update listener
    this.doc.on('update', async (update: Uint8Array) => {
      // Save full snapshot (debounced)
      this.scheduleSnapshot();

      // Queue incremental update for server sync
      await queueUpdate(this.docId, update);
      
      // If online, try to flush immediately
      if (this.isOnline) {
        this.flushPendingUpdates();
      }
    });

    // 3. Setup network listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
    }
  }

  private scheduleSnapshot() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    
    this.debounceTimer = setTimeout(async () => {
      const state = Y.encodeStateAsUpdate(this.doc);
      const stateVector = Y.encodeStateVector(this.doc);
      await saveDocumentState(this.docId, state, stateVector);
    }, 2000);
  }

  private async handleOnline() {
    this.isOnline = true;
    console.log('Network back online, reconnecting...');
    await this.connectWebSocket();
    await this.flushPendingUpdates();
  }

  private handleOffline() {
    this.isOnline = false;
    console.log('Network offline, working in local-only mode.');
  }

  public async connectWebSocket() {
    if (!this.isOnline) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const wsUrl = `ws://localhost:8080/ws/documents/${this.docId}?token=${token}`;
    
    this.ws = new WebSocket(wsUrl);
    this.ws.binaryType = 'arraybuffer';
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.sendSyncStep1();
    };

    this.ws.onmessage = (event) => {
      const data = new Uint8Array(event.data as ArrayBuffer);
      const message = ProtocolCodec.decode(data);
      
      switch (message.type) {
        case 'sync-step-1': {
          const update = Y.encodeStateAsUpdate(this.doc, message.stateVector);
          this.sendMessage({ type: 'sync-step-2', update });
          break;
        }
        case 'sync-step-2':
        case 'update':
        case 'ai-update':
          applyUpdateSafe(this.doc, message.update);
          break;
        case 'error':
          console.error(`WebSocket Error [${message.code}]: ${message.message}`);
          break;
      }
    };
  }

  private sendMessage(message: WSMessage) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(ProtocolCodec.encode(message));
  }

  private sendSyncStep1() {
    const stateVector = Y.encodeStateVector(this.doc);
    this.sendMessage({
      type: 'sync-step-1',
      stateVector
    });
  }

  public async flushPendingUpdates() {
    if (!this.isOnline || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const pending = await getPendingUpdates(this.docId);
    
    if (pending.length > this.MAX_PENDING_UPDATES) {
      console.warn('Too many pending updates, falling back to full state sync');
    }

    for (const item of pending) {
      try {
        this.sendMessage({
          type: 'update',
          update: item.update
        });
        if (item.id !== undefined) {
          await deletePendingUpdate(item.id);
        }
      } catch (error) {
        console.error('Failed to flush update:', error);
        break;
      }
    }
  }

  public getDoc() {
    return this.doc;
  }
}
