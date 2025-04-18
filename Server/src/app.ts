import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors"

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
app.use('/api/v1/auth', authRoutes)

export {app};
