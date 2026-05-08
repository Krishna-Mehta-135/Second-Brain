import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.API_URL ||
  "http://127.0.0.1:8000";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = await fetch(`${API_URL}/api/v1/workspaces`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json().catch(() => ({}));
  return NextResponse.json(body, { status: res.status });
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => ({}));
  const res = await fetch(`${API_URL}/api/v1/workspaces`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(json),
  });
  const body = await res.json().catch(() => ({}));
  return NextResponse.json(body, { status: res.status });
}
