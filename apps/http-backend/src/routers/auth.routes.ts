import express, { Router } from "express";
import { loginUser, registerUser } from "../controllers/auth.controller.js";

const authRouter: Router = express.Router();

authRouter.post("/register", registerUser);  //Register
authRouter.post("/login", loginUser);    //Login

export {authRouter};
