// ─────────────────────────────────────────────
// Cyan Alerts — Anomaly Detection & Recommendations
// Stored at: cyanAlerts/{businessId}/alerts/{alertId}
//
// Uses FirestoreTimestamp (from attendance.ts) instead of
// the client Timestamp — safe for both client and server usage.
// ─────────────────────────────────────────────

import type { FirestoreTimestamp } from './attendance'

export type AlertSeverity = 'info' | 'warning' | 'critical'

export type AlertCategory =
  | 'revenue_drop'
  | 'revenue_spike'
  | 'traffic_drop'
  | 'high_abandonment'
  | 'inventory_low'
  | 'team_risk'
  | 'goal_off_track'
  | 'payment_failed'
  | 'churn_signal'
  | 'overdue_invoice'
  | 'integration_error'
  | 'operational'

export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'dismissed'

export interface CyanAlert {
  alertId: string
  businessId: string
  category: AlertCategory
  severity: AlertSeverity
  status: AlertStatus
  title: string
  summary: string
  recommendation: string
  dataSnapshot: Record<string, unknown>
  detectedAt: FirestoreTimestamp
  acknowledgedAt: FirestoreTimestamp | null
  resolvedAt: FirestoreTimestamp | null
  resolvedBy: string | null
}

export interface CreateAlertPayload {
  businessId: string
  category: AlertCategory
  severity: AlertSeverity
  title: string
  summary: string
  recommendation: string
  dataSnapshot: Record<string, unknown>
}

export const ANOMALY_THRESHOLDS = {
  REVENUE_DROP_PERCENT: 20,
  TRAFFIC_DROP_PERCENT: 30,
  ABANDONMENT_SPIKE_PERCENT: 25,
  INVOICE_OVERDUE_DAYS: 7,
  GOAL_OFF_TRACK_PERCENT: 15,
} as const
