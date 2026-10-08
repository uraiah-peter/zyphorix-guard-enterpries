export type PlaybookTrigger = 'SCAN_CRITICAL'|'SCAN_HIGH'|'SCAN_URL_CRITICAL'|'SCAN_EMAIL_HIGH'|'SCAN_FILE_CRITICAL'|'SCAN_CLOUD_HIGH'|'INCIDENT_P1'|'INCIDENT_P2'|'ANY_INCIDENT'
export type ActionType = 'CREATE_INCIDENT'|'SEND_SLACK'|'SEND_WEBHOOK'|'SEND_EMAIL'|'AI_ANALYZE'|'ASSIGN_INCIDENT'
export interface PlaybookAction { type: ActionType; config: Record<string, unknown> }
export interface PlaybookCondition { field: 'riskScore'|'scanType'|'riskLevel'|'findingCategory'; operator: 'gte'|'lte'|'eq'|'contains'; value: string|number }
export interface ActionResult { actionType: ActionType; success: boolean; output?: string; error?: string; durationMs: number }
