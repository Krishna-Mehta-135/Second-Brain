import * as Y from 'yjs';
import { DocumentManager } from './document-manager.js';
import { WSMessageType, encodeMessage } from './protocol.js';

const COALESCE_INTERVAL_MS = 16;

interface CoalesceBuffer {
  updates: Uint8Array[];
  flushTimer: NodeJS.Timeout | null;
  lastAIRequestId: string | null;
  senders: Set<string>;
}

export class CoalesceBufferManager {
  private buffers = new Map<string, CoalesceBuffer>();
  private documentManager: DocumentManager;
  private broadcastCallback: (docId: string, message: Uint8Array, excludeClientIds: Set<string>) => void;

  constructor(
    documentManager: DocumentManager,
    broadcastCallback: (docId: string, message: Uint8Array, excludeClientIds: Set<string>) => void
  ) {
    this.documentManager = documentManager;
    this.broadcastCallback = broadcastCallback;
  }

  /**
   * Enqueues an update for a document. 
   * Flushes after 16ms (one animation frame).
   */
  public enqueueUpdate(
    docId: string, 
    update: Uint8Array, 
    originClientId?: string, 
    requestId?: string
  ): void {
    let buffer = this.buffers.get(docId);
    
    if (!buffer) {
      buffer = { 
        updates: [], 
        flushTimer: null, 
        lastAIRequestId: null,
        senders: new Set<string>() 
      };
      this.buffers.set(docId, buffer);
    }

    buffer.updates.push(update);
    if (originClientId) buffer.senders.add(originClientId);
    if (requestId) buffer.lastAIRequestId = requestId;

    if (!buffer.flushTimer) {
      buffer.flushTimer = setTimeout(() => {
        void this.flushBuffer(docId);
      }, COALESCE_INTERVAL_MS);
    }
  }

  /**
   * Merges all queued updates for a document and applies them to the document manager
   * and broadcasts to all connected clients.
   */
  private async flushBuffer(docId: string): Promise<void> {
    const buffer = this.buffers.get(docId);
    if (!buffer || buffer.updates.length === 0) {
      this.buffers.delete(docId);
      return;
    }

    const updatesToFlush = buffer.updates;
    const senders = buffer.senders;
    const aiRequestId = buffer.lastAIRequestId;

    buffer.updates = [];
    buffer.senders = new Set<string>();
    buffer.lastAIRequestId = null;
    buffer.flushTimer = null;

    try {
      // 1. Merge updates into a single Y.js update
      const mergedUpdate = Y.mergeUpdates(updatesToFlush);

      // 2. Apply merged update once to the server doc
      const applyResult = await this.documentManager.applyUpdate(docId, mergedUpdate);
      if (!applyResult.ok) {
        console.error(`Failed to apply merged update for ${docId}:`, applyResult.error.message);
        return;
      }

      // 3. Broadcast merged update once to all clients in the room
      // If we have an AI request ID, we broadcast as an AIUpdate to preserve the typing indicator.
      // Otherwise, we broadcast as a generic Update.
      const encodedMsg = aiRequestId 
        ? encodeMessage({
            type: WSMessageType.AIUpdate,
            update: mergedUpdate,
            requestId: aiRequestId
          })
        : encodeMessage({
            type: WSMessageType.Update,
            update: mergedUpdate
          });
      
      // If only one client sent updates in this window, we can safely exclude them to save bandwidth.
      // If multiple clients sent updates, we broadcast to everyone because everyone needs someone else's part.
      const excludeClientIds = senders.size === 1 ? senders : new Set<string>();
      this.broadcastCallback(docId, encodedMsg, excludeClientIds);

    } catch (error) {
      console.error(`Error during coalescing flush for ${docId}:`, error);
    } finally {
      if (buffer.updates.length === 0) {
        this.buffers.delete(docId);
      }
    }
  }

      // 4. Redis Publish / Persistence
      // The documentManager.applyUpdate marks it dirty, 
      // and the debounce logic in DocumentManager handles persistence.
      // Cross-instance Redis sync would happen here if implemented.
      
    } catch (error) {
      console.error(`Error during coalescing flush for ${docId}:`, error);
    } finally {
      // If new updates arrived during the async apply/broadcast, 
      // they will have already started a new flushTimer.
      if (buffer.updates.length === 0) {
        this.buffers.delete(docId);
      }
    }
  }

  /**
   * Forces an immediate flush of all pending buffers. 
   * Useful during graceful shutdown.
   */
  public async flushAll(): Promise<void> {
    const docIds = Array.from(this.buffers.keys());
    await Promise.all(docIds.map(id => this.flushBuffer(id)));
  }
}
