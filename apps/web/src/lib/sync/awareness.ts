import * as Y from "yjs";
import {
  Awareness,
  encodeAwarenessUpdate,
  applyAwarenessUpdate,
} from "y-protocols/awareness";
import type { SyncManager } from "./SyncManager";

export interface UserPresence {
  userId: string;
  name: string;
  color: string;
  cursor: { anchor: number; head: number } | null;
  lastSeen: number;
}

/**
 * AwarenessManager wraps y-protocols/awareness and synchronizes ephemeral
 * presence data (cursors, active users) via the SyncManager.
 */
export class AwarenessManager {
  public readonly awareness: Awareness;
  private heartbeatInterval: ReturnType<typeof setInterval>;

  constructor(
    private readonly doc: Y.Doc,
    private readonly manager: SyncManager,
    localUser: { userId: string; name: string; color: string },
  ) {
    this.awareness = new Awareness(doc);

    // Set local user state
    this.awareness.setLocalState({
      userId: localUser.userId,
      name: localUser.name,
      color: localUser.color,
      cursor: null,
      lastSeen: Date.now(),
    } satisfies UserPresence);

    // Link SyncManager with this awareness instance
    this.manager.setAwareness(this.awareness);

    // When local awareness changes — broadcast to other clients
    this.awareness.on(
      "update",
      ({
        added,
        updated,
        removed,
      }: {
        added: number[];
        updated: number[];
        removed: number[];
      }) => {
        const changedClients = [...added, ...updated, ...removed];
        if (changedClients.length === 0) return;

        // Encode only the changed clients as binary
        const update = encodeAwarenessUpdate(this.awareness, changedClients);
        manager.send({ type: "awareness", state: update });
      },
    );

    // When server sends awareness update — apply it locally
    manager.onMessage("awareness", (msg) => {
      if (msg.type !== "awareness") return;
      applyAwarenessUpdate(this.awareness, msg.state, "remote");
    });

    // Heartbeat — update lastSeen every 15 seconds to stay "active"
    this.heartbeatInterval = setInterval(() => {
      this.awareness.setLocalStateField("lastSeen", Date.now());
    }, 15_000);
  }

  /**
   * Returns a list of users active within the last 30 seconds.
   */
  getActiveUsers(): UserPresence[] {
    const states = this.awareness.getStates();
    const now = Date.now();

    return Array.from(states.values())
      .filter((s): s is UserPresence => {
        if (!s) return false;
        const presence = s as UserPresence;
        return now - presence.lastSeen < 30_000;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Updates the local user's cursor position.
   */
  updateCursor(anchor: number, head: number) {
    this.awareness.setLocalStateField("cursor", { anchor, head });
  }

  /**
   * Cleans up listeners and signals disconnect to other clients.
   */
  destroy() {
    clearInterval(this.heartbeatInterval);
    // Setting local state to null tells other clients to remove this user immediately
    this.awareness.setLocalState(null);
    this.awareness.destroy();
  }
}
