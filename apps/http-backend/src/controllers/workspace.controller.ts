import { prisma } from "@repo/db";
import { z } from "zod";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

async function assertOwner(workspaceId: string, userId: string) {
  const w = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  return w?.ownerId === userId;
}

/** Ensure every user has at least one workspace; migrate legacy Content rows. */
export const bootstrapWorkspace = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json(new ApiResponse(401, null, "Unauthorized"));
  }

  let memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: { workspace: true },
  });

  if (memberships.length === 0) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json(new ApiResponse(404, null, "User not found"));
    }
    const sanitized = user.username
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 32);
    const base =
      sanitized.length >= 3 ? sanitized : `user-${userId.slice(0, 8)}`;
    let slug = `${base}-personal`;
    for (let n = 0; n < 8; n++) {
      const taken = await prisma.workspace.findUnique({ where: { slug } });
      if (!taken) break;
      slug = `${base}-${Math.random().toString(36).slice(2, 7)}`;
    }

    await prisma.workspace.create({
      data: {
        name: `${user.username}'s workspace`,
        slug,
        ownerId: userId,
        isPublic: false,
        members: { create: { userId, role: "owner" } },
      },
    });

    memberships = await prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: true },
    });
  }

  const primaryWsId = memberships[0]?.workspaceId;
  if (primaryWsId) {
    await prisma.content.updateMany({
      where: { userId, workspaceId: null },
      data: { workspaceId: primaryWsId },
    });
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      memberships.map((m) => ({
        workspace: m.workspace,
        role: m.role,
      })),
      "Workspaces bootstrapped",
    ),
  );
});

export const listMyWorkspaces = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json(new ApiResponse(401, null, "Unauthorized"));
  }

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: { workspace: true },
    orderBy: { joinedAt: "asc" },
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      memberships.map((m) => ({
        workspace: m.workspace,
        role: m.role,
      })),
      "OK",
    ),
  );
});

const createWsSchema = z.object({
  name: z.string().min(1).max(120),
  isPublic: z.boolean().optional().default(false),
  slug: z
    .string()
    .min(3)
    .max(48)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
});

export const createWorkspace = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json(new ApiResponse(401, null, "Unauthorized"));
  }

  const parsed = createWsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(new ApiResponse(400, null, "Invalid body"));
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return res.status(404).json(new ApiResponse(404, null, "User not found"));
  }

  let slug =
    parsed.data.slug ??
    `${user.username
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 24)}-${Math.random().toString(36).slice(2, 7)}`;
  for (let n = 0; n < 8; n++) {
    const taken = await prisma.workspace.findUnique({ where: { slug } });
    if (!taken) break;
    slug = `${slug}-${Math.random().toString(36).slice(2, 5)}`;
  }

  const ws = await prisma.workspace.create({
    data: {
      name: parsed.data.name,
      slug,
      ownerId: userId,
      isPublic: parsed.data.isPublic,
      members: { create: { userId, role: "owner" } },
    },
  });

  return res
    .status(201)
    .json(new ApiResponse(201, { workspace: ws }, "Created"));
});

export const listPublicWorkspaces = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json(new ApiResponse(401, null, "Unauthorized"));
  }

  const list = await prisma.workspace.findMany({
    where: { isPublic: true },
    select: { id: true, name: true, slug: true, ownerId: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return res.status(200).json(new ApiResponse(200, list, "OK"));
});

const joinSchema = z.object({
  slug: z.string().min(1),
});

export const joinWorkspaceBySlug = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json(new ApiResponse(401, null, "Unauthorized"));
  }

  const parsed = joinSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(new ApiResponse(400, null, "Invalid body"));
  }

  const ws = await prisma.workspace.findFirst({
    where: {
      slug: {
        equals: parsed.data.slug,
        mode: "insensitive",
      },
    },
  });
  if (!ws) {
    return res.status(404).json(new ApiResponse(404, null, "Not found"));
  }

  const already = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: ws.id, userId } },
  });
  if (already) {
    return res
      .status(200)
      .json(new ApiResponse(200, { status: "member" }, "Already a member"));
  }

  if (ws.isPublic) {
    await prisma.workspaceMember.create({
      data: { workspaceId: ws.id, userId, role: "member" },
    });
    return res
      .status(200)
      .json(new ApiResponse(200, { status: "joined" }, "Joined workspace"));
  }

  await prisma.workspaceJoinRequest.upsert({
    where: {
      workspaceId_userId: { workspaceId: ws.id, userId },
    },
    create: { workspaceId: ws.id, userId, status: "pending" },
    update: { status: "pending" },
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { status: "pending_approval" },
        "Join request submitted",
      ),
    );
});

