import { Mail, Cloud, ShieldCheck } from 'lucide-react';

export const PROBLEMS = [
  {
    icon: Mail,
    title: 'Phishing and malicious links',
    body: "One convincing email is all it takes. Zyphorix scans every URL, attachment, and sender for phishing, malware, and business email compromise before your team ever clicks.",
  },
  {
    icon: Cloud,
    title: 'Cloud misconfigurations',
    body: "A single public S3 bucket or over-permissioned IAM role can undo everything else you've built. Zyphorix continuously scans your AWS environment for exposed resources and identity risks.",
  },
  {
    icon: ShieldCheck,
    title: 'SOC 2 evidence collection',
    body: "Manually screenshotting evidence for auditors is a job nobody wants. Zyphorix automates control monitoring and evidence collection so your next audit doesn't eat a month.",
  },
];

export const HOW_IT_WORKS = [
  { step: '01', title: 'Connect', body: 'Link your AWS account, invite your team, and set up integrations in minutes — no agents to install.' },
  { step: '02', title: 'Scan', body: 'URLs, emails, files, and cloud infrastructure get scanned continuously against live threat intelligence.' },
  { step: '03', title: 'Act', body: 'Playbooks auto-respond to what matters. The AI Copilot explains anything you need a plain answer on.' },
];

export const REPLACES = [
  { name: 'A compliance platform like Vantage', cost: '$15,000/yr' },
  { name: 'A part-time security consultant', cost: '$10,000+' },
  { name: 'Manually scanning links and logs yourself', cost: 'Every Sunday night' },
];

export const PLANS = [
  {
    id: 'FREE', name: 'Free', price: 0, period: null,
    description: 'Get started with basic scanning',
    features: ['10 scans / month', '1 user', 'URL, email, file, domain scanning', '7-day scan history'],
    cta: 'Start free', popular: false,
  },
  {
    id: 'STARTER', name: 'Starter', price: 29, period: '/mo',
    description: 'Security basics for small teams',
    features: ['500 scans / month', '3 users', 'VirusTotal + AbuseIPDB scanning', '50 AI Copilot queries/mo', 'Slack + webhook alerts', 'API access'],
    cta: 'Start free trial', popular: false,
  },
  {
    id: 'PRO', name: 'Pro', price: 99, period: '/mo',
    description: 'The full platform for growing teams',
    features: ['5,000 scans / month', '10 users', 'Unlimited AI Copilot', 'AWS cloud security scanning', 'SOC 2 automation', 'Automated playbooks', 'Incident management'],
    cta: 'Start free trial', popular: true,
  },
  {
    id: 'BUSINESS', name: 'Business', price: 149, period: '/mo',
    description: 'Compliance-ready for regulated industries',
    features: ['20,000 scans / month', '25 users', 'Everything in Pro', 'PCI DSS v4.0 automation', 'HIPAA Security Rule compliance', 'Priority support'],
    cta: 'Start free trial', popular: false,
  },
  {
    id: 'ENTERPRISE', name: 'Enterprise', price: null, period: null,
    description: 'For companies with dedicated security needs',
    features: ['Unlimited scans', 'Unlimited users', 'Everything in Business', 'SSO / SAML', 'Dedicated onboarding', 'SLA guarantee'],
    cta: 'Talk to us', popular: false,
  },
];

export const FAQS = [
  {
    q: 'How is this different from Vantage or Drata?',
    a: "Those platforms are built for compliance teams and priced accordingly — often $15,000 a year and up. Zyphorix covers the same SOC 2 automation ground alongside URL, email, and cloud scanning that those tools don't touch, starting free and topping out well under what a single compliance seat costs elsewhere.",
  },
  {
    q: 'Do you store the files, URLs, or emails I scan?',
    a: "Scan results and risk summaries are stored so you can review your history. Raw file contents are processed in memory and never written to disk — only a short, truncated excerpt is kept for reference, never the full file.",
  },
  {
    q: 'Which cloud providers do you support?',
    a: 'AWS today — we scan EC2, IAM, S3, and related services for misconfigurations and exposed resources. Azure and GCP are on our roadmap.',
  },
  {
    q: 'Does the free plan really not require a card?',
    a: "Correct. Ten scans a month, no card, no trial countdown. Upgrade whenever the limits stop working for you, not before.",
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes — cancel from your billing settings whenever you like. You keep access through the end of your current billing period.',
  },
];
