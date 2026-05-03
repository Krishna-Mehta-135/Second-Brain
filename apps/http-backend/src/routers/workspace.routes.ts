import express, { Router } from "express";
import { protect } from "../middlewares/auth.middleware.js";
import {
  acceptJoinRequest,
  bootstrapWorkspace,
  createWorkspace,
  joinWorkspaceBySlug,
  listJoinRequestsForWorkspace,
  listMyWorkspaces,
  listPublicWorkspaces,
  rejectJoinRequest,
  updateWorkspace,
} from "../controllers/workspace.controller.js";

const workspaceRouter: Router = express.Router();

workspaceRouter.use(protect);

workspaceRouter.post("/bootstrap", bootstrapWorkspace);
workspaceRouter.get("/", listMyWorkspaces);
workspaceRouter.post("/", createWorkspace);
workspaceRouter.get("/public", listPublicWorkspaces);
workspaceRouter.post("/join", joinWorkspaceBySlug);
workspaceRouter.patch("/:workspaceId", updateWorkspace);
workspaceRouter.get(
  "/:workspaceId/join-requests",
  listJoinRequestsForWorkspace,
);
workspaceRouter.post(
  "/:workspaceId/join-requests/:requestId/accept",
  acceptJoinRequest,
);
workspaceRouter.post(
  "/:workspaceId/join-requests/:requestId/reject",
  rejectJoinRequest,
);

export { workspaceRouter };
