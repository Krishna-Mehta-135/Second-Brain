import dotenv from "dotenv";
dotenv.config();

import { createServer, type IncomingMessage } from "http";
import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import { WebSocketServer, WebSocket } from "ws";
import type { Duplex } from "stream";

import { DocumentManager } from "./document-manager.js";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
const HEARTBEAT_INTERVAL = 30_000;
const HEARTBEAT_TIMEOUT = 10_000;
const HEARTBEAT_SCAN_INTERVAL = 1_000;
const DOCUMENT_PATH_PREFIX = "/ws/documents/";
const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

import { 
  WSMessageType, 
  WSErrorCode, 
  decodeMessage, 
  encodeMessage 
} from "./protocol.js";
import { CoalesceBufferManager } from "./coalesce-buffer.js";
import { RoomManager, type ConnectionContext } from "./room-manager.js";
import { RedisTransport } from "./redis-transport.js";

const loggerInstance = {
    info: (ctx: any, msg: string) => logger("info", ctx, msg),
    warn: (ctx: any, msg: string) => logger("warn", ctx, msg),
    error: (ctx: any, msg: string) => logger("error", ctx, msg),
};

const documentManager = new DocumentManager({
    loadSnapshot: async () => null,
    flushSnapshot: async () => undefined,
    onError: (error) => {
        logger("error", { reason: error.message }, "document manager error");
    },
});

type AuthResult =
    | { success: true; userId: string; docId: string }
    | { success: false; reason: string; httpCode: 401 | 403 };

type UpgradeMiddleware = (req: IncomingMessage) => Promise<AuthResult>;

interface JwtPayload {
    id: string;
    iat?: number;
    exp?: number;
}

interface LoggerContext {
    clientId?: string;
    docId?: string;
    userId?: string;
    reason?: string;
    connectedAt?: number;
    isOfflineClient?: boolean;
    documentWasWarm?: boolean;
}

const redisTransport = new RedisTransport(process.env.REDIS_URL ?? "redis://localhost:6379", loggerInstance);
const roomManager = new RoomManager(documentManager, loggerInstance);
const coalesceManager = new CoalesceBufferManager(documentManager, roomManager, redisTransport);

const server = createServer();
const wss = new WebSocketServer({ noServer: true });
const allConnections = new Map<string, ConnectionContext>();
const pendingHeartbeatAt = new Map<string, number>();
const lastPongAt = new Map<string, number>();
const authMiddleware = createUpgradeMiddleware(process.env.JWT_SECRET ?? "");

server.on("upgrade", async (req, socket, head) => {
    const authResult = await authMiddleware(req);
    if (!authResult.success) {
        rejectUpgrade(socket, authResult.httpCode);
        logger("warn", { reason: authResult.reason }, "upgrade rejected");
        return;
    }

    const { userId, docId } = authResult;

    try {
        const wasAlreadyWarm = documentManager.has(docId);
        // The socket stays unopened until the document is ready so the client never races an empty state load.
        await documentManager.getOrCreate(docId);

        logger(
            "info",
            { docId, userId, documentWasWarm: wasAlreadyWarm },
            "document prewarmed before websocket upgrade",
        );
    } catch (error: unknown) {
        rejectUpgrade(socket, 403);
        logger("error", { docId, userId, reason: "document prewarm failed" }, "upgrade rejected");
        return;
    }

    const clientId = randomUUID();
    const isOfflineClient = req.headers["x-client-state"] === "offline-reconnect";

    wss.handleUpgrade(req, socket, head, (ws) => {
        const ctx: ConnectionContext = {
            ws,
            userId,
            docId,
            clientId,
            connectedAt: Date.now(),
            isAlive: true,
            isOfflineClient,
        };

        void registerConnection(ctx).then((registered) => {
            if (registered) {
                handleConnection(ws, ctx);
                return;
            }

            ws.terminate();
        });
    });
});

