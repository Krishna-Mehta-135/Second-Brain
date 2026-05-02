# App Shell Architecture

This document explains the core design decisions made for the application shell.

## 1. Optimistic Updates

Creating a document typically involves a network round-trip that takes 200-500ms. Without optimistic UI, the "New Document" button would appear frozen during this window, leading to a sluggish user experience.

**Implementation**:

- We add a placeholder entry to the `documents` state immediately with a `temp-` ID.
- The UI renders this entry with a loading state (reduced opacity).
- Once the API returns the real document, we swap the temporary ID with the persistent one.
- If the request fails, we roll back the state by removing the temporary entry.

## 2. Server-Side Redirects

The `app/(app)/documents/page.tsx` acts as a smart entry point. Instead of showing an empty screen or a "Select a document" prompt, it identifies the user's most recently updated document and issues a server-side `redirect`.

**Benefit**: This eliminates the "flash of empty state" and reduces the number of clicks required for a user to resume their work. If no documents exist, it gracefully renders the empty state.

## 3. Scoped Scrolling

The sidebar layout is divided into a fixed header/action area and a scrollable document list.

**Design Rationale**: By using `ScrollArea` only on the document list (rather than the entire sidebar), we ensure that the brand identity (logo), user menu, and primary "New Document" action remain stationary. This provides a stable anchor for the user while navigating through potentially hundreds of documents.

## 4. Next.js API Proxy

The web app includes API routes (`/api/documents`) that proxy requests to the `http-backend`.

**Reasoning**:

- **Security**: Allows us to handle session cookies and authorization headers server-side.
- **Data Transformation**: The backend returns a generic `Content` model; the proxy transforms this into the specific `Document` interface expected by the UI, keeping the frontend logic clean and focused.
