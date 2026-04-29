import express from "express";
import { protect } from "../middlewares/auth.middleware";
import { getSharedBrain, shareBrain } from "../controllers/brain.controller";

const brainRouter = express.Router();

brainRouter.post("/share", protect, shareBrain);    //Share your brain (protected)
brainRouter.get("/:shareLink", getSharedBrain);    //Get Someone else's brain (public)

export { brainRouter };