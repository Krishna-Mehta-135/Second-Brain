import { ProtocolCodec } from "@repo/crdt";
import type { WSMessage } from "@repo/types";

/**
 * Encodes a WSMessage into a binary Uint8Array using the shared workspace protocol.
 */
export function encodeMessage(msg: WSMessage): Uint8Array {
  return ProtocolCodec.encode(msg);
}

/**
 * Decodes a binary Uint8Array into a WSMessage using the shared workspace protocol.
 */
export function decodeMessage(data: Uint8Array): WSMessage {
  return ProtocolCodec.decode(data);
}
