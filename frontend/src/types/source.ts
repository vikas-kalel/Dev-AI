export type KnowledgeSourceType = "GITHUB" | "JIRA" | "CONFLUENCE" | "MANUAL";
export type KnowledgeSourceStatus =
  | "CONNECTED"
  | "SYNCING"
  | "ERROR"
  | "DISCONNECTED";

export interface KnowledgeSource {
  _id: string;
  projectId: string;
  type: KnowledgeSourceType;
  name: string;
  status: KnowledgeSourceStatus;
  metadata?: {
    url?: string;
    repo?: string;
    projectKey?: string;
    spaceKey?: string;
    syncSchedule?: string;
  };
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt?: string;
}
