import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { prisma } from "@repo/db";
import { z } from "zod";

// validation schema for content creation
const createContentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  link: z.string().min(1, "Link is required"),
  type: z.enum(["link", "video", "document", "tweet", "tag"]),
  tags: z.array(z.string()).optional().default([]),
  workspaceId: z.string().uuid().optional().nullable(),
  folderPath: z.string().max(512).optional().default(""),
  isPublic: z.boolean().optional(),
});

async function workspaceIdFor(
  userId: string,
  requested: string | null | undefined,
) {
  if (requested) {
    // Validate UUID format to prevent Prisma from throwing on malformed input
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        requested,
      );
    if (!isUuid) return null;

    const m = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: requested, userId },
      },
    });
    return m ? requested : null;
  }
  const m = await prisma.workspaceMember.findFirst({
    where: { userId },
    orderBy: { joinedAt: "asc" },
  });
  return m?.workspaceId ?? null;
}

const getAllContent = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId)
    return res.status(401).json(new ApiResponse(401, null, "Unauthorized"));

  const qWid =
    typeof req.query.workspaceId === "string"
      ? req.query.workspaceId
      : undefined;

  let content;
  if (qWid) {
    // Validate UUID format
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        qWid,
      );
    if (!isUuid) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Invalid workspaceId format"));
    }

    const m = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: qWid, userId } },
    });
    if (!m) {
      return res.status(403).json(new ApiResponse(403, null, "Forbidden"));
    }
    content = await prisma.content.findMany({
      where: {
        workspaceId: qWid,
      },
      include: { tags: { select: { id: true, name: true } } },
      orderBy: { updatedAt: "desc" },
    });
  } else {
    content = await prisma.content.findMany({
      where: { userId },
      include: { tags: { select: { id: true, name: true } } },
      orderBy: { updatedAt: "desc" },
    });
  }

  const mappedContent = content.map((c: any) => ({
    ...c,
    _id: c.id,
    tags: (c.tags || []).map((t: any) => ({ ...t, _id: t.id })),
  }));

  return res
    .status(200)
    .json(new ApiResponse(200, mappedContent, "Content fetched successfully"));
});

const createNewContent = asyncHandler(async (req: Request, res: Response) => {
  // Validate req.body
  const validationResult = createContentSchema.partial().safeParse(req.body);
  if (!validationResult.success) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Invalid content data"));
  }

  const { title, link, type, tags, workspaceId, folderPath } =
    validationResult.data;
  const userId = req.user?.id;
  if (!userId)
    return res.status(401).json(new ApiResponse(401, null, "Unauthorized"));

  const wid = await workspaceIdFor(userId, workspaceId ?? null);
  if (!wid) {
    return res
      .status(400)
      .json(
        new ApiResponse(
          400,
          null,
          "Workspace required — please join or create a workspace first",
        ),
      );
  }

  // Ensure tags exist and map to connect query
  const tagConnects = [];
  if (tags && tags.length > 0) {
    for (const tagName of tags) {
      const tag = await prisma.tag.upsert({
        where: { name: tagName },
        create: { name: tagName },
        update: {},
      });
      tagConnects.push({ id: tag.id });
    }
  }

  // Create new content
  const newContent = await prisma.content.create({
    data: {
      title: title || "Untitled",
      link: link || "https://internal.doc",
      type: type || "document",
      userId,
      workspaceId: wid,
      folderPath: folderPath ?? "",
      tags: { connect: tagConnects },
    },
    include: { tags: { select: { id: true, name: true } } },
  });

  const mappedContent = {
    ...newContent,
    _id: newContent.id,
    tags: newContent.tags.map((t: any) => ({ ...t, _id: t.id })),
  };

  return res
    .status(201)
    .json(new ApiResponse(201, mappedContent, "Content created successfully"));
});

