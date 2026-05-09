import jwt from "jsonwebtoken";
import { prisma } from "@repo/db";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  loginUserSchema,
  registerUserSchema,
} from "../validation/user.validation.js";
import bcrypt from "bcryptjs";
import axios from "axios";
import { nanoid } from "nanoid";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

const generateToken = (id: string) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in the environment variables");
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

const googleAuth = asyncHandler(async (req, res) => {
  console.log("[OAuth] Initiating Google Auth...");
  const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CALLBACK_URL) {
    console.error("[OAuth] Missing Google configuration in .env");
    return res
      .status(500)
      .json(
        new ApiResponse(500, null, "Google OAuth not configured on server"),
      );
  }

  const options = {
    redirect_uri: process.env.GOOGLE_CALLBACK_URL as string,
    client_id: process.env.GOOGLE_CLIENT_ID as string,
    access_type: "offline",
    response_type: "code",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ].join(" "),
  };

  const qs = new URLSearchParams(options);
  res.redirect(`${rootUrl}?${qs.toString()}`);
});

const googleCallback = asyncHandler(async (req, res) => {
  const code = req.query.code as string;

  if (!code) {
    const redirectUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    return res.redirect(`${redirectUrl}/login?error=Google auth failed`);
  }

  const tokenUrl = "https://oauth2.googleapis.com/token";
  const values = {
    code,
    client_id: process.env.GOOGLE_CLIENT_ID as string,
    client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
    redirect_uri: process.env.GOOGLE_CALLBACK_URL as string,
    grant_type: "authorization_code",
  };

  const { data } = await axios.post(tokenUrl, new URLSearchParams(values), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  const { data: googleUser } = await axios.get(
    `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${data.access_token}`,
    {
      headers: { Authorization: `Bearer ${data.access_token}` },
    },
  );

  let user = await prisma.user.findFirst({
    where: {
      OR: [{ googleId: googleUser.id }, { email: googleUser.email }],
    },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: googleUser.email,
        username: googleUser.name.replace(/\s+/g, "").toLowerCase() + nanoid(4),
        googleId: googleUser.id,
      },
    });
  } else if (!user.googleId) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { googleId: googleUser.id },
    });
  }

  const token = generateToken(user.id);
  console.log(
    `[OAuth] Successful login for ${user.email}. Redirecting to frontend...`,
  );
  const redirectUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  res.redirect(`${redirectUrl}/api/auth/callback?token=${token}`);
});

const githubAuth = asyncHandler(async (req, res) => {
  console.log("[OAuth] Initiating GitHub Auth...");
  const rootUrl = "https://github.com/login/oauth/authorize";

  if (!process.env.GH_CLIENT_ID || !process.env.GH_CALLBACK_URL) {
    console.error("[OAuth] Missing GitHub configuration in .env");
    return res
      .status(500)
      .json(
        new ApiResponse(500, null, "GitHub OAuth not configured on server"),
      );
  }

  const options = {
    client_id: process.env.GH_CLIENT_ID as string,
    redirect_uri: process.env.GH_CALLBACK_URL as string,
    scope: "user:email",
  };

  const qs = new URLSearchParams(options);
  res.redirect(`${rootUrl}?${qs.toString()}`);
});

