export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";
export type ReportTargetType = "user" | "listing" | "message";

export interface Report {
  id: string;
  reporterId: string;
  targetId: string;
  targetType: ReportTargetType;
  reason: string;
  details?: string;
  status: ReportStatus;
  adminNote?: string;
  createdAt: Date;
  updatedAt: Date;
}
