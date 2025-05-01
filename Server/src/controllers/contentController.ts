import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { Content } from "../models/content.models";
import { Tag } from "../models/tags.models";
import mongoose from "mongoose";
import { z } from "zod";


//validation schema for content creation
const createContentSchema = z.object({
    title: z.string().min(1, "Title is required"),
    link: z.string().min(1, "Link is required"),
    type: z.enum(["link", "video", "document", "tweet", "tag"]),
    tags: z.array(z.string()).optional().default([])
});

const getAllContent = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id;

    const content = await Content.find({userId})
        .populate("tags","name")
        .sort({ createdAt : -1});

    return res.status(200).json(new ApiResponse(200, content , "Content fetched successfully"))
})

const createNewContent = asyncHandler(async (req: Request, res: Response) => {

    //Validate req.body
    const validationResult = createContentSchema.safeParse(req.body);
    if (!validationResult.success) {
        return res.status(400).json(
            new ApiResponse(400, null, "Invalid content data")
        );
    }
    
    const { title, link, type, tags } = validationResult.data;
    const userId = req.user?._id;

    //Create tags if they dont exist
    const tagIds: mongoose.Types.ObjectId[] = [];
    if(tags && tags.length > 0){
        for(const tagName of tags){
            let tag = await Tag.findOne({name : tagName})
            if (!tag) {
                tag = await Tag.create({ name: tagName });
            }
            tagIds.push(tag._id as mongoose.Types.ObjectId);
        }  
    }

    //Create new content
    const newContent = await Content.create({
        title,
        link,
        type,
        tags: tagIds,
        userId
    })


    // Return the newly created content with populated tags
    const populatedContent = await Content.findById(newContent._id)
        .populate("tags", "name");
    
    return res.status(201).json(
        new ApiResponse(201, populatedContent, "Content created successfully")
    );
})

const deleteContent =asyncHandler(async (req: Request, res: Response) => {
    const { contentId } = req.params
    const userId = req.user?._id

    if (!mongoose.Types.ObjectId.isValid(contentId)) {
        return res.status(400).json(
            new ApiResponse(400, null, "Invalid content ID")
        );
    }

    // Find content and verify ownership
    const content = await Content.findById(contentId);
    
    if (!content) {
        return res.status(404).json(
            new ApiResponse(404, null, "Content not found")
        );
    }

    // Check if user owns this content
    if (content.userId.toString() !== userId?.toString()) {
        return res.status(403).json(
            new ApiResponse(403, null, "You don't have permission to delete this content")
        );
    }
    
    // Delete the content
    await Content.findByIdAndDelete(contentId);
    
    return res.status(200).json(
        new ApiResponse(200, null, "Content deleted successfully")
    );
})


const updateContent = asyncHandler(async (req: Request, res: Response) => {
    const { contentId } = req.params;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(contentId)) {
        return res.status(400).json(new ApiResponse(400, null, "Invalid content ID"));
    }

    const validationResult = createContentSchema.safeParse(req.body);
    if (!validationResult.success) {
        return res.status(400).json(new ApiResponse(400, null, "Invalid content data"));
    }

    const { title, link, type, tags } = validationResult.data;

    const content = await Content.findById(contentId);
    if (!content) {
        return res.status(404).json(new ApiResponse(404, null, "Content not found"));
    }

    if (content.userId.toString() !== userId?.toString()) {
        return res.status(403).json(new ApiResponse(403, null, "You don't own this content"));
    }

    // Process tags
    const tagIds: mongoose.Types.ObjectId[] = [];
    if (tags?.length) {
        const existingTags = await Tag.find({ name: { $in: tags } });
        const existingNames = existingTags.map(tag => tag.name);
        tagIds.push(...existingTags.map(tag => tag._id as mongoose.Types.ObjectId));

        const newTags = tags.filter(t => !existingNames.includes(t));
        for (const tagName of newTags) {
            const newTag = await Tag.create({ name: tagName });
            tagIds.push(newTag._id as mongoose.Types.ObjectId);
        }
    }

    // Update content
    content.title = title;
    content.link = link;
    content.type = type;
    content.tags = tagIds;

    await content.save();

    const updatedContent = await Content.findById(content._id).populate("tags", "name");

    return res.status(200).json(new ApiResponse(200, updatedContent, "Content updated successfully"));
});


export { getAllContent, createNewContent, deleteContent , updateContent};