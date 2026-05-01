import { WSMessage, WSErrorCode } from "@repo/types";
import { ProtocolCodec } from "@repo/crdt";

export type { WSMessage, WSErrorCode };

export function encodeMessage(message: WSMessage): Uint8Array {
  return ProtocolCodec.encode(message);
}

export function decodeMessage(data: Uint8Array): WSMessage {
  return ProtocolCodec.decode(data);
}
