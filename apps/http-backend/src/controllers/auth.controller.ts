import jwt from "jsonwebtoken";
import { prisma } from "@repo/db";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { loginUserSchema, registerUserSchema } from "../validation/user.validation";
import bcrypt from "bcryptjs";

const generateToken = (id: string) => {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not defined in the environment variables");
    }
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
    });
};

const registerUser = asyncHandler(async (req, res) => {
    // User validation
    const validationResult = registerUserSchema.safeParse(req.body);
    if (!validationResult.success) {
        const formatted = validationResult.error.format();
        return res.status(400).json({
            message: "Validation failed",
            errors: formatted,
        });
    }

    const { username, email, password } = validationResult.data;

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
        where: {
            OR: [
                { email },
                { username }
            ]
        }
    });

    if (existingUser) {
        return res.status(403).json(new ApiResponse(403, null, "User already exists"));
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            username,
            email,
            password: hashedPassword,
        },
    });

    const token = generateToken(user.id);

    return res.status(201).json(
        new ApiResponse(
            201,
            {
                user: {
                    _id: user.id,
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
    // Validate the result first
    const validationResult = loginUserSchema.safeParse(req.body);
    if (!validationResult.success) {
        return res.status(400).json(new ApiResponse(400, null, "Enter correct credentials"));
    }

    // take the validated result
    const { credential, password } = validationResult.data;

    const user = await prisma.user.findFirst({
        where: {
            OR: [{ email: credential }, { username: credential }],
        },
    });

    if (!user) {
        return res.status(403).json(new ApiResponse(403, null, "Invalid Credentials"));
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        return res.status(401).json(new ApiResponse(401, null, "Invalid credentials"));
    }

    const token = generateToken(user.id);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                user: {
                    _id: user.id,
                    username: user.username,
                    email: user.email,
                },
                token,
            },
            "User logged in successfully"
        )
    );
});

export { registerUser, loginUser };
