import dotenv from "dotenv";
dotenv.config();

import { WebSocketServer, WebSocket } from "ws";
import { prisma } from "@repo/db";
import jwt from "jsonwebtoken";
import { parse } from "url";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
const wss = new WebSocketServer({ port: PORT });

interface JwtPayload {
    id: string;
    iat?: number;
    exp?: number;
}

interface AuthenticatedWebSocket extends WebSocket {
    userId?: string;
    isAlive: boolean;
}

const verifyToken = async (token: string): Promise<string | null> => {
    if (!process.env.JWT_SECRET) return null;
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as unknown as JwtPayload;
        
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true }
        });
        
        return user ? user.id : null;
    } catch (error) {
        return null;
    }
};

wss.on("connection", async (ws: AuthenticatedWebSocket, request) => {
    ws.isAlive = true;

    // Authenticate on connection via query parameter
    const { query } = parse(request.url || "", true);
    const token = query.token as string;

    if (!token) {
        ws.send(JSON.stringify({ type: "error", message: "Unauthorized: Token missing" }));
        ws.close(1008, "Unauthorized");
        return;
    }

    const userId = await verifyToken(token);
    
    if (!userId) {
        ws.send(JSON.stringify({ type: "error", message: "Unauthorized: Invalid token" }));
        ws.close(1008, "Unauthorized");
        return;
    }

    ws.userId = userId;
    console.log(`User connected: ${userId}`);

    ws.on("pong", () => {
        ws.isAlive = true;
    });

    ws.on("message", (message) => {
        try {
            const data = JSON.parse(message.toString());
            
            // Basic ping-pong logic
            if (data.type === "ping") {
                ws.send(JSON.stringify({ type: "pong" }));
            } else {
                ws.send(JSON.stringify({ type: "error", message: "Unknown message type" }));
            }
        } catch (error) {
            ws.send(JSON.stringify({ type: "error", message: "Invalid JSON format" }));
        }
    });

    ws.on("close", () => {
        console.log(`User disconnected: ${ws.userId}`);
    });
});

// Ping interval to keep connections alive and clean up dead ones
const interval = setInterval(() => {
    wss.clients.forEach((client) => {
        const ws = client as AuthenticatedWebSocket;
        if (!ws.isAlive) {
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

wss.on("close", () => {
    clearInterval(interval);
});

console.log(`WebSocket server is running on ws://localhost:${PORT}`);
