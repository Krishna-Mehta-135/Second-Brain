import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { API_BASE_URL } from "@/lib/api/config";

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
    `${API_BASE_URL}/api/v1/workspaces/${workspaceId}/join-requests/${requestId}/reject`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  const body = await res.json().catch(() => ({}));
  return NextResponse.json(body, { status: res.status });
}
