"use client";

import dynamic from "next/dynamic";

export const ClientEditor = dynamic(
  () => import("@/components/editor/EditorPage").then((mod) => mod.EditorPage),
  { ssr: false },
);
