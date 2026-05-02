"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Note: API_URL should be defined in .env as a server-side only variable
const API_URL = process.env.API_URL || "http://localhost:9898";

export type ActionState = {
  error?: string;
} | null;

export async function loginAction(prevState: ActionState, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const error = await res.json();
      return { error: error.message ?? "Invalid credentials" };
    }

    const { token } = await res.json();
    const cookieStore = await cookies();

    cookieStore.set("session", token, {
      httpOnly: true, // JS cannot read this — XSS protection
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });
  } catch {
    return { error: "Connection failed" };
  }

  redirect("/documents");
}

export async function registerAction(
  prevState: ActionState,
  formData: FormData,
) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (password !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      const error = await res.json();
      return { error: error.message ?? "Registration failed" };
    }

    const { token } = await res.json();
    const cookieStore = await cookies();

    cookieStore.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
  } catch {
    return { error: "Connection failed" };
  }

  redirect("/documents");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
  redirect("/login");
}
