import jwt from "jsonwebtoken";
import {User} from "../models/user.models";
import {asyncHandler} from "../utils/asyncHandler";
import mongoose, {ObjectId} from "mongoose";
import {ApiResponse} from "../utils/ApiResponse";
import {loginUserSchema, registerUserSchema} from "../validation/user.validation";
import {Types} from "mongoose";

const generateToken = (id: Types.ObjectId) => {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not defined in the environment variables");
    }
    return jwt.sign({id}, process.env.JWT_SECRET, {
        expiresIn: "7d",
    });
};

const registerUser = asyncHandler(async (req, res) => {
    //User validation
    const validationResult = registerUserSchema.safeParse(req.body);
    if (!validationResult.success) {
        return res.status(411).json({errors: validationResult.error.issues});
    }

    const {username, email, password} = validationResult.data;

    //Check if user exists
    const existingUser = await User.findOne({email});
    if (existingUser) {
        return res.status(403).json(new ApiResponse(403, null, "User already exists"));
    }

    const user = await User.create({
        username,
        email,
        password,
    });

    const token = generateToken(user._id);

    return res.status(201).json(
        new ApiResponse(
            201,
            {
                user: {
                    _id: user._id,
                    username: user.username,
                    email: user.email,
                },
                token,
            },
            "User registered successfully"
        )
    );
});

const loginUser = asyncHandler(async (req, res) => {
    //Validate the result first
    const validationResult = loginUserSchema.safeParse(req.body);
    if (!validationResult.success) {
        return res.status(400).json(new ApiResponse(400, null, "Enter correct credentials"));
    }

    //take the validated result
    const {credential, password} = validationResult.data;

    const user = await User.findOne({
        $or: [
            {email: credential},
            {username: credential}
        ],
    }).exec();

    if (!user) {
        return res.status(403).json(
            new ApiResponse(403 , null , "Invalid Credentials")
        )
    }

    // Verify password using the comparePassword method from your User model
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
        return res.status(401).json(
            new ApiResponse(401, null, "Invalid credentials")
        );
    }

    const token = generateToken(user._id);
    
    return res.status(200).json(
        new ApiResponse(
            200,
            {
                user: {
                    _id: user._id,
                    username: user.username,
                    email: user.email,
                },
                token,
            },
            "User logged in successfully"
        )
    );
});


export { registerUser , loginUser}