export type OpportunityDecision = "MATCHED" | "REVIEW" | "REJECTED" | string;

export interface Opportunity {
  reference_number: string | null;
  title: string | null;
  government_entity: string | null;
  main_activity: string | null;
  opening_date: string | null;
  details_url: string | null;
  decision: OpportunityDecision | null;
  fit_score: number | null;
  confidence: number | null;
  best_service_area: string | null;
  reason_ar: string | null;
  recommended_action: string | null;
  last_seen_at: string | null;
}

export type DecisionFilter = "ALL" | "MATCHED" | "REVIEW" | "REJECTED";
export type SortKey = "fit_score" | "last_seen_at" | "opening_date";

export interface FiltersState {
  search: string;
  decision: DecisionFilter;
  serviceArea: string;
  minFitScore: number;
  sortBy: SortKey;
}

export interface KpiMetrics {
  total: number;
  matched: number;
  review: number;
  rejected: number;
}
