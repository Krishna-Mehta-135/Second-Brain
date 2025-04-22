import {asyncHandler} from "../utils/asyncHandler";
import {Request, Response} from "express";
import { nanoid } from "nanoid"
import { Share } from "../models/share.models";
import { ApiResponse } from "../utils/ApiResponse";

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
        isPublic
    })

    const shareUrl = `${process.env.FRONTEND_URL}/shared/${shareLink}`;

    return res.status(201).json(
        new ApiResponse(201, { shareUrl, share }, "Brain shared successfully")
    );
});


const getSharedBrain = asyncHandler(async (req: Request, res: Response) => {});

export {shareBrain, getSharedBrain};
