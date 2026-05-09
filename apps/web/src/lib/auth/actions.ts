"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_BASE_URL } from "@/lib/api/config";

export type ActionState = {
  error?: string;
} | null;

export async function loginAction(prevState: ActionState, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  try {
    const target = `${API_BASE_URL}/api/v1/auth/login`;
    console.log(`[loginAction] POST ${target}`);
    const res = await fetch(target, {
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
    console.error(`[loginAction] fetch to ${API_BASE_URL} failed:`, err);
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
    const target = `${API_BASE_URL}/api/v1/auth/register`;
    console.log(`[registerAction] POST ${target}`);
    const res = await fetch(target, {
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
    console.error(`[registerAction] fetch to ${API_BASE_URL} failed:`, err);
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
