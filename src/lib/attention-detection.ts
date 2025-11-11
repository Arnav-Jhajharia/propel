/**
 * Attention Detection Logic
 * Determines if a prospect requires attention based on 5 criteria
 */

export type AttentionReason =
  | "budget_below_threshold"
  | "budget_critical_low"
  | "missing_critical_info"
  | "high_score_no_response"
  | "viewing_not_confirmed";

export interface AttentionResult {
  requiresAttention: boolean;
  reasons: AttentionReason[];
  severity: "critical" | "warning" | "info" | null;
}

export interface ProspectData {
  score: number;
  budget?: number | string | null;
  moveInDate?: string | null;
  lastMessageAt?: string | null;
  stage?: string;
  viewingScheduled?: boolean;
  viewingConfirmed?: boolean;
}

export interface PropertyData {
  price: number;
}

/**
 * Detect if a prospect requires attention
 */
export function detectAttentionReasons(
  prospect: ProspectData,
  property: PropertyData
): AttentionResult {
  const reasons: AttentionReason[] = [];
  let severity: "critical" | "warning" | "info" | null = null;

  const propertyPrice = property.price;
  const prospectBudget = typeof prospect.budget === "string" 
    ? parseFloat(prospect.budget.replace(/[^\d.]/g, "")) 
    : prospect.budget || 0;

  // 1. Budget way too low (< 70% of property price) - CRITICAL
  if (prospectBudget > 0 && propertyPrice > 0) {
    const budgetRatio = (prospectBudget / propertyPrice) * 100;
    if (budgetRatio < 70) {
      reasons.push("budget_critical_low");
      if (!severity || severity === "info") severity = "critical";
    }
  }

  // 2. Budget below property price threshold (< 90% of property price) - WARNING
  if (prospectBudget > 0 && propertyPrice > 0) {
    const budgetRatio = (prospectBudget / propertyPrice) * 100;
    if (budgetRatio >= 70 && budgetRatio < 90) {
      reasons.push("budget_below_threshold");
      if (!severity || severity === "info") severity = "warning";
    }
  }

  // 3. Missing critical screening information
  const hasBudget = prospectBudget > 0;
  const hasMoveInDate = !!prospect.moveInDate;
  if (!hasBudget || !hasMoveInDate) {
    reasons.push("missing_critical_info");
    if (!severity) severity = "warning";
  }

  // 4. High score but no response (> 5 days)
  if (prospect.score >= 80 && prospect.lastMessageAt) {
    const lastMessageDate = new Date(prospect.lastMessageAt);
    const daysSinceLastMessage = (Date.now() - lastMessageDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastMessage > 5) {
      reasons.push("high_score_no_response");
      if (!severity || severity === "info") severity = "warning";
    }
  }

  // 5. Viewing scheduled but not confirmed
  if (prospect.viewingScheduled && !prospect.viewingConfirmed) {
    reasons.push("viewing_not_confirmed");
    if (!severity) severity = "info";
  }

  return {
    requiresAttention: reasons.length > 0,
    reasons,
    severity,
  };
}

/**
 * Get human-readable message for attention reason
 */
export function getAttentionReasonMessage(reason: AttentionReason): string {
  const messages: Record<AttentionReason, string> = {
    budget_below_threshold: "Budget below property price",
    budget_critical_low: "Budget significantly below asking price",
    missing_critical_info: "Missing critical screening information",
    high_score_no_response: "High score but no recent response",
    viewing_not_confirmed: "Viewing scheduled but not confirmed",
  };
  return messages[reason];
}

/**
 * Get all attention reason messages
 */
export function getAttentionMessages(reasons: AttentionReason[]): string[] {
  return reasons.map(getAttentionReasonMessage);
}

