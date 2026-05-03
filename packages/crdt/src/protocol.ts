import { WSMessage, WSErrorCode, InsertPosition } from "@repo/types";

/**
 * Internal enum for binary framing.
 */
enum BinaryType {
  SyncStep1 = 0,
  SyncStep2 = 1,
  Update = 2,
  Awareness = 3,
  AIUpdate = 4,
  Error = 5,
  Ping = 6,
  Pong = 7,
  AIRequest = 8,
  AICancel = 9,
}

const TypeMap: Record<WSMessage["type"], BinaryType> = {
  "sync-step-1": BinaryType.SyncStep1,
  "sync-step-2": BinaryType.SyncStep2,
  update: BinaryType.Update,
  awareness: BinaryType.Awareness,
  "ai-update": BinaryType.AIUpdate,
  error: BinaryType.Error,
  ping: BinaryType.Ping,
  pong: BinaryType.Pong,
  "ai-request": BinaryType.AIRequest,
  "ai-cancel": BinaryType.AICancel,
};

const ReverseTypeMap: Record<number, WSMessage["type"]> = Object.fromEntries(
  Object.entries(TypeMap).map(([k, v]) => [v, k as WSMessage["type"]]),
);

/**
 * Shared codec for binary protocol.
 * Environment-agnostic (works in Node and Browser).
 */
export class ProtocolCodec {
  public static encode(message: WSMessage): Uint8Array {
    const binaryTypeMaybe = TypeMap[message.type];
    if (binaryTypeMaybe === undefined) {
      throw new Error(`Unknown message type: ${message.type}`);
    }
    // After the undefined check, TS cannot narrow a const through subsequent
    // statements due to noUncheckedIndexedAccess — use a narrowed binding.
    const binaryType: BinaryType = binaryTypeMaybe;
    let payload: Uint8Array;

    switch (message.type) {
      case "sync-step-1":
        payload = message.stateVector;
        break;
      case "sync-step-2":
      case "update":
        payload = message.update;
        break;
      case "awareness":
        payload = message.state;
        break;
      case "ai-update": {
        // Frame: [requestIdLen:1][isDone:1][textLen:2LE][requestId:N][text:M][update:K]
        const requestIdBytes = new TextEncoder().encode(message.requestId);
        const textBytes = new TextEncoder().encode(message.text);
        const headerSize = 4; // requestIdLen(1) + isDone(1) + textLen(2)
        payload = new Uint8Array(
          headerSize +
            requestIdBytes.length +
            textBytes.length +
            message.update.length,
        );
        payload[0] = requestIdBytes.length;
        payload[1] = message.isDone ? 1 : 0;
        // textLen as little-endian uint16
        payload[2] = textBytes.length & 0xff;
        payload[3] = (textBytes.length >> 8) & 0xff;
        payload.set(requestIdBytes, headerSize);
        payload.set(textBytes, headerSize + requestIdBytes.length);
        payload.set(
          message.update,
          headerSize + requestIdBytes.length + textBytes.length,
        );
        break;
      }
      case "ai-request": {
        const json = JSON.stringify({
          prompt: message.prompt,
          insertPosition: message.insertPosition,
          requestId: message.requestId,
        });
        payload = new TextEncoder().encode(json);
        break;
      }
      case "ai-cancel": {
        payload = new TextEncoder().encode(message.requestId);
        break;
      }
      case "error": {
        const errorPayload = JSON.stringify({
          code: message.code,
          message: message.message,
        });
        payload = new TextEncoder().encode(errorPayload);
        break;
      }
      case "ping":
      case "pong":
        payload = new Uint8Array(0);
        break;
      default: {
        const _exhaustiveCheck: never = message;
        throw new Error("Unknown message type");
      }
    }

    const result = new Uint8Array(1 + payload.length);
    result[0] = binaryType;
    result.set(payload, 1);
    return result;
  }

  public static decode(data: Uint8Array): WSMessage {
    if (data.length === 0) throw new Error("Empty message");

    // noUncheckedIndexedAccess makes data[0] return number|undefined;
    // the length check above guarantees it's defined.
    const binaryType = data[0] as number;
    const type = ReverseTypeMap[binaryType];
    const payload = data.subarray(1);

    if (type === undefined) {
      throw new Error(`Unknown binary type: ${binaryType}`);
    }

    switch (type) {
      case "sync-step-1":
        return { type, stateVector: new Uint8Array(payload) };
      case "sync-step-2":
        return { type, update: new Uint8Array(payload) };
      case "update":
        return { type, update: new Uint8Array(payload) };
      case "awareness":
        return { type, state: new Uint8Array(payload) };
      case "ai-update": {
        // Frame: [requestIdLen:1][isDone:1][textLen:2LE][requestId:N][text:M][update:K]
        const requestIdLen = payload[0] ?? 0;
        const isDone = payload[1] === 1;
        const textLen = (payload[2] ?? 0) | ((payload[3] ?? 0) << 8);
        const headerSize = 4;
        const requestId = new TextDecoder().decode(
          payload.subarray(headerSize, headerSize + requestIdLen),
        );
        const text = new TextDecoder().decode(
          payload.subarray(
            headerSize + requestIdLen,
            headerSize + requestIdLen + textLen,
          ),
        );
        const update = new Uint8Array(
          payload.subarray(headerSize + requestIdLen + textLen),
        );
        return { type, update, text, requestId, isDone };
      }
      case "ai-request": {
        const json = new TextDecoder().decode(payload);
        const decoded = JSON.parse(json);
        return {
          type,
          prompt: decoded.prompt,
          insertPosition: decoded.insertPosition as InsertPosition,
          requestId: decoded.requestId,
        };
      }
      case "ai-cancel": {
        const requestId = new TextDecoder().decode(payload);
        return { type, requestId };
      }
      case "error": {
        // JSON.parse returns `any`; cast to a known shape to avoid leaking
        // `any` into the return type which breaks exhaustive checking.
        const parsed = JSON.parse(new TextDecoder().decode(payload)) as {
          code: WSErrorCode;
          message: string;
        };
        return { type, code: parsed.code, message: parsed.message };
      }
      case "ping":
        return { type };
      case "pong":
        return { type };
      default: {
        const _exhaustiveCheck: never = type;
        throw new Error(`Unhandled message type: ${type}`);
      }
    }
  }
}
