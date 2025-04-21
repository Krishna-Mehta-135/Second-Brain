import express from "express";
import { loginUser, registerUser } from "../controllers/auth.controller";

const authRouter = express.Router();

authRouter.post("/register", registerUser);  //Register
authRouter.post("/login", loginUser);    //Login

export {authRouter}