function handleConnection(ws: WebSocket, ctx: ConnectionContext): void {
    logger(
        "info",
        { clientId: ctx.clientId, docId: ctx.docId, userId: ctx.userId },
        "connection established",
    );

    // Phase 1 of Sync Handshake: Server sends its state vector to the client
    const serverStateVectorResult = documentManager.getStateVector(ctx.docId);
    if (serverStateVectorResult.ok) {
        ws.send(encodeMessage({
            type: WSMessageType.SyncStep1,
            stateVector: serverStateVectorResult.value
        }));
    }

    ws.on("message", async (data) => {
        try {
            // All messages are binary
            const binaryData = data instanceof Buffer 
                ? new Uint8Array(data) 
                : new Uint8Array(data as ArrayBuffer);
            
            const message = decodeMessage(binaryData);

            switch (message.type) {
                case WSMessageType.Ping:
                    ws.send(encodeMessage({ type: WSMessageType.Pong }));
                    break;
                
                case WSMessageType.SyncStep1: {
                    // Phase 2: Client sent its state vector. 
                    // Server computes the diff and sends it back (Step 2).
                    const diffResult = await documentManager.getUpdateSince(ctx.docId, message.stateVector);
                    if (diffResult.ok) {
                        ws.send(encodeMessage({
                            type: WSMessageType.SyncStep2,
                            update: diffResult.value
                        }));
                    }
                    break;
                }

                case WSMessageType.SyncStep2:
                case WSMessageType.Update:
                case WSMessageType.AIUpdate: {
                    // Apply to local doc and broadcast via coalesce buffer
                    // AI updates are treated identical to user updates for CRDT
                    const requestId = message.type === WSMessageType.AIUpdate ? message.requestId : undefined;
                    coalesceManager.enqueueUpdate(ctx.docId, message.update, ctx.clientId, requestId);
                    break;
                }

                case WSMessageType.Awareness: {
                    // Awareness is volatile and usually not persisted, 
                    // we broadcast it immediately with backpressure handling.
                    const encoded = encodeMessage(message);
                    void roomManager.broadcastAwareness(ctx.docId, encoded, ctx.clientId);
                    break;
                }
            }
        } catch (err) {
            logger("error", { clientId: ctx.clientId, reason: "protocol error" }, "failed to handle binary message");
            ws.send(encodeMessage({
                type: WSMessageType.Error,
                code: WSErrorCode.INVALID_MESSAGE,
                message: "Protocol violation or malformed binary frame"
            }));
        }
    });
}

const heartbeatInterval = setInterval(() => {
    const now = Date.now();

    for (const [clientId, ctx] of allConnections) {
        const heartbeatStartedAt = pendingHeartbeatAt.get(clientId);

        if (
            heartbeatStartedAt !== undefined &&
            now - heartbeatStartedAt >= HEARTBEAT_TIMEOUT &&
            !ctx.isAlive
        ) {
            logger(
                "warn",
                { clientId, docId: ctx.docId, userId: ctx.userId },
                "zombie connection terminated",
            );

            ctx.ws.terminate();
            void roomManager.leave(ctx.docId, clientId);
            allConnections.delete(clientId);
            pendingHeartbeatAt.delete(clientId);
            lastPongAt.delete(clientId);
            continue;
        }

        const lastSeenAt = lastPongAt.get(clientId) ?? ctx.connectedAt;
        if (heartbeatStartedAt === undefined && now - lastSeenAt >= HEARTBEAT_INTERVAL) {
            ctx.isAlive = false;
            pendingHeartbeatAt.set(clientId, now);
            ctx.ws.ping();
        }
    }
}, HEARTBEAT_SCAN_INTERVAL);

wss.on("close", () => {
    clearInterval(heartbeatInterval);
});

server.listen(PORT, () => {
    logger("info", {}, `WebSocket server is running on ws://localhost:${PORT}`);
});

