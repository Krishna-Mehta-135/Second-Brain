import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.API_URL ||
  "http://127.0.0.1:8000";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = await fetch(`${API_URL}/api/v1/workspaces/bootstrap`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const body = await res.json().catch(() => ({}));
  return NextResponse.json(body, { status: res.status });
}
