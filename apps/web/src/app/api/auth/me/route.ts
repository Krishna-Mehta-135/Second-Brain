import { cookies } from "next/headers";
import { NextResponse, NextRequest } from "next/server";

const API_URL = process.env.API_URL || "http://127.0.0.1:8000";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }

  try {
    const res = await fetch(`${API_URL}/api/v1/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[Proxy Me Error]:", error);
    return NextResponse.json({ error: "Backend unreachable" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const res = await fetch(`${API_URL}/api/v1/auth/me`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return NextResponse.json(errorData, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[Proxy Me PUT Error]:", error);
    return NextResponse.json({ error: "Backend unreachable" }, { status: 500 });
  }
}
