import { TokenBucket } from './token-bucket.js';
import { WSMessage, decodeMessage } from './protocol.js';
import { ConnectionContext } from './room-manager.js';

/**
 * PRODUCTION SAFETY CONSTANTS
 */
const MAX_MESSAGE_BYTES = 512 * 1024; // 512KB limit to prevent memory exhaustion

/**
 * Composable Middleware Chain for WebSocket security.
 * Focuses on message size, rate limiting, and protocol validation.
 */
export class SecurityMiddleware {
  /**
   * Guards against oversized messages to prevent memory exhaustion.
   */
  public static checkMessageSize(data: any): boolean {
    const byteLength = data instanceof Buffer 
      ? data.byteLength 
      : (data as ArrayBuffer).byteLength;

    if (byteLength > MAX_MESSAGE_BYTES) {
      return false;
    }
    return true;
  }

  /**
   * Enforces per-client rate limits using the Token Bucket algorithm.
   */
  public static checkRateLimit(ctx: ConnectionContext & { bucket: TokenBucket }): boolean {
    return ctx.bucket.consume();
  }

  /**
   * Validates and decodes the message structure from binary format.
   * Returns null if the message is malformed or violates the protocol.
   */
  public static parseMessage(data: any): WSMessage | null {
    try {
      const binaryData = data instanceof Buffer 
        ? new Uint8Array(data) 
        : new Uint8Array(data as ArrayBuffer);
      
      return decodeMessage(binaryData);
    } catch (err) {
      return null;
    }
  }
}