const deleteContent = asyncHandler(async (req: Request, res: Response) => {
  const contentId = String(req.params.contentId);
  const userId = req.user?.id;

  // Find content and verify ownership
  const content = await prisma.content.findUnique({ where: { id: contentId } });

  if (!content) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Content not found"));
  }

  // Check if user owns this content
  if (content.userId !== userId) {
    return res
      .status(403)
      .json(
        new ApiResponse(
          403,
          null,
          "You don't have permission to delete this content",
        ),
      );
  }

  // Delete the content
  await prisma.content.delete({ where: { id: contentId } });

  // Also delete the CRDT document if it exists and is of type 'document'
  if (content.type === "document") {
    try {
      await prisma.document.delete({ where: { id: contentId } });
    } catch (e) {
      // Document might not exist if it was never edited, ignore
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Content deleted successfully"));
});

const updateContent = asyncHandler(async (req: Request, res: Response) => {
  const contentId = req.params.contentId as string;
  const userId = req.user?.id;

  // For PATCH, we only validate the fields that are present
  const isPatch = req.method === "PATCH";
  const schema = isPatch ? createContentSchema.partial() : createContentSchema;

  const validationResult = schema.safeParse(req.body);
  if (!validationResult.success) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Invalid content data"));
  }

  const { title, link, type, tags, folderPath } = validationResult.data;

  const content = await prisma.content.findUnique({ where: { id: contentId } });
  if (!content) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Content not found"));
  }

  if (content.userId !== userId) {
    return res
      .status(403)
      .json(new ApiResponse(403, null, "You don't own this content"));
  }

  // Process tags only if provided
  let tagConnects = undefined;
  if (tags !== undefined) {
    tagConnects = [];
    if (tags.length > 0) {
      for (const tagName of tags) {
        let tag = await prisma.tag.findUnique({ where: { name: tagName } });
        if (!tag) {
          tag = await prisma.tag.create({ data: { name: tagName } });
        }
        tagConnects.push({ id: tag.id });
      }
    }
  }

  // Update content
  const updatedContent = await prisma.content.update({
    where: { id: contentId },
    data: {
      title: title ?? undefined,
      link: link ?? undefined,
      type: type ?? undefined,
      folderPath: folderPath ?? undefined,
      isPublic: validationResult.data.isPublic ?? undefined,
      tags: tagConnects ? { set: tagConnects } : undefined,
    },
    include: { tags: { select: { id: true, name: true } } },
  });

  const mappedContent = {
    ...updatedContent,
    _id: updatedContent.id,
    tags: updatedContent.tags.map((t: any) => ({ ...t, _id: t.id })),
  };

  return res
    .status(200)
    .json(new ApiResponse(200, mappedContent, "Content updated successfully"));
});

const getContentById = asyncHandler(async (req: Request, res: Response) => {
  const contentId = String(req.params.contentId);
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json(new ApiResponse(401, null, "Unauthorized"));
  }

  const content = await prisma.content.findUnique({
    where: { id: contentId },
    include: {
      tags: { select: { id: true, name: true } },
      workspace: { include: { members: { select: { userId: true } } } },
    },
  });

  if (!content) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Content not found"));
  }

  if (content.userId !== userId) {
    if (content.isPublic) {
      // Public document, allow access
    } else if (content.workspaceId) {
      const isMember = content.workspace?.members.some(
        (m: { userId: string }) => m.userId === userId,
      );
      if (!isMember) {
        return res.status(403).json(new ApiResponse(403, null, "Forbidden"));
      }
    } else {
      return res.status(403).json(new ApiResponse(403, null, "Forbidden"));
    }
  }

  const mappedContent = {
    ...content,
    workspace: undefined,
    _id: content.id,
    tags: content.tags.map((t: any) => ({ ...t, _id: t.id })),
  };

  return res
    .status(200)
    .json(new ApiResponse(200, mappedContent, "Content fetched successfully"));
});

const getContentMetadata = asyncHandler(async (req: Request, res: Response) => {
  const contentId = String(req.params.contentId);
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json(new ApiResponse(401, null, "Unauthorized"));
  }

  const content = await prisma.content.findUnique({
    where: { id: contentId },
    select: {
      id: true,
      title: true,
      isPublic: true,
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          isPublic: true,
          ownerId: true,
        },
      },
    },
  });

  if (!content) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Document not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, content, "Metadata fetched successfully"));
});

export {
  getAllContent,
  createNewContent,
  deleteContent,
  updateContent,
  getContentById,
  getContentMetadata,
};
