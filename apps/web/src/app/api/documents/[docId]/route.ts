import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL || "http://localhost:9898";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ docId: string }> },
) {
  const token = req.cookies.get("session")?.value;
  const { docId } = await params;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await fetch(`${API_URL}/api/v1/content/${docId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to delete" },
        { status: res.status },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("API Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
