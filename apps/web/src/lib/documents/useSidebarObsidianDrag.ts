"use client";

import type { Document } from "@repo/types";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ROOT_LIST_KEY,
  appendMovedDocToListOrder,
  folderPathForListKey,
  getSavedOrderRaw,
  persistListAfterRemovingDoc,
  reorderItemWithinList,
  replaceDocWithFolderInOrder,
} from "./sidebarOrderStorage";

// ── Public types ───────────────────────────────────────────────────────────

export type SidebarDragHit =
  | {
      type: "nest";
      folderPath: string;
      targetDocId?: string;
      targetFolderPath?: string;
    }
  | { type: "reorder"; listKey: string; insertIndex: number };

/** What the component renders from: ghost position + active session metadata. */
export type SidebarDragSession = {
  docId?: string;
  folderPath?: string;
  currentX: number;
  currentY: number;
};

// ── Internal drag tracking (pure refs, never triggers re-render) ───────────

type ActiveDrag = {
  pointerId: number;
  docId?: string;
  folderPath?: string;
  srcListKey: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  moved: boolean;
};

// ── Hit detection ──────────────────────────────────────────────────────────

function insertIndexInListUl(
  listEl: HTMLElement,
  clientY: number,
  excludeDocId?: string,
  excludeFolderPath?: string,
): number {
  const items = [
    ...listEl.querySelectorAll("[data-sb-doc-row], [data-sb-folder-header]"),
  ].filter((el) => {
    const id = el.getAttribute("data-doc-id");
    const path = el.getAttribute("data-sb-folder-path");
    if (id && id === excludeDocId) return false;
    if (path && path === excludeFolderPath) return false;
    return true;
  }) as HTMLElement[];

  for (let i = 0; i < items.length; i++) {
    const r = items[i]!.getBoundingClientRect();
    if (clientY < r.top + r.height / 2) return i;
  }
  return items.length;
}

export function computeSidebarDragHit(
  clientX: number,
  clientY: number,
  excludeDocId?: string,
  excludeFolderPath?: string,
): SidebarDragHit | null {
  const stack = document.elementsFromPoint(clientX, clientY);

  // 1. Folder header → nest directly into folder
  for (const el of stack) {
    const header = el.closest("[data-sb-folder-header]");
    if (header) {
      const fp = header.getAttribute("data-sb-folder-path") ?? "";
      // Cannot nest a folder into itself or its own subfolders
      if (
        excludeFolderPath &&
        (fp === excludeFolderPath || fp.startsWith(excludeFolderPath + "/"))
      )
        continue;

      const r = header.getBoundingClientRect();
      const relY = (clientY - r.top) / r.height;
      // If we are at the very top/bottom edge of a folder header, it might be a reorder hit in the parent list
      if (relY < 0.1 || relY > 0.9) continue;

      return { type: "nest", folderPath: fp, targetFolderPath: fp };
    }
  }

  // 2. Document row → nest-into-doc (middle 70%) or reorder (edges)
  for (const el of stack) {
    const row = el.closest("[data-sb-doc-row]");
    if (!(row instanceof HTMLElement)) continue;
    const targetId = row.getAttribute("data-doc-id");
    if (!targetId || targetId === excludeDocId) continue;

    const r = row.getBoundingClientRect();
    const relY = (clientY - r.top) / r.height;

    if (relY > 0.15 && relY < 0.85) {
      // Middle band → nest
      const title = row.getAttribute("data-doc-title") ?? "";
      const folder = row.getAttribute("data-doc-folder") ?? "";

      const trimmedFolder = folder.trim();
      const trimmedTitle = title.trim();
      const folderParts = trimmedFolder.split("/").filter(Boolean);
      const lastFolderSegment = folderParts[folderParts.length - 1];

      let nestPath: string;
      if (lastFolderSegment === trimmedTitle) {
        // Already "representative" of its folder, just join it.
        nestPath = trimmedFolder;
      } else {
        nestPath = (trimmedFolder ? `${trimmedFolder}/` : "") + trimmedTitle;
      }

      if (
        excludeFolderPath &&
        (nestPath === excludeFolderPath ||
          nestPath.startsWith(excludeFolderPath + "/"))
      )
        continue;

      return { type: "nest", folderPath: nestPath, targetDocId: targetId };
    }

    // Edge band → reorder in owning list
    const list = row.closest("[data-sb-doc-list]");
    if (list instanceof HTMLElement) {
      const listKey = list.getAttribute("data-sb-doc-list") ?? ROOT_LIST_KEY;
      return {
        type: "reorder",
        listKey,
        insertIndex: insertIndexInListUl(
          list,
          clientY,
          excludeDocId,
          excludeFolderPath,
        ),
      };
    }
  }

  // 3. List container fallback
  for (const el of stack) {
    const list = el.closest("[data-sb-doc-list]");
    if (list instanceof HTMLElement) {
      const listKey = list.getAttribute("data-sb-doc-list") ?? ROOT_LIST_KEY;
      return {
        type: "reorder",
        listKey,
        insertIndex: insertIndexInListUl(
          list,
          clientY,
          excludeDocId,
          excludeFolderPath,
        ),
      };
    }
  }

  return null;
}

