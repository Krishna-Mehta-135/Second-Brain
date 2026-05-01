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
    tags: z.array(z.string()).optional().default([])
});

const getAllContent = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json(new ApiResponse(401, null, "Unauthorized"));

    const content = await prisma.content.findMany({
        where: { userId },
        include: { tags: { select: { id: true, name: true } } },
        orderBy: { title: 'asc' } // No createdAt in schema currently, fallback to title or omit sort. Wait, Prisma schema doesn't have createdAt for Content. Let's map id to _id.
    });

    const mappedContent = content.map((c: any) => ({
        ...c,
        _id: c.id,
        tags: c.tags.map((t: any) => ({ ...t, _id: t.id }))
    }));

    return res.status(200).json(new ApiResponse(200, mappedContent, "Content fetched successfully"));
});

const createNewContent = asyncHandler(async (req: Request, res: Response) => {
    // Validate req.body
    const validationResult = createContentSchema.safeParse(req.body);
    if (!validationResult.success) {
        return res.status(400).json(
            new ApiResponse(400, null, "Invalid content data")
        );
    }
    
    const { title, link, type, tags } = validationResult.data;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json(new ApiResponse(401, null, "Unauthorized"));

    // Ensure tags exist and map to connect query
    const tagConnects = [];
    if (tags && tags.length > 0) {
        for (const tagName of tags) {
            let tag = await prisma.tag.findUnique({ where: { name: tagName } });
            if (!tag) {
                tag = await prisma.tag.create({ data: { name: tagName } });
            }
            tagConnects.push({ id: tag.id });
        }
    }

    // Create new content
    const newContent = await prisma.content.create({
        data: {
            title,
            link,
            type,
            userId,
            tags: { connect: tagConnects }
        },
        include: { tags: { select: { id: true, name: true } } }
    });

    const mappedContent = {
        ...newContent,
        _id: newContent.id,
        tags: newContent.tags.map((t: any) => ({ ...t, _id: t.id }))
    };
    
    return res.status(201).json(
        new ApiResponse(201, mappedContent, "Content created successfully")
    );
});

const deleteContent = asyncHandler(async (req: Request, res: Response) => {
    const contentId = String(req.params.contentId);
    const userId = req.user?.id;

    // Find content and verify ownership
    const content = await prisma.content.findUnique({ where: { id: contentId } });
    
    if (!content) {
        return res.status(404).json(
            new ApiResponse(404, null, "Content not found")
        );
    }

    // Check if user owns this content
    if (content.userId !== userId) {
        return res.status(403).json(
            new ApiResponse(403, null, "You don't have permission to delete this content")
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

    return res.status(200).json(        new ApiResponse(200, null, "Content deleted successfully")
    );
});

const updateContent = asyncHandler(async (req: Request, res: Response) => {
    const contentId = req.params.contentId as string;
    const userId = req.user?.id;

    const validationResult = createContentSchema.safeParse(req.body);
    if (!validationResult.success) {
        return res.status(400).json(new ApiResponse(400, null, "Invalid content data"));
    }

    const { title, link, type, tags } = validationResult.data;

    const content = await prisma.content.findUnique({ where: { id: contentId } });
    if (!content) {
        return res.status(404).json(new ApiResponse(404, null, "Content not found"));
    }

    if (content.userId !== userId) {
        return res.status(403).json(new ApiResponse(403, null, "You don't own this content"));
    }

    // Process tags
    const tagConnects = [];
    if (tags?.length) {
        for (const tagName of tags) {
            let tag = await prisma.tag.findUnique({ where: { name: tagName } });
            if (!tag) {
                tag = await prisma.tag.create({ data: { name: tagName } });
            }
            tagConnects.push({ id: tag.id });
        }
    }

    // Update content
    const updatedContent = await prisma.content.update({
        where: { id: contentId },
        data: {
            title,
            link,
            type,
            tags: { set: tagConnects }
        },
        include: { tags: { select: { id: true, name: true } } }
    });

    const mappedContent = {
        ...updatedContent,
        _id: updatedContent.id,
        tags: updatedContent.tags.map((t: any) => ({ ...t, _id: t.id }))
    };

    return res.status(200).json(new ApiResponse(200, mappedContent, "Content updated successfully"));
});

export { getAllContent, createNewContent, deleteContent, updateContent };
