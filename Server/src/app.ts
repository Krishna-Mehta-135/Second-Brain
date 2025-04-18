import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors"
import { authRouter } from "./routers/auth.routes";
import { contentRouter } from "./routers/content.routes";
import { brainRouter } from "./routers/brain.routes";

const app = express();

// CORS Configuration
app.use(
    cors({
        origin: "http://localhost:5173",
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

app.use(express.json())


//Routes
app.use('/api/v1/auth', authRouter)
app.use('/api/v1/content', contentRouter)
app.use('/api/v1/brain', brainRouter)

export {app};