// ── Hook ───────────────────────────────────────────────────────────────────

const MOVE_PX = 3;

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
  // Always-fresh opts reference — never stale inside event handlers.
  const optsRef = useRef(opts);
  optsRef.current = opts;

  // ── Render state (minimal — only what the UI needs) ──────────────────────
  // Ghost overlay position
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(
    null,
  );
  // Which doc or folder is being dragged (for fading the source row)
  const [activeDragDocId, setActiveDragDocId] = useState<string | null>(null);
  const [activeDragFolderPath, setActiveDragFolderPath] = useState<
    string | null
  >(null);
  // Hit under cursor (for insert rail + nest highlight)
  const [hit, setHit] = useState<SidebarDragHit | null>(null);
  // True once the pointer has moved ≥ MOVE_PX
  const [isDragging, setIsDragging] = useState(false);

  // ── Pure-ref drag state (never causes re-render, always readable in handlers)
  const dragRef = useRef<ActiveDrag | null>(null);
  const blockClickRef = useRef<((e: MouseEvent) => void) | null>(null);

  // ── Register listeners ONCE on mount, clean up on unmount ────────────────
  // Critical: NOT in a [session]-dependent effect. Updating ghost position
  // must NOT tear down and re-register listeners on every pointermove.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;

      d.currentX = e.clientX;
      d.currentY = e.clientY;

      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      const dist = Math.hypot(dx, dy);

      if (!d.moved && dist >= MOVE_PX) {
        d.moved = true;
        setIsDragging(true);

        // Set the active drag states only after the threshold is crossed
        if (d.docId) setActiveDragDocId(d.docId);
        if (d.folderPath) setActiveDragFolderPath(d.folderPath);

        // Suppress the click that fires after pointerup on the same element.
        const blockClick = (ev: MouseEvent) => {
          ev.preventDefault();
          ev.stopImmediatePropagation();
        };
        blockClickRef.current = blockClick;
        window.addEventListener("click", blockClick, {
          capture: true,
          once: true,
        });
      }

      if (d.moved) {
        // Update ghost position (state update, but isolated — doesn't affect listeners)
        setGhostPos({ x: e.clientX, y: e.clientY });
        setHit(
          computeSidebarDragHit(
            e.clientX,
            e.clientY,
            d.docId,
            d.folderPath || undefined,
          ),
        );
      }
    };

    const onUp = async (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;

      // Snapshot everything before resetting refs
      const snap = { ...d };
      dragRef.current = null;

      // Remove the click blocker if it wasn't already consumed by `once:true`
      if (blockClickRef.current) {
        window.removeEventListener("click", blockClickRef.current, {
          capture: true,
        });
        blockClickRef.current = null;
      }

      const hi = computeSidebarDragHit(
        e.clientX,
        e.clientY,
        snap.docId,
        snap.folderPath || undefined,
      );

      // Reset all render state synchronously
      setGhostPos(null);
      setActiveDragDocId(null);
      setActiveDragFolderPath(null);
      setHit(null);
      setIsDragging(false);

      if (!snap.moved || !hi) return;

      const {
        workspaceId,
        getDocuments,
        updateDocument,
        patchDocumentInCache,
      } = optsRef.current;

      if (!workspaceId) return;

      const allDocs = getDocuments();

      if (snap.docId) {
        const doc = allDocs.find((d) => d.id === snap.docId);
        if (!doc) return;

        const srcKey = snap.srcListKey;

        // ── Nest ──────────────────────────────────────────────────────────────
        if (hi.type === "nest") {
          let nestPath = hi.folderPath.trim();

          if (hi.targetDocId) {
            const targetDoc = allDocs.find((d) => d.id === hi.targetDocId);
            if (targetDoc && targetDoc.id !== snap.docId) {
              const targetTrimmedFolder = (targetDoc.folderPath ?? "").trim();
              const targetTrimmedTitle = (targetDoc.title ?? "").trim();

              const folderParts = targetTrimmedFolder
                .split("/")
                .filter(Boolean);
              const lastSegment =
                folderParts.length > 0
                  ? folderParts[folderParts.length - 1]
                  : "";

              if (lastSegment !== targetTrimmedTitle) {
                let counter = 0;
                let newFolderName = "New Folder";
                let proposedPath = targetTrimmedFolder
                  ? `${targetTrimmedFolder}/${newFolderName}`
                  : newFolderName;

                // make sure the proposed folder path doesn't already have docs
                while (
                  allDocs.some((d) =>
                    (d.folderPath ?? "").trim().startsWith(proposedPath),
                  )
                ) {
                  counter++;
                  newFolderName = `New Folder ${counter}`;
                  proposedPath = targetTrimmedFolder
                    ? `${targetTrimmedFolder}/${newFolderName}`
                    : newFolderName;
                }

                nestPath = proposedPath;

                // trigger inline rename in UI after a short delay to allow React to render the new folder
                setTimeout(() => {
                  window.dispatchEvent(
                    new CustomEvent("knowdex:edit-folder", {
                      detail: { path: nestPath },
                    }),
                  );
                }, 50);
              }
            }
          }

          if (
            snap.docId === hi.targetDocId ||
            (doc.folderPath ?? "").trim() === nestPath
          )
            return;

          // Move the dragged doc into the new folder.
          patchDocumentInCache(snap.docId, { folderPath: nestPath });
          const ok = await updateDocument(snap.docId, { folderPath: nestPath });
          if (!ok) return;

          const destListKey = nestPath || ROOT_LIST_KEY;
          if (srcKey !== destListKey) {
            persistListAfterRemovingDoc(
              workspaceId,
              srcKey,
              allDocs,
              snap.docId,
            );
          }

          // Also move the target doc (B) into the same folder so both become
          // siblings — prevents B orphaning at root next to its own named folder.
          if (hi.targetDocId) {
            const targetDoc = allDocs.find((d) => d.id === hi.targetDocId);
            if (
              targetDoc &&
              (targetDoc.folderPath ?? "").trim() !== nestPath &&
              hi.targetDocId !== snap.docId
            ) {
              const targetSrcKey =
                (targetDoc.folderPath ?? "").trim() || ROOT_LIST_KEY;
              patchDocumentInCache(hi.targetDocId, { folderPath: nestPath });
              void updateDocument(hi.targetDocId, { folderPath: nestPath });
              if (targetSrcKey !== destListKey) {
                const newFolderName = nestPath.split("/").pop() || "New Folder";
                replaceDocWithFolderInOrder(
                  workspaceId,
                  targetSrcKey,
                  hi.targetDocId,
                  newFolderName,
                );
              }
            }
          }

          appendMovedDocToListOrder(
            workspaceId,
            destListKey,
            bumpFolder(allDocs, snap.docId, nestPath),
            snap.docId,
          );
          return;
        }

        // ── Reorder ───────────────────────────────────────────────────────────
        const rawKey = hi.listKey;
        const destKey =
          rawKey === "" || rawKey === "__root__" || rawKey === ROOT_LIST_KEY
            ? ROOT_LIST_KEY
            : rawKey;
        const insertIdx = Math.max(0, hi.insertIndex);
        const destPath = folderPathForListKey(destKey);

        if (destKey !== srcKey) {
          patchDocumentInCache(snap.docId, { folderPath: destPath });
          const ok = await updateDocument(snap.docId, { folderPath: destPath });
          if (!ok) return;
          persistListAfterRemovingDoc(workspaceId, srcKey, allDocs, snap.docId);

          const currentIdentities = getSavedOrderRaw(workspaceId, destKey);
          reorderItemWithinList(
            workspaceId,
            destKey,
            currentIdentities,
            `doc:${snap.docId}`,
            insertIdx,
          );
          return;
        }

        const currentIdentities = getSavedOrderRaw(workspaceId, destKey);
        reorderItemWithinList(
          workspaceId,
          destKey,
          currentIdentities,
          `doc:${snap.docId}`,
          insertIdx,
        );
      } else if (snap.folderPath) {
        // Folder dragging logic
        const srcPath = snap.folderPath;

        if (hi.type === "nest") {
          const destPath = hi.folderPath.trim();
          if (destPath === srcPath || destPath.startsWith(srcPath + "/"))
            return;

          const parts = srcPath.split("/").filter(Boolean);
          const folderName = parts[parts.length - 1]!;
          const newPathBase = destPath
            ? `${destPath}/${folderName}`
            : folderName;

          const toUpdate = allDocs.filter((d) => {
            const fp = (d.folderPath ?? "").trim();
            return fp === srcPath || fp.startsWith(srcPath + "/");
          });

          for (const d of toUpdate) {
            const suffix = d.folderPath!.substring(srcPath.length);
            const targetFp = newPathBase + suffix;
            patchDocumentInCache(d.id, { folderPath: targetFp });
            void updateDocument(d.id, { folderPath: targetFp });
          }

          // Also move the target doc (B) into the same folder so both become
          // siblings — prevents B orphaning at root next to its own named folder.
          if (hi.targetDocId) {
            const targetDoc = allDocs.find((d) => d.id === hi.targetDocId);
            if (targetDoc && (targetDoc.folderPath ?? "").trim() !== destPath) {
              const targetSrcKey =
                (targetDoc.folderPath ?? "").trim() || ROOT_LIST_KEY;
              patchDocumentInCache(hi.targetDocId, { folderPath: destPath });
              void updateDocument(hi.targetDocId, { folderPath: destPath });
              const destListKey = destPath || ROOT_LIST_KEY;
              if (targetSrcKey !== destListKey) {
                persistListAfterRemovingDoc(
                  workspaceId,
                  targetSrcKey,
                  allDocs,
                  hi.targetDocId,
                );
              }
            }
          }
        } else if (hi.type === "reorder") {
          const destListKey = hi.listKey;
          const destPath = folderPathForListKey(destListKey);
          if (destPath === srcPath || destPath.startsWith(srcPath + "/"))
            return;

          const parts = srcPath.split("/").filter(Boolean);
          const folderName = parts[parts.length - 1]!;
          const newPathBase = destPath
            ? `${destPath}/${folderName}`
            : folderName;

          const toUpdate = allDocs.filter((d) => {
            const fp = (d.folderPath ?? "").trim();
            return fp === srcPath || fp.startsWith(srcPath + "/");
          });

          for (const d of toUpdate) {
            const suffix = d.folderPath!.substring(srcPath.length);
            const targetFp = newPathBase + suffix;
            patchDocumentInCache(d.id, { folderPath: targetFp });
            void updateDocument(d.id, { folderPath: targetFp });
          }

          // Persist the new order in the destination list
          const currentIdentities = getSavedOrderRaw(workspaceId, destListKey);
          reorderItemWithinList(
            workspaceId,
            destListKey,
            currentIdentities,
            `folder:${folderName}`,
            hi.insertIndex,
          );
        }
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (blockClickRef.current) {
        window.removeEventListener("click", blockClickRef.current, {
          capture: true,
        });
        blockClickRef.current = null;
      }
    };
  }, []); // ← empty deps: registered once, reads everything through stable refs

  const beginGripDrag = useCallback(
    (
      pointerId: number,
      docId: string,
      srcListKey: string,
      clientX: number,
      clientY: number,
    ) => {
      // Cancel any existing drag first
      dragRef.current = null;

      const d: ActiveDrag = {
        pointerId,
        docId,
        srcListKey,
        startX: clientX,
        startY: clientY,
        currentX: clientX,
        currentY: clientY,
        moved: false,
      };
      dragRef.current = d;

      // Do NOT set active drag states here; wait for onMove to cross threshold.
      setGhostPos(null);
      setHit(null);
      setIsDragging(false);
    },
    [],
  );

  const beginFolderDrag = useCallback(
    (
      pointerId: number,
      folderPath: string,
      srcListKey: string,
      clientX: number,
      clientY: number,
    ) => {
      // Cancel any existing drag first
      dragRef.current = null;

      const d: ActiveDrag = {
        pointerId,
        folderPath,
        srcListKey,
        startX: clientX,
        startY: clientY,
        currentX: clientX,
        currentY: clientY,
        moved: false,
      };
      dragRef.current = d;

      // Do NOT set active drag states here; wait for onMove to cross threshold.
      setGhostPos(null);
      setHit(null);
      setIsDragging(false);
    },
    [],
  );

  // Build the `session` shape that SidebarDocumentList reads for the ghost
  const session: SidebarDragSession | null =
    (activeDragDocId || activeDragFolderPath) && ghostPos
      ? {
          docId: activeDragDocId || undefined,
          folderPath: activeDragFolderPath || undefined,
          currentX: ghostPos.x,
          currentY: ghostPos.y,
        }
      : null;

  return { session, hit, beginGripDrag, beginFolderDrag, isDragging } as const;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function bumpFolder(
  all: Document[],
  docId: string,
  folderPath: string,
): Document[] {
  return all.map((d) => (d.id === docId ? { ...d, folderPath } : d));
}
