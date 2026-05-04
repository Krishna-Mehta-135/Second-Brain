import type { Document } from "@repo/types";

const V = "v1";

/** Root notes use this key — never empty string for localStorage lookups. */
export const ROOT_LIST_KEY = "__root__";

function storageKey(workspaceId: string | null | undefined, listKey: string) {
  return `sb:docOrder:${V}:${workspaceId ?? "_"}:${listKey}`;
}

export function normalizeListKey(folderPath: string): string {
  const t = folderPath.trim();
  return t ? t : ROOT_LIST_KEY;
}

export function folderPathForListKey(listKey: string): string {
  return listKey === ROOT_LIST_KEY ? "" : listKey;
}

export function documentMatchesListKey(d: Document, listKey: string): boolean {
  return normalizeListKey(d.folderPath ?? "") === listKey;
}

export function persistOrderForDocs(
  workspaceId: string | null | undefined,
  listKey: string,
  docsAtLeaf: Document[],
) {
  const ids = orderDocumentsForSidebar(workspaceId, listKey, docsAtLeaf).map(
    (doc) => doc.id,
  );
  persistSidebarOrder(workspaceId, listKey, ids);
}

/** After moving `docId` out of `listKey`, persist remaining IDs in prior order. */
export function persistListAfterRemovingDoc(
  workspaceId: string | null | undefined,
  listKey: string,
  allDocs: Document[],
  removedDocId: string,
) {
  const docs = allDocs.filter(
    (d) => documentMatchesListKey(d, listKey) && d.id !== removedDocId,
  );
  persistOrderForDocs(workspaceId, listKey, docs);
}

export function appendMovedDocToListOrder(
  workspaceId: string | null | undefined,
  destListKey: string,
  allDocs: Document[],
  docId: string,
) {
  if (!workspaceId) return;
  const atDest = allDocs.filter(
    (d) => documentMatchesListKey(d, destListKey) && d.id !== docId,
  );
  const ordered = orderDocumentsForSidebar(
    workspaceId,
    destListKey,
    atDest,
  ).map((d) => d.id);
  if (!ordered.includes(docId)) ordered.push(docId);
  persistSidebarOrder(workspaceId, destListKey, ordered);
}

export function getSavedOrderRaw(
  workspaceId: string | null | undefined,
  listKey: string,
): string[] {
  if (typeof window === "undefined" || !workspaceId) return [];
  try {
    const raw = window.localStorage.getItem(storageKey(workspaceId, listKey));
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? arr.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

/** Merge persisted order with current docs — unknown IDs dropped, missing docs appended (new → old). */
export function orderDocumentsForSidebar(
  workspaceId: string | null | undefined,
  listKey: string,
  docsAtLeaf: Document[],
): Document[] {
  if (!workspaceId || docsAtLeaf.length === 0) {
    return [...docsAtLeaf].sort(
      (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0),
    );
  }

  const byId = new Map(docsAtLeaf.map((d) => [d.id, d]));
  const saved = getSavedOrderRaw(workspaceId, listKey);
  const out: Document[] = [];
  const used = new Set<string>();

  for (const id of saved) {
    const d = byId.get(id);
    if (d) {
      out.push(d);
      used.add(id);
    }
  }

  const rest = docsAtLeaf
    .filter((d) => !used.has(d.id))
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  out.push(...rest);
  return out;
}

export function persistSidebarOrder(
  workspaceId: string | null | undefined,
  listKey: string,
  orderedIds: string[],
) {
  if (typeof window === "undefined" || !workspaceId) return;
  try {
    window.localStorage.setItem(
      storageKey(workspaceId, listKey),
      JSON.stringify(orderedIds),
    );
  } catch {
    /* noop */
  }
}

export function persistOrderForItems(
  workspaceId: string | null | undefined,
  listKey: string,
  orderedIdentities: string[],
) {
  persistSidebarOrder(workspaceId, listKey, orderedIdentities);
}

export function reorderItemWithinList(
  workspaceId: string | null | undefined,
  listKey: string,
  currentIdentities: string[],
  draggedIdentity: string,
  insertIndex: number,
) {
  if (!workspaceId) return;

  const ordered = currentIdentities.filter((id) => id !== draggedIdentity);
  const n = ordered.length;
  const idx = Math.max(0, Math.min(insertIndex, n));
  ordered.splice(idx, 0, draggedIdentity);
  persistSidebarOrder(workspaceId, listKey, ordered);
}

/** Merge persisted order with current items — unknown IDs dropped, missing ones appended. */
export function orderItemsForSidebar(
  workspaceId: string | null | undefined,
  listKey: string,
  docIds: string[],
  folderNames: string[],
): string[] {
  if (!workspaceId) {
    // Fallback: folders first (alpha), then docs (newest first - though here we only have IDs)
    return [
      ...folderNames.sort().map((n) => `folder:${n}`),
      ...docIds.map((id) => `doc:${id}`),
    ];
  }

  const saved = getSavedOrderRaw(workspaceId, listKey);
  const out: string[] = [];
  const used = new Set<string>();

  const docSet = new Set(docIds.map((id) => `doc:${id}`));
  const folderSet = new Set(folderNames.map((n) => `folder:${n}`));

  for (const ident of saved) {
    if (docSet.has(ident) || folderSet.has(ident)) {
      out.push(ident);
      used.add(ident);
    }
  }

  // Append new folders
  const restFolders = folderNames
    .filter((n) => !used.has(`folder:${n}`))
    .sort()
    .map((n) => `folder:${n}`);

  // Append new docs
  const restDocs = docIds
    .filter((id) => !used.has(`doc:${id}`))
    .map((id) => `doc:${id}`);

  return [...out, ...restFolders, ...restDocs];
}
