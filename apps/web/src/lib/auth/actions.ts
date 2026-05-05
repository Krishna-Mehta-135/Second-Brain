"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Note: API_URL should be defined in .env as a server-side only variable
const API_URL = process.env.API_URL || "http://127.0.0.1:8000";

export type ActionState = {
  error?: string;
} | null;

export async function loginAction(prevState: ActionState, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  try {
    const res = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: email, password }),
    });

    const json = await res.json();

    if (!res.ok) {
      return { error: json.message ?? "Invalid credentials" };
    }

    const token = json.data.token;
    const cookieStore = await cookies();

    cookieStore.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });
  } catch (err) {
    console.error("Login Error:", err);
    return { error: "Connection failed" };
  }

  redirect("/documents");
}

export async function registerAction(
  prevState: ActionState,
  formData: FormData,
) {
  const username = formData.get("username") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (password !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  try {
    const res = await fetch(`${API_URL}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });

    if (!res.ok) {
      const json = await res.json();
      console.error("[registerAction] Registration failed:", {
        status: res.status,
        message: json.message,
        errors: json.errors,
      });
      if (json.errors) {
        // Extract first error from zod results
        const errorMsg =
          json.errors.password?._errors?.[0] ||
          json.errors.username?._errors?.[0] ||
          json.errors.email?._errors?.[0] ||
          json.message;
        return { error: errorMsg };
      }
      return { error: json.message ?? "Registration failed" };
    }

    const json = await res.json();

    const token = json.data.token;
    const cookieStore = await cookies();

    cookieStore.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
  } catch (err) {
    console.error("Register Error:", err);
    return { error: "Connection failed" };
  }

  redirect("/documents");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
  redirect("/login");
}

export async function setSessionToken(token: string) {
  const cookieStore = await cookies();

  cookieStore.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });

  return { success: true };
}
