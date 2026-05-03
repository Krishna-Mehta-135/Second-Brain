import "./env.js";
import express, { Express } from "express";
import cors from "cors";
import { authRouter } from "./routers/auth.routes.js";
import { contentRouter } from "./routers/content.routes.js";
import { brainRouter } from "./routers/brain.routes.js";
import { documentRouter } from "./routers/document.routes.js";

const app: Express = express();

// CORS Configuration
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:3000",
      process.env.FRONTEND_URL || "http://localhost:3000",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    optionsSuccessStatus: 200,
  }),
);

app.use(express.json());

//Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/content", contentRouter);
app.use("/api/v1/brain", brainRouter);
app.use("/api/v1/documents", documentRouter);

export { app };
