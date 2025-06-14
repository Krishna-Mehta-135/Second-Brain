import {Request, Response, NextFunction} from "express";
import {asyncHandler} from "../utils/asyncHandler";
import jwt from "jsonwebtoken";
import {User, IUser} from "../models/user.models";
import {ApiResponse} from "../utils/ApiResponse";

// Add type declaration for the request with user
// so that we can access req.user.
// We created a request interface in the global scope of express library to add a user property with type Iuser which we defined in user.models.js
declare global {
    namespace Express {
        interface Request {
            user?: IUser;
        }
    }
}

// JWT payload interface
interface JwtPayload {
    id: string;
    iat?: number;
    exp?: number;
}

const protect = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        try {
            const token = req.headers.authorization.split(" ")[1];
            if (!process.env.JWT_SECRET) {
                throw new Error("JWT_SECRET is not defined in environment variables.");
            }
            const decoded = jwt.verify(token, process.env.JWT_SECRET) as unknown as JwtPayload;
            req.user = await User.findById(decoded.id).select("-password");
            
            if (!req.user) {
                return res.status(401).json(
                    new ApiResponse(401, null, "User not found")
                );
            }
            
            return next();
        } catch (error: any) {
            if (error.name === "TokenExpiredError") {
                return res.status(401).json(
                    new ApiResponse(401, null, "Token expired. Please login again.")
                );
            }
            return res.status(401).json(
                new ApiResponse(401, null, "Not authorized. Token failed.")
            );
        }
    }
    
    return res.status(401).json(
        new ApiResponse(401, null, "Not authorized. No token.")
    );
});

export {protect};