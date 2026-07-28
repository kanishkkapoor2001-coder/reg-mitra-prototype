export type RiskLevel = "low" | "medium" | "high";
export type VerificationState = "demo" | "unverified" | "connected";
export type EvidenceState = "verified" | "unverified" | "demo" | "stale" | "not-connected";
export type ReviewState = "not-reviewed" | "in-review" | "approved";

export interface SourceRecord {
  publisher: string;
  title: string;
  url: string;
  publishedAt: string;
  checkedAt: string;
}

export interface EvidenceRecord {
  state: EvidenceState;
  source: SourceRecord | null;
  applicability: string;
  reviewState: ReviewState;
  reviewedBy: string | null;
  caveat: string;
}

export interface Client {
  id: string;
  name: string;
  shortName: string;
  sector: string;
  location: string;
  initials: string;
  risk: RiskLevel;
  riskScore: number;
  pending: number;
  dueThisWeek: number;
  compliant: number;
  source: VerificationState;
  identifiers: string[];
}

export interface WorkItem {
  id: string;
  title: string;
  client: string;
  authority: string;
  due: string;
  urgency: RiskLevel;
  state: "needs-review" | "draft-ready" | "upcoming";
}

export interface Regulation {
  id: string;
  title: string;
  authority: string;
  published: string;
  effective: string;
  impact: string;
  verification: VerificationState;
  evidence: EvidenceRecord;
}
