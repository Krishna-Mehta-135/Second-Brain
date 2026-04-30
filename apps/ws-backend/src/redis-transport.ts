import { Redis, type Redis as RedisClient } from 'ioredis';
import { randomUUID } from 'crypto';

/**
 * Instance ID is unique to this process and persists for the lifecycle of the process.
 * Used to filter out our own broadcasts received via Pub/Sub.
 */
const INSTANCE_ID = randomUUID();
const REDIS_CHANNEL_PREFIX = 'crdt:updates:';

export type RedisUpdateHandler = (update: Uint8Array, originClientId: string) => void;

interface RedisEnvelope {
  instanceId: string;
  clientId: string;
  update: string; // Base64 encoded update
  timestamp: number;
}

export interface Logger {
  info(ctx: any, msg: string): void;
  warn(ctx: any, msg: string): void;
  error(ctx: any, msg: string): void;
}

export class RedisTransport {
  private pub: RedisClient;
  private sub: RedisClient;
  private handlers = new Map<string, RedisUpdateHandler>();
  private activeDocIds = new Set<string>();
  private logger: Logger;
  private healthy = true;

  constructor(redisUrl: string, logger: Logger) {
    this.logger = logger;

    const commonConfig = {
      maxRetriesPerRequest: null, // Required for Pub/Sub
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    };

    this.pub = new Redis(redisUrl, commonConfig);
    this.sub = new Redis(redisUrl, commonConfig);

    this.setupListeners();
  }

  private setupListeners(): void {
    this.pub.on('error', (err) => {
      this.healthy = false;
      this.logger.error({ err, type: 'pub' }, 'redis:transport:error');
    });

    this.sub.on('error', (err) => {
      this.healthy = false;
      this.logger.error({ err, type: 'sub' }, 'redis:transport:error');
    });

    this.sub.on('connect', () => {
      this.healthy = true;
      this.logger.info({}, 'redis:transport:connected');
    });

    this.sub.on('reconnecting', () => {
      this.logger.warn({}, 'redis:transport:reconnecting');
      void this.resubscribeAll();
    });

    this.sub.on('message', (channel, message) => {
      const docId = channel.slice(REDIS_CHANNEL_PREFIX.length);
      const handler = this.handlers.get(docId);
      if (!handler) return;

      try {
        const envelope: RedisEnvelope = JSON.parse(message);

        // Filter out our own updates
        if (envelope.instanceId === INSTANCE_ID) {
          return;
        }

        const update = new Uint8Array(Buffer.from(envelope.update, 'base64'));
        handler(update, envelope.clientId);
      } catch (err) {
        this.logger.error({ err, channel }, 'redis:transport:decode_error');
      }
    });
  }

  /**
   * Publishes an update to Redis. 
   * Fire-and-forget: Do NOT await this in the WebSocket handler.
   */
  public publish(docId: string, update: Uint8Array, originClientId: string): void {
    const envelope: RedisEnvelope = {
      instanceId: INSTANCE_ID,
      clientId: originClientId,
      update: Buffer.from(update).toString('base64'),
      timestamp: Date.now(),
    };

    this.pub.publish(`${REDIS_CHANNEL_PREFIX}${docId}`, JSON.stringify(envelope)).catch((err) => {
      this.logger.error({ err, docId }, 'redis:publish:failed');
    });
  }

  /**
   * Subscribes to updates for a specific document.
   */
  public async subscribe(docId: string, handler: RedisUpdateHandler): Promise<void> {
    this.handlers.set(docId, handler);
    this.activeDocIds.add(docId);

    try {
      await this.sub.subscribe(`${REDIS_CHANNEL_PREFIX}${docId}`);
    } catch (err) {
      this.logger.error({ err, docId }, 'redis:subscribe:failed');
      throw err;
    }
  }

  /**
   * Unsubscribes from updates for a specific document.
   */
  public async unsubscribe(docId: string): Promise<void> {
    this.handlers.delete(docId);
    this.activeDocIds.delete(docId);

    try {
      await this.sub.unsubscribe(`${REDIS_CHANNEL_PREFIX}${docId}`);
    } catch (err) {
      this.logger.error({ err, docId }, 'redis:unsubscribe:failed');
    }
  }

  /**
   * Re-subscribes to all active documents. 
   * Used after Redis connection is lost and restored.
   */
  public async resubscribeAll(): Promise<void> {
    if (this.activeDocIds.size === 0) return;

    const channels = Array.from(this.activeDocIds).map(id => `${REDIS_CHANNEL_PREFIX}${id}`);
    try {
      await this.sub.subscribe(...channels);
      this.logger.info({ count: channels.length }, 'redis:resubscribe:success');
    } catch (err) {
      this.logger.error({ err }, 'redis:resubscribe:failed');
    }
  }

  public isHealthy(): boolean {
    return this.healthy;
  }

  /**
   * Clean up Redis connections.
   */
  public async destroy(): Promise<void> {
    await Promise.all([this.pub.quit(), this.sub.quit()]);
  }
}
