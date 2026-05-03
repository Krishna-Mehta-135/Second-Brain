import express, { Router } from "express";
import {
  loginUser,
  registerUser,
  getMe,
  getWsToken,
} from "../controllers/auth.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const authRouter: Router = express.Router();

authRouter.post("/register", registerUser); //Register
authRouter.post("/login", loginUser); //Login
authRouter.get("/me", protect, getMe); //Get current user
authRouter.post("/ws-token", protect, getWsToken); // Get WebSocket token

export { authRouter };
