import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api/config";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ docId: string }> },
) {
  const token = req.cookies.get("session")?.value;
  const { docId } = await params;
  const body = await req.json();

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/documents/${docId}/links`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to update links" },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("API Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
