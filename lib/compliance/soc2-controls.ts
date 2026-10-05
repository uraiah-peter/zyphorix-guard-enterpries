// ─── SOC 2 Trust Service Criteria ─────────────────────────────────────────
// Maps the 5 SOC 2 Trust Service Criteria (TSC) to specific controls,
// and maps each control to evidence that Zyphorix Guard already collects.
// This is the core of the compliance automation angle.

export type TSCCategory =
  | 'CC' // Common Criteria (Security)
  | 'A'  // Availability
  | 'PI' // Processing Integrity
  | 'C'  // Confidentiality
  | 'P'  // Privacy

export type ControlStatus = 'MET' | 'PARTIAL' | 'NOT_MET' | 'NOT_APPLICABLE'

export interface SOC2Control {
  id: string           // e.g. CC6.1
  category: TSCCategory
  title: string
  description: string
  evidenceType: EvidenceType[]
  automatedCheck: boolean // Can Zyphorix verify this automatically?
  howZyphorixHelps: string
  remediation?: string
}

export type EvidenceType =
  | 'SCAN_HISTORY'        // Scan logs from Zyphorix
  | 'INCIDENT_LOG'        // Incident creation/resolution records
  | 'AUDIT_LOG'           // Who did what and when
  | 'ACCESS_CONTROL'      // RBAC config, team membership
  | 'CLOUD_FINDING'       // Cloud security scan results
  | 'MFA_STATUS'          // IAM MFA findings from cloud scan
  | 'ENCRYPTION_STATUS'   // S3 encryption findings
  | 'VULNERABILITY_SCAN'  // Scan findings by severity
  | 'ASSET_INVENTORY'     // Asset table
  | 'MANUAL'              // Requires human evidence upload

