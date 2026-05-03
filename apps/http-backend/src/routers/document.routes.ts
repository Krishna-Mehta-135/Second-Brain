import express, { Router } from "express";
import { protect } from "../middlewares/auth.middleware.js";
import {
  getDocumentBacklinks,
  updateDocumentLinks,
} from "../controllers/documentController.js";

const documentRouter: Router = express.Router();

documentRouter.use(protect);

documentRouter.get("/:docId/backlinks", getDocumentBacklinks);
documentRouter.put("/:docId/links", updateDocumentLinks);

export { documentRouter };
