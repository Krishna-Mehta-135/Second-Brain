import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_URL = process.env.API_URL || "http://127.0.0.1:9898";

export async function POST(
  _req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ workspaceId: string; requestId: string }>;
  },
) {
  const { workspaceId, requestId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = await fetch(
    `${API_URL}/api/v1/workspaces/${workspaceId}/join-requests/${requestId}/reject`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  const body = await res.json().catch(() => ({}));
  return NextResponse.json(body, { status: res.status });
}
