import express, { Router } from "express";
import {
  loginUser,
  registerUser,
  getMe,
  updateMe,
  getWsToken,
  googleAuth,
  googleCallback,
  githubAuth,
  githubCallback,
} from "../controllers/auth.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

console.log("[Router] Initializing Auth Routes...");

const authRouter: Router = express.Router();

authRouter.post("/register", registerUser); //Register
authRouter.post("/login", loginUser); //Login
authRouter.get("/me", protect, getMe); //Get current user
authRouter.put("/me", protect, updateMe); //Update current user
authRouter.get("/ws-token", protect, getWsToken); // Get WebSocket token

// Test Route
authRouter.get("/test", (req, res) => {
  res.json({ message: "Auth router is reachable" });
});

// OAuth Routes
authRouter.get("/google", googleAuth);
authRouter.get("/google/callback", googleCallback);
authRouter.get("/github", githubAuth);
authRouter.get("/github/callback", githubCallback);

export { authRouter };