const githubCallback = asyncHandler(async (req, res) => {
  console.log(
    "[OAuth] Received GitHub Callback. Code present:",
    !!req.query.code,
  );
  const code = req.query.code as string;

  if (!code) {
    console.error("[OAuth] GitHub callback missing code");
    const redirectUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    return res.redirect(
      `${redirectUrl}/login?error=GitHub auth failed: No code received`,
    );
  }

  console.log("[OAuth] Exchanging code for token...");
  const tokenUrl = "https://github.com/login/oauth/access_token";
  const values = {
    code,
    client_id: process.env.GH_CLIENT_ID as string,
    client_secret: process.env.GH_CLIENT_SECRET as string,
    redirect_uri: process.env.GH_CALLBACK_URL as string,
  };

  const { data: tokenData } = await axios.post(tokenUrl, values, {
    headers: { Accept: "application/json" },
  });

  if (!tokenData.access_token) {
    console.error("[OAuth] Failed to get access token from GitHub:", tokenData);
    const redirectUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    return res.redirect(
      `${redirectUrl}/login?error=GitHub token exchange failed`,
    );
  }

  console.log("[OAuth] Fetching GitHub user profile...");
  const { data: githubUser } = await axios.get("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  // Fetch emails if not public
  let email = githubUser.email;
  if (!email) {
    const { data: emails } = await axios.get(
      "https://api.github.com/user/emails",
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      },
    );
    email =
      emails.find((e: any) => e.primary && e.verified)?.email ||
      emails[0].email;
  }

  let user = await prisma.user.findFirst({
    where: {
      OR: [{ githubId: githubUser.id.toString() }, { email }],
    },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        username: (githubUser.login || "user").toLowerCase() + nanoid(4),
        githubId: githubUser.id.toString(),
      },
    });
  } else if (!user.githubId) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { githubId: githubUser.id.toString() },
    });
  }

  const token = generateToken(user.id);
  console.log(
    `[OAuth] Successful login for ${user.email}. Redirecting to frontend...`,
  );
  const redirectUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  res.redirect(`${redirectUrl}/api/auth/callback?token=${token}`);
});

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
      OR: [{ email }, { username }],
    },
  });

  if (existingUser) {
    return res
      .status(403)
      .json(new ApiResponse(403, null, "User already exists"));
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
      "User registered successfully",
    ),
  );
});

const loginUser = asyncHandler(async (req, res) => {
  // Validate the result first
  const validationResult = loginUserSchema.safeParse(req.body);
  if (!validationResult.success) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Enter correct credentials"));
  }

  // take the validated result
  const { credential, password } = validationResult.data;

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: credential }, { username: credential }],
    },
  });

  if (!user) {
    return res
      .status(403)
      .json(new ApiResponse(403, null, "Invalid Credentials"));
  }

  // Check if user has a password (might be an OAuth user)
  if (!user.password) {
    return res
      .status(401)
      .json(
        new ApiResponse(401, null, "Please log in using your OAuth provider"),
      );
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res
      .status(401)
      .json(new ApiResponse(401, null, "Invalid credentials"));
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
      "User logged in successfully",
    ),
  );
});

const getMe = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json(new ApiResponse(401, null, "Unauthorized"));
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return res.status(404).json(new ApiResponse(404, null, "User not found"));
  }

  return res.status(200).json({
    user: {
      id: user.id,
      email: user.email,
      name: user.username,
      createdAt: user.createdAt
        ? new Date(user.createdAt).getTime()
        : Date.now(),
    },
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  });
});

const updateMe = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json(new ApiResponse(401, null, "Unauthorized"));
  }

  const { name } = req.body;
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json(new ApiResponse(400, null, "Name is required"));
  }

  const newUsername = name.trim();

  // Check if username is already taken by someone else
  const existingUser = await prisma.user.findFirst({
    where: { username: newUsername, id: { not: userId } },
  });

  if (existingUser) {
    return res
      .status(409)
      .json(new ApiResponse(409, null, "Username is already taken"));
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { username: newUsername },
  });

  return res.status(200).json({
    user: {
      id: user.id,
      email: user.email,
      name: user.username,
      createdAt: user.createdAt
        ? new Date(user.createdAt).getTime()
        : Date.now(),
    },
  });
});

const getWsToken = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json(new ApiResponse(401, null, "Unauthorized"));
  }

  // Generate a short-lived token (15 mins) for WebSocket
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET!, {
    expiresIn: "15m",
  });

  return res.status(200).json({
    token,
    expiresAt: Date.now() + 15 * 60 * 1000,
  });
});

export {
  registerUser,
  loginUser,
  getMe,
  updateMe,
  getWsToken,
  googleAuth,
  googleCallback,
  githubAuth,
  githubCallback,
};