export const listJoinRequestsForWorkspace = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const workspaceId = String(req.params.workspaceId ?? "");
  if (!userId) {
    return res.status(401).json(new ApiResponse(401, null, "Unauthorized"));
  }

  const ok = await assertOwner(workspaceId, userId);
  if (!ok) {
    return res.status(403).json(new ApiResponse(403, null, "Forbidden"));
  }

  const requests = await prisma.workspaceJoinRequest.findMany({
    where: { workspaceId, status: "pending" },
    include: {
      requester: { select: { id: true, username: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return res.status(200).json(new ApiResponse(200, requests, "OK"));
});

export const acceptJoinRequest = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const requestId = String(req.params.requestId ?? "");
  if (!userId) {
    return res.status(401).json(new ApiResponse(401, null, "Unauthorized"));
  }

  const jr = await prisma.workspaceJoinRequest.findUnique({
    where: { id: requestId },
    include: { workspace: true },
  });
  if (!jr || jr.status !== "pending") {
    return res.status(404).json(new ApiResponse(404, null, "Not found"));
  }

  if (jr.workspace.ownerId !== userId) {
    return res.status(403).json(new ApiResponse(403, null, "Forbidden"));
  }

  await prisma.$transaction([
    prisma.workspaceMember.create({
      data: {
        workspaceId: jr.workspaceId,
        userId: jr.userId,
        role: "member",
      },
    }),
    prisma.workspaceJoinRequest.delete({ where: { id: jr.id } }),
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, { success: true }, "Accepted"));
});

export const rejectJoinRequest = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const requestId = String(req.params.requestId ?? "");
  if (!userId) {
    return res.status(401).json(new ApiResponse(401, null, "Unauthorized"));
  }

  const jr = await prisma.workspaceJoinRequest.findUnique({
    where: { id: requestId },
    include: { workspace: true },
  });
  if (!jr) {
    return res.status(404).json(new ApiResponse(404, null, "Not found"));
  }

  if (jr.workspace.ownerId !== userId) {
    return res.status(403).json(new ApiResponse(403, null, "Forbidden"));
  }

  await prisma.workspaceJoinRequest.delete({ where: { id: jr.id } });

  return res
    .status(200)
    .json(new ApiResponse(200, { success: true }, "Rejected"));
});

const patchWorkspaceSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    isPublic: z.boolean().optional(),
  })
  .refine((body) => body.name !== undefined || body.isPublic !== undefined, {
    message: "At least one of name or isPublic is required",
  });

/** Owner-only: rename workspace or change public/private visibility. */
export const updateWorkspace = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const workspaceId = String(req.params.workspaceId ?? "");
  if (!userId) {
    return res.status(401).json(new ApiResponse(401, null, "Unauthorized"));
  }

  const parsed = patchWorkspaceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(new ApiResponse(400, null, "Invalid body"));
  }

  const owner = await assertOwner(workspaceId, userId);
  if (!owner) {
    return res.status(403).json(new ApiResponse(403, null, "Forbidden"));
  }

  const data: { name?: string; isPublic?: boolean } = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.isPublic !== undefined) data.isPublic = parsed.data.isPublic;

  const ws = await prisma.workspace.update({
    where: { id: workspaceId },
    data,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { workspace: ws }, "Workspace updated"));
});
