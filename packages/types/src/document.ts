export interface Document {
  id: string;
  title: string;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
}

export interface ConnectionContext {
  userId: string;
  docId: string;
  clientId: string;
  connectedAt: number;
  isAlive: boolean;
  isOfflineClient: boolean;
}
