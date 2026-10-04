export interface AuditEntry {
  adminUserId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  changes?: Record<string, unknown>;
}

export interface AuditLog {
  record(entry: AuditEntry): Promise<void>;
}
