import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { prisma } from "@repo/db";
import { z } from "zod";

const updateLinksSchema = z.object({
  links: z.array(z.string()), // array of toDocId
});

export const updateDocumentLinks = asyncHandler(
  async (req: Request, res: Response) => {
    const docId = String(req.params.docId);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json(new ApiResponse(401, null, "Unauthorized"));
    }

    const validationResult = updateLinksSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Invalid links data"));
    }

    const { links } = validationResult.data;

    // Verify document exists
    const content = await prisma.content.findUnique({ where: { id: docId } });
    if (!content) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Document not found"));
    }

    // Ensure the document exists in the Document table (for referential integrity)
    const docExists = await prisma.document.findUnique({
      where: { id: docId },
    });
    if (!docExists) {
      // If Document entry doesn't exist yet, we can't link from it.
      // The WS server usually creates it. If not, create an empty one.
      await prisma.document.create({
        data: { id: docId, state: new Uint8Array() },
      });
    }

    // Delete existing outgoing links
    await prisma.documentLink.deleteMany({
      where: { fromDocId: docId },
    });

    // Ensure all target documents exist in the Document table before linking
    const existingDocs = await prisma.document.findMany({
      where: { id: { in: links } },
      select: { id: true },
    });
    const existingDocIds = new Set(existingDocs.map((d) => d.id));

    // For any missing document entries, create them (WS server would eventually, but we need them for foreign key)
    const missingDocIds = links.filter((id) => !existingDocIds.has(id));
    if (missingDocIds.length > 0) {
      await prisma.document.createMany({
        data: missingDocIds.map((id) => ({ id, state: new Uint8Array() })),
        skipDuplicates: true,
      });
    }

    // Insert new links
    if (links.length > 0) {
      await prisma.documentLink.createMany({
        data: links.map((toDocId) => ({
          fromDocId: docId,
          toDocId,
        })),
        skipDuplicates: true, // Just in case of duplicates in array
      });
    }

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Links updated successfully"));
  },
);

export const getDocumentBacklinks = asyncHandler(
  async (req: Request, res: Response) => {
    const docId = String(req.params.docId);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json(new ApiResponse(401, null, "Unauthorized"));
    }

    // Verify document exists
    const content = await prisma.content.findUnique({ where: { id: docId } });
    if (!content) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Document not found"));
    }

    // Get backlinks (documents that link TO this doc)
    const backlinks = await prisma.documentLink.findMany({
      where: { toDocId: docId },
      select: {
        fromDocId: true,
      },
    });

    const fromDocIds = backlinks.map((link) => link.fromDocId);

    const whereClause: {
      id: { in: string[] };
      userId?: string | { in: string[] };
    } = { id: { in: fromDocIds } };

    if (content.workspaceId) {
      const members = await prisma.workspaceMember.findMany({
        where: { workspaceId: content.workspaceId },
        select: { userId: true },
      });
      const memberIds = [...new Set(members.map((m) => m.userId))];
      if (memberIds.length > 0) {
        whereClause.userId = { in: memberIds };
      }
    } else {
      whereClause.userId = userId;
    }

    // Titles of notes that link TO this doc (workspace-scoped when applicable)
    const referencingContents = await prisma.content.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
      },
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          referencingContents,
          "Backlinks fetched successfully",
        ),
      );
  },
);
