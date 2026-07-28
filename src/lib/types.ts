export type RiskLevel = "low" | "medium" | "high";
export type VerificationState = "demo" | "unverified" | "connected";

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
}
