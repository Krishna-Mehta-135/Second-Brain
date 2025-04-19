import jwt from "jsonwebtoken";
import {User} from "../models/user.models";
import {asyncHandler} from "../utils/asyncHandler";
import mongoose, { ObjectId } from "mongoose";
import { ApiResponse } from "../utils/ApiResponse";
import { registerUserSchema } from "../validation/user.validation";
import {Types} from "mongoose"

const generateToken = (id : Types.ObjectId) => {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not defined in the environment variables");
    }
    return jwt.sign({id}, process.env.JWT_SECRET, {
        expiresIn: "7d",
    });
};

const registerUser = asyncHandler( async (req , res) => {
    
    //User validation
    const validationResult = registerUserSchema.safeParse(req.body)
    if (!validationResult.success) {
        return res.status(400).json({errors: validationResult.error.issues});
    }

    const { username , email , password } = validationResult.data;

    //Check if user exists
    const existingUser = await User.findOne({email})
    if(existingUser) {
        return res.status(403).json(new ApiResponse(403, null, "User already exists"))
    }

    const user = await User.create({
        username,
        email,
        password
    })

    const token = generateToken(user._id)

    return res.status(201).json(
        new ApiResponse(201, {
            user: {
                _id: user._id,
                username: user.username,
                email: user.email
            },
            token
        }, "User registered successfully")
    );
})