"use client";

import type { Document } from "@repo/types";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ROOT_LIST_KEY,
  appendMovedDocToListOrder,
  documentMatchesListKey,
  folderPathForListKey,
  persistListAfterRemovingDoc,
  reorderDocWithinList,
} from "./sidebarOrderStorage";

export type SidebarDragHit =
  | { type: "nest"; folderPath: string }
  | { type: "reorder"; listKey: string; insertIndex: number };

function insertIndexInListUl(
  listEl: HTMLElement,
  clientY: number,
  excludeDocId: string,
): number {
  const rows = [...listEl.querySelectorAll("[data-sb-doc-row]")].filter(
    (el) =>
      el.getAttribute("data-doc-id") &&
      el.getAttribute("data-doc-id") !== excludeDocId,
  ) as HTMLElement[];
  for (let i = 0; i < rows.length; i++) {
    const rowEl = rows[i];
    if (!rowEl) continue;
    const r = rowEl.getBoundingClientRect();
    const mid = r.top + r.height / 2;
    if (clientY < mid) return i;
  }
  return rows.length;
}

export function computeSidebarDragHit(
  clientX: number,
  clientY: number,
  excludeDocId: string,
): SidebarDragHit | null {
  const stack = document.elementsFromPoint(clientX, clientY);
  for (const el of stack) {
    const header = el.closest("[data-sb-folder-header]");
    if (header) {
      const fp = header.getAttribute("data-sb-folder-path") ?? "";
      return { type: "nest", folderPath: fp };
    }
    const list = el.closest("[data-sb-doc-list]");
    if (list instanceof HTMLElement) {
      const raw = list.getAttribute("data-sb-doc-list");
      const listKey = raw ?? ROOT_LIST_KEY;
      const insertIndex = insertIndexInListUl(list, clientY, excludeDocId);
      return { type: "reorder", listKey, insertIndex };
    }
  }
  return null;
}

type Session = {
  pointerId: number;
  docId: string;
  srcListKey: string;
  startX: number;
  startY: number;
};

const MOVE_PX = 5;

interface UseSidebarObsidianDragOpts {
  workspaceId: string | null | undefined;
  getDocuments: () => Document[];
  updateDocument: (
    docId: string,
    patch: Record<string, unknown>,
  ) => Promise<boolean>;
  patchDocumentInCache: (docId: string, partial: Partial<Document>) => void;
}

export function useSidebarObsidianDrag(opts: UseSidebarObsidianDragOpts) {
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const [session, setSession] = useState<Session | null>(null);
  const [hit, setHit] = useState<SidebarDragHit | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const movedRef = useRef(false);

  sessionRef.current = session;

  useEffect(() => {
    if (!session) return;

    movedRef.current = false;

    const blockClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const onMove = (e: PointerEvent) => {
      const s = sessionRef.current;
      if (!s || e.pointerId !== s.pointerId) return;
      const dx = e.clientX - s.startX;
      const dy = e.clientY - s.startY;
      if (!movedRef.current && Math.hypot(dx, dy) >= MOVE_PX) {
        movedRef.current = true;
        window.addEventListener("click", blockClick, true);
      }

      const next = computeSidebarDragHit(e.clientX, e.clientY, s.docId);
      setHit(next);
    };

    const onUp = async (e: PointerEvent) => {
      const s = sessionRef.current;
      if (!s || e.pointerId !== s.pointerId) return;

      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);

      queueMicrotask(() =>
        window.removeEventListener("click", blockClick, true),
      );

      const {
        workspaceId,
        getDocuments,
        updateDocument,
        patchDocumentInCache,
      } = optsRef.current;
      const hi = computeSidebarDragHit(e.clientX, e.clientY, s.docId);
      const didDrag = movedRef.current;
      movedRef.current = false;

      setSession(null);
      sessionRef.current = null;
      setHit(null);

      if (!didDrag || !workspaceId || !hi) return;

      const allDocs = getDocuments();
      const doc = allDocs.find((d) => d.id === s.docId);
      if (!doc) return;

      const srcKey = s.srcListKey;

      if (hi.type === "nest") {
        const nestPath = hi.folderPath.trim();
        if ((doc.folderPath ?? "").trim() === nestPath) return;

        patchDocumentInCache(s.docId, { folderPath: nestPath });
        const ok = await updateDocument(s.docId, { folderPath: nestPath });
        if (!ok) return;
        const destListKeyNorm = normalizeListKeyFromFolderPath(nestPath);
        if (srcKey !== destListKeyNorm)
          persistListAfterRemovingDoc(workspaceId, srcKey, allDocs, s.docId);
        appendMovedDocToListOrder(
          workspaceId,
          destListKeyNorm,
          bumpFolder(allDocs, s.docId, nestPath),
          s.docId,
        );
        return;
      }

      /* reorder */
      const destKeyRaw = hi.listKey;
      const destKey =
        destKeyRaw === "" ||
        destKeyRaw === "__root__" ||
        destKeyRaw === ROOT_LIST_KEY
          ? ROOT_LIST_KEY
          : destKeyRaw;
      const insertIdx = Math.max(0, hi.insertIndex);
      const destPath = folderPathForListKey(destKey);

      if (destKey !== srcKey) {
        patchDocumentInCache(s.docId, { folderPath: destPath });
        const ok = await updateDocument(s.docId, { folderPath: destPath });
        if (!ok) return;
        const nextAll = bumpFolder(allDocs, s.docId, destPath);
        persistListAfterRemovingDoc(workspaceId, srcKey, allDocs, s.docId);
        const docsAtDest = nextAll.filter((d) =>
          documentMatchesListKey(d, destKey),
        );
        reorderDocWithinList(
          workspaceId,
          destKey,
          docsAtDest,
          s.docId,
          insertIdx,
        );
        return;
      }

      const docsLeaf = allDocs.filter((d) =>
        documentMatchesListKey(d, destKey),
      );
      reorderDocWithinList(workspaceId, destKey, docsLeaf, s.docId, insertIdx);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [session]);

  const beginGripDrag = useCallback(
    (
      pointerId: number,
      docId: string,
      srcListKey: string,
      clientX: number,
      clientY: number,
    ) => {
      setHit(null);
      sessionRef.current = {
        pointerId,
        docId,
        srcListKey,
        startX: clientX,
        startY: clientY,
      };
      setSession({
        pointerId,
        docId,
        srcListKey,
        startX: clientX,
        startY: clientY,
      });
    },
    [],
  );

  return { session, hit, beginGripDrag } as const;
}

function bumpFolder(
  all: Document[],
  docId: string,
  folderPath: string,
): Document[] {
  return all.map((d) => (d.id === docId ? { ...d, folderPath } : d));
}

function normalizeListKeyFromFolderPath(folderPath: string): string {
  const t = folderPath.trim();
  return t ? t : ROOT_LIST_KEY;
}
