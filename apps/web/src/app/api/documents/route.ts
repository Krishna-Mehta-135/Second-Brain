import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL || "http://127.0.0.1:8000";

interface BackendTag {
  name: string;
}

interface BackendContent {
  id: string;
  title: string;
  userId: string;
  type: string;
  createdAt?: string;
  updatedAt?: string;
  folderPath?: string;
  workspaceId?: string | null;
  tags?: BackendTag[];
}

function safeTitle(t: unknown): string {
  if (typeof t !== "string") return "Untitled";
  const s = t.trim();
  if (!s || s.toLowerCase() === "undefined") return "Untitled";
  return s;
}

function mapDocument(d: BackendContent) {
  return {
    id: d.id,
    title: safeTitle(d.title),
    ownerId: d.userId,
    folderPath: d.folderPath ?? "",
    workspaceId: d.workspaceId ?? null,
    tags: Array.isArray(d.tags) ? d.tags.map((tg) => tg.name) : [],
    createdAt: new Date(d.createdAt ?? Date.now()).getTime(),
    updatedAt: new Date(d.updatedAt ?? Date.now()).getTime(),
  };
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get("session")?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = req.nextUrl.searchParams.get("workspaceId");

  try {
    const url = new URL(`${API_URL}/api/v1/content`);
    if (workspaceId) {
      url.searchParams.set("workspaceId", workspaceId);
    }

    const res = await fetch(url.toString(), {
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
    const documents = (json.data ?? []).filter(
      (c: BackendContent) => c.type === "document",
    );

    const mapped = documents
      .map(mapDocument)
      .sort(
        (
          a: ReturnType<typeof mapDocument>,
          b: ReturnType<typeof mapDocument>,
        ) => b.updatedAt - a.updatedAt,
      );

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

    const res = await fetch(`${API_URL}/api/v1/content`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: body.title || "Untitled",
        link: body.link || "https://internal.doc",
        type: "document",
        tags: Array.isArray(body.tags) ? body.tags : [],
        workspaceId: body.workspaceId ?? null,
        folderPath: typeof body.folderPath === "string" ? body.folderPath : "",
      }),
    });

    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      console.error("Backend Error:", errorJson);
      return NextResponse.json(
        { error: "Failed to create", details: errorJson },
        { status: res.status },
      );
    }

    const json = await res.json();
    const d = json.data;

    return NextResponse.json(mapDocument(d as BackendContent));
  } catch (err) {
    console.error("API Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
