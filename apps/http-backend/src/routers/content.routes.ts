import express, { Router } from "express";
import {
  createNewContent,
  deleteContent,
  getAllContent,
  updateContent,
} from "../controllers/contentController.js";
import { protect } from "../middlewares/auth.middleware.js";

const contentRouter: Router = express.Router();

// Apply auth middleware to all routes
contentRouter.use(protect);

// Routes with proper RESTful structure
contentRouter.get("/", getAllContent); // GET all content
contentRouter.post("/", createNewContent); // CREATE new content
contentRouter.put("/:contentId", updateContent); // UPDATE content by ID
contentRouter.patch("/:contentId", updateContent); // PATCH content by ID
contentRouter.delete("/:contentId", deleteContent); // DELETE content by ID

export { contentRouter };
