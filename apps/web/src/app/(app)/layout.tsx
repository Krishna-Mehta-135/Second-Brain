import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import React from "react";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Double-check session server-side even though middleware protects routes
  // Middleware uses cookie presence as a heuristic — this validates the actual JWT in API calls later
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;

  if (!sessionToken) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {children}
    </div>
  );
}
