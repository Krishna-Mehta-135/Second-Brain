export type InsertPosition =
  | { type: "cursor"; offset: number }
  | { type: "append" }
  | { type: "replace"; startOffset: number; endOffset: number };

export type WSErrorCode =
  | "RATE_LIMITED"
  | "MESSAGE_TOO_LARGE"
  | "INVALID_UPDATE"
  | "INVALID_MESSAGE"
  | "UNAUTHORIZED"
  | "DOC_NOT_FOUND"
  | "AI_UNAVAILABLE"
  | "AI_RATE_LIMITED";

export type WSMessage =
  | { type: "sync-step-1"; stateVector: Uint8Array }
  | { type: "sync-step-2"; update: Uint8Array }
  | { type: "update"; update: Uint8Array }
  | { type: "awareness"; state: Uint8Array }
  | {
      type: "ai-request";
      prompt: string;
      insertPosition: InsertPosition;
      requestId: string;
    }
  | {
      type: "ai-update";
      update: Uint8Array;
      text: string;
      requestId: string;
      isDone: boolean;
    }
  | { type: "ai-cancel"; requestId: string }
  | { type: "error"; code: WSErrorCode; message: string }
  | { type: "ping" }
  | { type: "pong" };

// Helpers for AI service integration
export interface AIWritingRequest {
  docId: string;
  prompt: string;
  insertPosition: InsertPosition;
  requestId: string;
  userId: string;
}

export interface AIChunk {
  requestId: string;
  /** Raw markdown text token from the AI stream. */
  text: string;
  /** Empty Uint8Array — Y.Doc insertion is handled client-side via Tiptap. */
  update: Uint8Array;
  isDone: boolean;
}