export const SOC2_CONTROLS: SOC2Control[] = [
  // ── CC1: Control Environment ───────────────────────────────────────────
  {
    id: 'CC1.1', category: 'CC',
    title: 'COSO Principle 1: Commitment to Integrity and Ethics',
    description: 'The entity demonstrates a commitment to integrity and ethical values.',
    evidenceType: ['AUDIT_LOG', 'MANUAL'],
    automatedCheck: false,
    howZyphorixHelps: 'Audit logs capture all user actions with timestamps, IP addresses, and outcomes — demonstrating accountable behavior.',
    remediation: 'Upload your security policy document and code of conduct.',
  },
  {
    id: 'CC1.2', category: 'CC',
    title: 'Board Oversight of Internal Controls',
    description: 'The board of directors demonstrates independence and exercises oversight of controls.',
    evidenceType: ['MANUAL'],
    automatedCheck: false,
    howZyphorixHelps: 'Your audit log history shows management oversight of security operations.',
    remediation: 'Document board-level security review meetings.',
  },

  // ── CC2: Communication and Information ────────────────────────────────
  {
    id: 'CC2.1', category: 'CC',
    title: 'Information to Support Internal Controls',
    description: 'The entity obtains or generates relevant quality information to support internal controls.',
    evidenceType: ['SCAN_HISTORY', 'INCIDENT_LOG', 'AUDIT_LOG'],
    automatedCheck: true,
    howZyphorixHelps: 'Zyphorix automatically generates scan reports, incident timelines, and audit logs that serve as evidence of continuous security monitoring.',
  },
  {
    id: 'CC2.2', category: 'CC',
    title: 'Internal Communication of Objectives',
    description: 'The entity internally communicates information necessary to support the functioning of internal controls.',
    evidenceType: ['AUDIT_LOG', 'MANUAL'],
    automatedCheck: false,
    howZyphorixHelps: 'Team management features show who has access to security information and at what permission level.',
  },

  // ── CC3: Risk Assessment ───────────────────────────────────────────────
  {
    id: 'CC3.1', category: 'CC',
    title: 'Specification of Objectives',
    description: 'The entity specifies objectives with sufficient clarity to enable risk identification and assessment.',
    evidenceType: ['MANUAL'],
    automatedCheck: false,
    howZyphorixHelps: 'Document your security objectives to satisfy this control.',
    remediation: 'Define and document specific security objectives in your security policy.',
  },
  {
    id: 'CC3.2', category: 'CC',
    title: 'Risk Identification and Analysis',
    description: 'The entity identifies risks to achieving its objectives across the entity.',
    evidenceType: ['SCAN_HISTORY', 'VULNERABILITY_SCAN', 'CLOUD_FINDING'],
    automatedCheck: true,
    howZyphorixHelps: 'Continuous security scanning across URL, email, file, and cloud infrastructure provides documented risk identification. Every scan finding is a risk identified.',
  },
  {
    id: 'CC3.3', category: 'CC',
    title: 'Fraud Risk Assessment',
    description: 'The entity considers the potential for fraud in assessing risks.',
    evidenceType: ['SCAN_HISTORY', 'INCIDENT_LOG'],
    automatedCheck: true,
    howZyphorixHelps: 'BEC (Business Email Compromise) and phishing detection directly addresses fraud risk. Incident logs demonstrate active fraud risk management.',
  },

  // ── CC4: Monitoring Activities ─────────────────────────────────────────
  {
    id: 'CC4.1', category: 'CC',
    title: 'Ongoing and Separate Evaluations',
    description: 'The entity selects, develops, and performs ongoing evaluations to determine whether controls are present and functioning.',
    evidenceType: ['SCAN_HISTORY', 'CLOUD_FINDING', 'AUDIT_LOG'],
    automatedCheck: true,
    howZyphorixHelps: 'Automated continuous scanning provides ongoing control evaluation. Cloud security scans verify infrastructure controls are functioning.',
  },
  {
    id: 'CC4.2', category: 'CC',
    title: 'Evaluation and Communication of Deficiencies',
    description: 'The entity evaluates and communicates control deficiencies in a timely manner.',
    evidenceType: ['INCIDENT_LOG', 'SCAN_HISTORY'],
    automatedCheck: true,
    howZyphorixHelps: 'HIGH and CRITICAL findings trigger automatic notifications. Incident management tracks deficiency remediation from detection to resolution.',
  },

  // ── CC5: Control Activities ────────────────────────────────────────────
  {
    id: 'CC5.1', category: 'CC',
    title: 'Selection and Development of Control Activities',
    description: 'The entity selects and develops control activities that contribute to mitigation of risks.',
    evidenceType: ['SCAN_HISTORY', 'CLOUD_FINDING', 'MANUAL'],
    automatedCheck: false,
    howZyphorixHelps: 'Zyphorix scan history demonstrates selected controls (URL scanning, cloud monitoring). Upload your security control framework document.',
  },
  {
    id: 'CC5.3', category: 'CC',
    title: 'Deployment of Policies and Procedures',
    description: 'The entity deploys control activities through policies that establish expectations and procedures.',
    evidenceType: ['MANUAL'],
    automatedCheck: false,
    howZyphorixHelps: 'Upload your security policies and procedures to satisfy this control.',
    remediation: 'Document your information security policy, acceptable use policy, and incident response procedure.',
  },

  // ── CC6: Logical and Physical Access Controls ──────────────────────────
  {
    id: 'CC6.1', category: 'CC',
    title: 'Logical Access Security Measures',
    description: 'The entity implements logical access security software, infrastructure, and architectures.',
    evidenceType: ['ACCESS_CONTROL', 'MFA_STATUS', 'CLOUD_FINDING'],
    automatedCheck: true,
    howZyphorixHelps: 'Team access controls with RBAC are documented in your org settings. Cloud IAM scan verifies MFA is enforced on AWS accounts.',
  },
  {
    id: 'CC6.2', category: 'CC',
    title: 'New Internal User Access Registration',
    description: 'Prior to issuing credentials, the entity registers and authorizes new internal users.',
    evidenceType: ['AUDIT_LOG', 'ACCESS_CONTROL'],
    automatedCheck: true,
    howZyphorixHelps: 'Every team member invite and join is recorded in the audit log with timestamp, inviter identity, and role assigned.',
  },
  {
    id: 'CC6.3', category: 'CC',
    title: 'Role-Based Access and Least Privilege',
    description: 'The entity authorizes, modifies, and removes access to data and systems based on roles.',
    evidenceType: ['ACCESS_CONTROL', 'AUDIT_LOG'],
    automatedCheck: true,
    howZyphorixHelps: 'Your org has role-based access control (OWNER, ADMIN, ANALYST, VIEWER). Role changes are recorded in the audit log with before/after states.',
  },
  {
    id: 'CC6.6', category: 'CC',
    title: 'Logical Access Restrictions Over Sensitive Assets',
    description: 'The entity implements logical access security measures to protect against unauthorized access.',
    evidenceType: ['CLOUD_FINDING', 'MFA_STATUS', 'ENCRYPTION_STATUS'],
    automatedCheck: true,
    howZyphorixHelps: 'Cloud security scans detect publicly exposed S3 buckets, missing encryption, open security groups, and IAM users without MFA.',
  },
  {
    id: 'CC6.7', category: 'CC',
    title: 'Transmission Integrity and Confidentiality',
    description: 'The entity restricts the transmission, movement, and removal of information to authorized parties.',
    evidenceType: ['CLOUD_FINDING', 'MANUAL'],
    automatedCheck: false,
    howZyphorixHelps: 'S3 encryption findings verify data-at-rest protection. Upload TLS certificate documentation for data-in-transit evidence.',
  },

  // ── CC7: System Operations ─────────────────────────────────────────────
  {
    id: 'CC7.1', category: 'CC',
    title: 'Vulnerability Management',
    description: 'The entity identifies, develops, and implements controls to detect security events.',
    evidenceType: ['SCAN_HISTORY', 'VULNERABILITY_SCAN', 'CLOUD_FINDING'],
    automatedCheck: true,
    howZyphorixHelps: 'Continuous vulnerability scanning across all vectors (URL, email, file, cloud) with documented findings and risk scores directly satisfies this control.',
  },
  {
    id: 'CC7.2', category: 'CC',
    title: 'Monitoring for Anomalies and Indicators of Compromise',
    description: 'The entity monitors for anomalies and indicators of compromise and evaluates detected events.',
    evidenceType: ['SCAN_HISTORY', 'INCIDENT_LOG', 'CLOUD_FINDING'],
    automatedCheck: true,
    howZyphorixHelps: 'Real-time threat detection with MITRE ATT&CK mapping, automated alerting for HIGH/CRITICAL findings, and incident management with full timeline.',
  },
  {
    id: 'CC7.3', category: 'CC',
    title: 'Incident Response',
    description: 'The entity evaluates security events to determine whether they are security incidents.',
    evidenceType: ['INCIDENT_LOG', 'AUDIT_LOG'],
    automatedCheck: true,
    howZyphorixHelps: 'Incident management with severity classification (P1-P4), status lifecycle tracking, and timestamped investigation timelines.',
  },
  {
    id: 'CC7.4', category: 'CC',
    title: 'Incident Response and Recovery',
    description: 'The entity responds to identified security incidents by executing a defined incident response program.',
    evidenceType: ['INCIDENT_LOG', 'MANUAL'],
    automatedCheck: false,
    howZyphorixHelps: 'Incident resolution records with timeline, assigned owner, and resolution notes. Upload your incident response plan document.',
    remediation: 'Create and document an incident response plan. Link it to your Zyphorix incident records.',
  },

  // ── CC8: Change Management ─────────────────────────────────────────────
  {
    id: 'CC8.1', category: 'CC',
    title: 'Change Management Process',
    description: 'The entity authorizes, designs, develops, configures, documents, tests, approves, and implements changes.',
    evidenceType: ['AUDIT_LOG', 'MANUAL'],
    automatedCheck: false,
    howZyphorixHelps: 'All configuration changes (team roles, API keys, org settings) recorded in audit log. Upload your change management policy.',
    remediation: 'Document your change management process and upload supporting evidence.',
  },

  // ── CC9: Risk Mitigation ───────────────────────────────────────────────
  {
    id: 'CC9.1', category: 'CC',
    title: 'Risk Mitigation',
    description: 'The entity identifies, selects, and develops risk mitigation activities for risks arising from business disruptions.',
    evidenceType: ['INCIDENT_LOG', 'CLOUD_FINDING', 'MANUAL'],
    automatedCheck: false,
    howZyphorixHelps: 'Cloud security findings with remediation recommendations, incident resolution records, and asset inventory demonstrate active risk mitigation.',
  },
  {
    id: 'CC9.2', category: 'CC',
    title: 'Vendor and Third-Party Risk Management',
    description: 'The entity assesses and manages risks associated with vendors and business partners.',
    evidenceType: ['ASSET_INVENTORY', 'MANUAL'],
    automatedCheck: false,
    howZyphorixHelps: 'Asset inventory can track vendor-managed systems. Upload vendor security assessments.',
    remediation: 'Document your vendor risk assessment process and maintain a vendor inventory.',
  },

  // ── A1: Availability ───────────────────────────────────────────────────
  {
    id: 'A1.1', category: 'A',
    title: 'Availability Commitments and Requirements',
    description: 'The entity maintains, monitors, and evaluates current processing capacity and use of system components.',
    evidenceType: ['MANUAL'],
    automatedCheck: false,
    howZyphorixHelps: 'Upload uptime monitoring reports and SLA documentation.',
    remediation: 'Configure an uptime monitor (UptimeRobot, Pingdom) and document your availability SLA.',
  },
  {
    id: 'A1.2', category: 'A',
    title: 'Environmental Protections',
    description: 'Environmental protections, software, data backup processes, and recovery infrastructure are authorized, designed, developed, implemented, operated, approved, maintained, and monitored.',
    evidenceType: ['MANUAL'],
    automatedCheck: false,
    howZyphorixHelps: 'Upload your backup and disaster recovery documentation.',
    remediation: 'Document backup frequency, retention policy, and recovery testing results.',
  },

  // ── C1: Confidentiality ────────────────────────────────────────────────
  {
    id: 'C1.1', category: 'C',
    title: 'Identification of Confidential Information',
    description: 'The entity identifies and maintains confidential information to meet the entity\'s objectives.',
    evidenceType: ['ASSET_INVENTORY', 'MANUAL'],
    automatedCheck: false,
    howZyphorixHelps: 'Your asset inventory can document systems that process confidential data. Tag assets as "confidential" or "pii".',
    remediation: 'Tag assets in the asset inventory with data classification labels.',
  },
  {
    id: 'C1.2', category: 'C',
    title: 'Disposal of Confidential Information',
    description: 'The entity disposes of confidential information to meet the entity\'s objectives.',
    evidenceType: ['MANUAL'],
    automatedCheck: false,
    howZyphorixHelps: 'Upload data retention and deletion policy documentation.',
    remediation: 'Document your data retention policy and deletion procedures.',
  },
];

// Categorized for UI rendering
export const CONTROL_CATEGORIES = {
  CC: { label: 'Security (Common Criteria)', color: '#3b82f6', count: SOC2_CONTROLS.filter(c => c.category === 'CC').length },
  A:  { label: 'Availability',               color: '#10b981', count: SOC2_CONTROLS.filter(c => c.category === 'A').length },
  PI: { label: 'Processing Integrity',        color: '#6366f1', count: SOC2_CONTROLS.filter(c => c.category === 'PI').length },
  C:  { label: 'Confidentiality',             color: '#8b5cf6', count: SOC2_CONTROLS.filter(c => c.category === 'C').length },
  P:  { label: 'Privacy',                     color: '#f59e0b', count: SOC2_CONTROLS.filter(c => c.category === 'P').length },
};
