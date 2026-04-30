import * as Y from 'yjs';

/**
 * Stable enum for binary framing. 
 * DO NOT reorder these values as they are used for binary protocol compatibility.
 */
export enum WSMessageType {
  SyncStep1 = 0,
  SyncStep2 = 1,
  Update = 2,
  Awareness = 3,
  AIUpdate = 4,
  Error = 5,
  Ping = 6,
  Pong = 7,
}

export enum WSErrorCode {
  RATE_LIMITED = 'RATE_LIMITED',
  MESSAGE_TOO_LARGE = 'MESSAGE_TOO_LARGE',
  INVALID_UPDATE = 'INVALID_UPDATE',
  INVALID_MESSAGE = 'INVALID_MESSAGE',
  UNAUTHORIZED = 'UNAUTHORIZED',
  DOC_NOT_FOUND = 'DOC_NOT_FOUND',
}

export type WSMessage =
  | { type: WSMessageType.SyncStep1; stateVector: Uint8Array }
  | { type: WSMessageType.SyncStep2; update: Uint8Array }
  | { type: WSMessageType.Update; update: Uint8Array }
  | { type: WSMessageType.Awareness; state: Uint8Array }
  | { type: WSMessageType.AIUpdate; update: Uint8Array; requestId: string }
  | { type: WSMessageType.Error; code: WSErrorCode; message: string }
  | { type: WSMessageType.Ping }
  | { type: WSMessageType.Pong };

/**
 * Encodes a message into the binary format: [1 byte: type] [payload]
 */
export function encodeMessage(message: WSMessage): Uint8Array {
  const type = message.type;
  let payload: Uint8Array;

  switch (message.type) {
    case WSMessageType.SyncStep1:
      payload = message.stateVector;
      break;
    case WSMessageType.SyncStep2:
    case WSMessageType.Update:
      payload = message.update;
      break;
    case WSMessageType.Awareness:
      payload = message.state;
      break;
    case WSMessageType.AIUpdate: {
      // For AI updates, we pack [requestId length (1 byte)] [requestId] [update]
      const requestIdBytes = new TextEncoder().encode(message.requestId);
      payload = new Uint8Array(1 + requestIdBytes.length + message.update.length);
      payload[0] = requestIdBytes.length;
      payload.set(requestIdBytes, 1);
      payload.set(message.update, 1 + requestIdBytes.length);
      break;
    }
    case WSMessageType.Error: {
      const errorPayload = JSON.stringify({ code: message.code, message: message.message });
      payload = new TextEncoder().encode(errorPayload);
      break;
    }
    case WSMessageType.Ping:
    case WSMessageType.Pong:
      payload = new Uint8Array(0);
      break;
    default:
      // Exhaustive check for TypeScript
      const _: never = message;
      throw new Error('Unknown message type');
  }

  const result = new Uint8Array(1 + payload.length);
  result[0] = type;
  result.set(payload, 1);
  return result;
}

/**
 * Decodes a binary message from the format: [1 byte: type] [payload]
 */
export function decodeMessage(data: Uint8Array): WSMessage {
  if (data.length === 0) throw new Error('Empty message');
  
  const type = data[0] as WSMessageType;
  const payload = data.subarray(1);

  switch (type) {
    case WSMessageType.SyncStep1:
      return { type: WSMessageType.SyncStep1, stateVector: new Uint8Array(payload) };
    case WSMessageType.SyncStep2:
      return { type: WSMessageType.SyncStep2, update: new Uint8Array(payload) };
    case WSMessageType.Update:
      return { type: WSMessageType.Update, update: new Uint8Array(payload) };
    case WSMessageType.Awareness:
      return { type: WSMessageType.Awareness, state: new Uint8Array(payload) };
    case WSMessageType.AIUpdate: {
      const requestIdLen = payload[0];
      const requestId = new TextDecoder().decode(payload.subarray(1, 1 + requestIdLen));
      const update = new Uint8Array(payload.subarray(1 + requestIdLen));
      return { type: WSMessageType.AIUpdate, update, requestId };
    }
    case WSMessageType.Error: {
      const { code, message } = JSON.parse(new TextDecoder().decode(payload));
      return { type: WSMessageType.Error, code, message };
    }
    case WSMessageType.Ping:
      return { type: WSMessageType.Ping };
    case WSMessageType.Pong:
      return { type: WSMessageType.Pong };
    default:
      return { 
        type: WSMessageType.Error, 
        code: WSErrorCode.INVALID_MESSAGE, 
        message: `Unknown message type: ${type}` 
      };
  }
}