function createUpgradeMiddleware(jwtSecret: string): UpgradeMiddleware {
    return async (req: IncomingMessage): Promise<AuthResult> => {
        if (jwtSecret.length === 0) {
            return { success: false, reason: "missing jwt secret", httpCode: 401 };
        }

        const token = extractBearerToken(req);
        if (token === null) {
            return { success: false, reason: "missing bearer token", httpCode: 401 };
        }

        const docId = extractDocumentId(req);
        if (docId === null) {
            return { success: false, reason: "invalid document path", httpCode: 403 };
        }

        const userId = verifyToken(token, jwtSecret);
        if (userId === null) {
            return { success: false, reason: "invalid bearer token", httpCode: 401 };
        }

        return { success: true, userId, docId };
    };
}

async function registerConnection(ctx: ConnectionContext): Promise<boolean> {
    ctx.ws.on("pong", () => {
        ctx.isAlive = true;
        pendingHeartbeatAt.delete(ctx.clientId);
        lastPongAt.set(ctx.clientId, Date.now());
    });

    const cleanup = (): void => {
        void (async () => {
            await roomManager.leave(ctx.docId, ctx.clientId);
            if (roomManager.getClientCount(ctx.docId) === 0) {
                await redisTransport.unsubscribe(ctx.docId);
            }
            allConnections.delete(ctx.clientId);
            pendingHeartbeatAt.delete(ctx.clientId);
            lastPongAt.delete(ctx.clientId);
        })();
    };

    // Cleanup stays at the connection boundary so transport failures cannot leave stale room membership behind.
    ctx.ws.on("close", cleanup);
    ctx.ws.on("error", cleanup);

    await roomManager.join(ctx.docId, ctx);
    
    // Subscribe when the first local client joins the document room
    if (roomManager.getClientCount(ctx.docId) === 1) {
        await redisTransport.subscribe(ctx.docId, (update, originId) => {
            void coalesceManager.handleExternalUpdate(ctx.docId, update, originId);
        });
    }

    if (ctx.ws.readyState !== WebSocket.OPEN) {
        await roomManager.leave(ctx.docId, ctx.clientId);
        if (roomManager.getClientCount(ctx.docId) === 0) {
            await redisTransport.unsubscribe(ctx.docId);
        }
        return false;
    }

    allConnections.set(ctx.clientId, ctx);
    lastPongAt.set(ctx.clientId, ctx.connectedAt);

    return true;
}

function extractBearerToken(req: IncomingMessage): string | null {
    const authorization = req.headers.authorization;

    if (typeof authorization === "string") {
        const [scheme, token] = authorization.split(" ");
        if (scheme === "Bearer" && typeof token === "string" && token.length > 0) {
            return token;
        }
    }

    const url = getRequestUrl(req);
    const token = url.searchParams.get("token");

    return token && token.length > 0 ? token : null;
}

function extractDocumentId(req: IncomingMessage): string | null {
    const url = getRequestUrl(req);
    if (!url.pathname.startsWith(DOCUMENT_PATH_PREFIX)) {
        return null;
    }

    const docId = url.pathname.slice(DOCUMENT_PATH_PREFIX.length);

    return UUID_PATTERN.test(docId) ? docId : null;
}

function getRequestUrl(req: IncomingMessage): URL {
    return new URL(req.url ?? "", "http://localhost");
}

function verifyToken(token: string, jwtSecret: string): string | null {
    try {
        const decoded = jwt.verify(token, jwtSecret);
        if (typeof decoded !== "object" || decoded === null || !("id" in decoded)) {
            return null;
        }

        const { id } = decoded as JwtPayload;
        return typeof id === "string" && id.length > 0 ? id : null;
    } catch {
        return null;
    }
}

function rejectUpgrade(socket: Duplex, httpCode: 401 | 403): void {
    const statusLine = httpCode === 401 ? "401 Unauthorized" : "403 Forbidden";
    socket.write(`HTTP/1.1 ${statusLine}\r\n\r\n`);
    socket.destroy();
}

function logger(level: "info" | "warn" | "error", context: LoggerContext, message: string): void {
    console.log(
        JSON.stringify({
            level,
            ...context,
            message,
            timestamp: new Date().toISOString(),
        }),
    );
}
