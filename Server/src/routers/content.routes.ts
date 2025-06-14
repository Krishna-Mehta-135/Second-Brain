import express from "express";
import { createNewContent, deleteContent, getAllContent, updateContent } from "../controllers/contentController";
import { protect } from "../middlewares/auth.middleware";

const contentRouter = express.Router();

// Apply auth middleware to all routes
contentRouter.use(protect);

// Routes with proper RESTful structure
contentRouter.get("/", getAllContent);                // GET all content
contentRouter.post("/", createNewContent);            // CREATE new content
contentRouter.put("/:contentId", updateContent);      // UPDATE content by ID
contentRouter.delete("/:contentId", deleteContent);   // DELETE content by ID

export { contentRouter }