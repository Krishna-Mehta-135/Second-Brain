import * as Y from 'yjs';
import { DocumentManager } from './document-manager.js';
import { WSMessageType, encodeMessage } from './protocol.js';
import { RoomManager } from './room-manager.js';
import { RedisTransport } from './redis-transport.js';

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
  private roomManager: RoomManager;
  private redisTransport: RedisTransport;

  constructor(
    documentManager: DocumentManager,
    roomManager: RoomManager,
    redisTransport: RedisTransport
  ) {
    this.documentManager = documentManager;
    this.roomManager = roomManager;
    this.redisTransport = redisTransport;
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
   * Handles updates received from other instances via Redis Pub/Sub.
   * Applied directly to the document and broadcasted to all local clients.
   */
  public async handleExternalUpdate(docId: string, update: Uint8Array, originClientId: string): Promise<void> {
    // 1. Apply to local Y.Doc
    const applyResult = await this.documentManager.applyUpdate(docId, update);
    if (!applyResult.ok) {
      console.error(`Failed to apply external update for ${docId}:`, applyResult.error.message);
      return;
    }

    // 2. Broadcast to all local clients (no exclusion)
    const encodedMsg = encodeMessage({
      type: WSMessageType.Update,
      update: update
    });

    await this.roomManager.broadcast(docId, encodedMsg);
    // DO NOT re-publish to Redis (prevents infinite loop)
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

      // 3. Broadcast merged update once to all local clients in the room
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
      
      const excludeClientId = senders.size === 1 ? Array.from(senders)[0] : undefined;
      await this.roomManager.broadcast(docId, encodedMsg, excludeClientId);

      // 4. Redis Publish — fire and forget
      const primaryOriginId = Array.from(senders)[0] || 'server-merged';
      this.redisTransport.publish(docId, mergedUpdate, primaryOriginId);

    } catch (error) {
      console.error(`Error during coalescing flush for ${docId}:`, error);
    } finally {
      // If no new updates arrived during the async flush, delete the buffer entry
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
