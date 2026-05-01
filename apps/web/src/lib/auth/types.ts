export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: number;
}

export interface Session {
  user: User;
  expiresAt: number;
}

export type AuthState =
  | { status: "loading" }
  | { status: "authenticated"; session: Session }
  | { status: "unauthenticated" };
