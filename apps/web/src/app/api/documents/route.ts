import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL || "http://localhost:9898";

interface BackendContent {
  id: string;
  title: string;
  userId: string;
  type: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get("session")?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await fetch(`${API_URL}/api/v1/content`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch" },
        { status: res.status },
      );
    }

    const json = await res.json();
    // backend returns { data: [...] }
    // Filter only documents
    const documents = (json.data || []).filter(
      (c: BackendContent) => c.type === "document",
    );

    // Map to the Document interface if necessary (Prisma models might differ slightly)
    const mapped = documents.map((d: BackendContent) => ({
      id: d.id,
      title: d.title,
      ownerId: d.userId,
      createdAt: new Date(d.createdAt || Date.now()).getTime(),
      updatedAt: new Date(d.updatedAt || Date.now()).getTime(),
    }));

    return NextResponse.json(mapped);
  } catch (err) {
    console.error("API Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("session")?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Backend expects title, link, type
    const res = await fetch(`${API_URL}/api/v1/content`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: body.title || "Untitled",
        link: body.link || "https://internal.doc", // Backend requires a link
        type: "document",
        tags: [],
      }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to create" },
        { status: res.status },
      );
    }

    const json = await res.json();
    const d = json.data;

    const mapped = {
      id: d.id,
      title: d.title,
      ownerId: d.userId,
      createdAt: new Date(d.createdAt || Date.now()).getTime(),
      updatedAt: new Date(d.updatedAt || Date.now()).getTime(),
    };

    return NextResponse.json(mapped);
  } catch (err) {
    console.error("API Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
