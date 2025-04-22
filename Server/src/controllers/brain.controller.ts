import {asyncHandler} from "../utils/asyncHandler";
import {Request, Response} from "express";
import {nanoid} from "nanoid";
import {Share} from "../models/share.models";
import {ApiResponse} from "../utils/ApiResponse";
import {Content} from "../models/content.models";

const shareBrain = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const {expiry, isPublic = false} = req.body;

    //Generate new and unique share links
    const shareLink = nanoid(10);

    //Create share record in the db
    const share = await Share.create({
        userId,
        shareLink,
        expiry: expiry || null,
        isPublic,
    });

    const shareUrl = `${process.env.FRONTEND_URL}/shared/${shareLink}`;

    return res.status(201).json(new ApiResponse(201, {shareUrl, share}, "Brain shared successfully"));
});

const getSharedBrain = asyncHandler(async (req: Request, res: Response) => {
    const {shareLink} = req.params;

    const share = await Share.findOne({shareLink});

    if (!share) {
        return res.status(404).json(new ApiResponse(404, null, "Shared brain not found"));
    }

    //check expiry
    if (share.expiry && new Date(share.expiry) < new Date()) {
        return res.status(410).json(new ApiResponse(410, null, "Shared brain has expired"));
    }

    //Get all content for the sahred brain
    const content = await Content.find({userId: share.userId}).populate("tags", "name").sort({createdAt: -1});

    return res
    .status(200)
    .json(new ApiResponse(200, {content, owner: share.userId}, "Shared brain retrieved successfully"));
});

export {shareBrain, getSharedBrain};
