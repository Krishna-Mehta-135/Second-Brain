import * as Y from 'yjs';

export function mergeUpdates(updates: Uint8Array[]): Uint8Array {
  return Y.mergeUpdates(updates);
}

export function encodeStateVector(doc: Y.Doc): Uint8Array {
  return Y.encodeStateVector(doc);
}

export function encodeStateDiff(doc: Y.Doc, stateVector: Uint8Array): Uint8Array {
  return Y.encodeStateAsUpdate(doc, stateVector);
}

export function applyUpdateSafe(doc: Y.Doc, update: Uint8Array): { ok: true } | { ok: false; error: string } {
  try {
    Y.applyUpdate(doc, update);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export * from './protocol.js';
