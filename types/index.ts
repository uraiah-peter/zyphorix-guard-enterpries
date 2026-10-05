export type { MemberRole, PlanTier, SubscriptionStatus, ScanType, ScanStatus, RiskLevel, IncidentStatus, IncidentSeverity, AssetType, CloudProvider, NotificationType, AuditAction } from '@prisma/client';
export type { Organization, OrganizationMember, OrganizationSettings, User, Subscription, Scan, ScanFinding, ScanReport, Notification, UserNotification, AuditLog, Incident, Asset, CloudConnection, ApiKey } from '@prisma/client';

export interface SessionUser { id: string; email: string; name: string | null; image: string | null; }
export interface ApiSuccess<T> { data: T; meta?: { page?: number; total?: number; hasMore?: boolean; cursor?: string; }; }
export interface ApiError { error: { code: string; message: string; details?: unknown; }; }
export type ApiResponse<T> = ApiSuccess<T> | ApiError;
export interface PaginationParams { cursor?: string; limit?: number; }
export interface PaginatedResult<T> { items: T[]; nextCursor: string | null; total: number; }

export type Permission = 'scan:create'|'scan:read'|'scan:delete'|'report:read'|'incident:create'|'incident:manage'|'asset:manage'|'cloud:connect'|'member:invite'|'member:manage'|'apikey:manage'|'auditlog:read'|'settings:manage'|'billing:manage'|'org:delete';

export interface DashboardStats { securityScore: number; totalScans: number; threatsDetected: number; criticalFindings: number; openIncidents: number; assetsMonitored: number; scansThisWeek: number; scoreTrend: number; }
export interface ActivityItem { id: string; type: 'scan'|'incident'|'member'|'cloud'|'api_key'; title: string; description: string; severity?: string; timestamp: string; actionUrl?: string; }
export interface PlanLimits { scansPerMonth: number; maxUsers: number; maxOrgs: number; aiQueriesPerMonth: number; historyRetentionDays: number; apiAccess: boolean; cloudSecurity: boolean; customReports: boolean; ssoSaml: boolean; }
export type PlanName = 'FREE'|'STARTER'|'PRO'|'BUSINESS'|'ENTERPRISE';

// ─── Plan Limits ─────────────────────────────────────────────────────────
// Free:     $0    — lead generation, prove value
// Starter:  $29   — solo founders, small teams, security basics
// Pro:      $99   — growing startups, full platform
// Business: $149  — compliance-driven, fintech/healthtech, PCI/HIPAA
// Enterprise: custom — post-Series B, dedicated support
export const PLAN_LIMITS: Record<string, PlanLimits> = {
  FREE:       { scansPerMonth:10,    maxUsers:1,  maxOrgs:1,  aiQueriesPerMonth:0,   historyRetentionDays:7,   apiAccess:false, cloudSecurity:false, customReports:false, ssoSaml:false },
  STARTER:    { scansPerMonth:500,   maxUsers:3,  maxOrgs:1,  aiQueriesPerMonth:50,  historyRetentionDays:30,  apiAccess:true,  cloudSecurity:false, customReports:false, ssoSaml:false },
  PRO:        { scansPerMonth:5000,  maxUsers:10, maxOrgs:3,  aiQueriesPerMonth:-1,  historyRetentionDays:90,  apiAccess:true,  cloudSecurity:true,  customReports:true,  ssoSaml:false },
  BUSINESS:   { scansPerMonth:20000, maxUsers:25, maxOrgs:5,  aiQueriesPerMonth:-1,  historyRetentionDays:365, apiAccess:true,  cloudSecurity:true,  customReports:true,  ssoSaml:false },
  ENTERPRISE: { scansPerMonth:-1,    maxUsers:-1, maxOrgs:-1, aiQueriesPerMonth:-1,  historyRetentionDays:365, apiAccess:true,  cloudSecurity:true,  customReports:true,  ssoSaml:true  },
};

export const PLAN_PRICING: Record<string, { price: number; label: string; description: string; badge?: string }> = {
  FREE:       { price:0,   label:'Free',     description:'10 scans/month, 1 user' },
  STARTER:    { price:29,  label:'Starter',  description:'500 scans/month, 3 users, AI Copilot' },
  PRO:        { price:99,  label:'Pro',      description:'5,000 scans/month, 10 users, cloud security', badge:'Most Popular' },
  BUSINESS:   { price:149, label:'Business', description:'20,000 scans/month, 25 users, PCI/HIPAA compliance', badge:'Best Value' },
  ENTERPRISE: { price:0,   label:'Enterprise',description:'Unlimited everything, SSO, dedicated support' },
};
