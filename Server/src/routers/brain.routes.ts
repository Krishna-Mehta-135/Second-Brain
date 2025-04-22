import express from "express";
import { protect } from "../middlewares/auth.middleware";
import { getSharedBrain, shareBrain } from "../controllers/brain.controller";

const brainRouter = express.Router();

// Apply auth middleware to all routes
brainRouter.use(protect);

brainRouter.post("/share", shareBrain);    //Share your brain
brainRouter.get("/:shareLink", getSharedBrain);    //Get Someone else's brain

export { brainRouter };