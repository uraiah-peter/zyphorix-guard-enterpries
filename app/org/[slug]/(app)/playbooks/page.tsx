'use client';
import { useEffect, useState } from 'react';
import { useOrg } from '@/components/layout/OrgProvider';
import { Plus, Play, Trash2, ToggleLeft, ToggleRight, ChevronDown, ChevronUp, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Card, SectionHeader, EmptyState, Skeleton } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui';
import { timeAgo, cn } from '@/lib/utils';

const TRIGGERS = [
  { value:'SCAN_CRITICAL',     label:'🚨 Any scan returns CRITICAL' },
  { value:'SCAN_HIGH',         label:'⚠️ Any scan returns HIGH or CRITICAL' },
  { value:'SCAN_URL_CRITICAL', label:'🔗 URL scan returns CRITICAL' },
  { value:'SCAN_EMAIL_HIGH',   label:'✉️ Email scan returns HIGH or CRITICAL' },
  { value:'SCAN_FILE_CRITICAL',label:'📄 File scan detects malware (CRITICAL)' },
  { value:'SCAN_CLOUD_HIGH',   label:'☁️ Cloud scan finds HIGH or CRITICAL issue' },
  { value:'INCIDENT_P1',       label:'🔴 P1 Critical incident created' },
  { value:'INCIDENT_P2',       label:'🟠 P2 High incident created' },
  { value:'ANY_INCIDENT',      label:'📋 Any incident created' },
];

const ACTION_TYPES = [
  { value:'CREATE_INCIDENT', label:'📋 Create incident automatically' },
  { value:'SEND_SLACK',      label:'💬 Send Slack message' },
  { value:'SEND_WEBHOOK',    label:'🔗 Call custom webhook' },
  { value:'SEND_EMAIL',      label:'✉️ Send email alert' },
  { value:'AI_ANALYZE',      label:'🤖 Generate AI analysis' },
];

const TEMPLATES = [
  {
    name: 'Auto-create P1 incident on critical threat',
    description: 'When any scan returns CRITICAL, automatically open a P1 incident for the team.',
    trigger: 'SCAN_CRITICAL',
    conditions: [],
    actions: [
      { type: 'CREATE_INCIDENT', config: { title: 'Critical threat detected — {{scanType}} scan', severity: 'P1_CRITICAL', description: 'Automatically created by playbook. Risk Score: {{riskScore}}/100. Summary: {{summary}}' } },
      { type: 'SEND_SLACK', config: { message: '🚨 CRITICAL threat — {{scanType}} scan returned {{riskScore}}/100' } },
    ],
  },
  {
    name: 'Alert team on phishing email',
    description: 'When an email scan returns HIGH or CRITICAL (likely phishing/BEC), notify the team.',
    trigger: 'SCAN_EMAIL_HIGH',
    conditions: [],
    actions: [
      { type: 'SEND_SLACK', config: { message: '⚠️ Suspicious email detected — Risk: {{riskScore}}/100. {{summary}}' } },
      { type: 'SEND_EMAIL', config: { to: 'security@yourcompany.com', subject: 'Phishing email detected — Zyphorix Guard' } },
    ],
  },
  {
    name: 'Malware file alert with AI analysis',
    description: 'When a file is flagged as malware, get an AI explanation and create an incident.',
    trigger: 'SCAN_FILE_CRITICAL',
    conditions: [],
    actions: [
      { type: 'AI_ANALYZE', config: { prompt: 'Analyze this malware detection and provide immediate response steps: Risk Level: {{riskLevel}}, Summary: {{summary}}' } },
      { type: 'CREATE_INCIDENT', config: { title: 'Malware detected — file scan', severity: 'P1_CRITICAL', description: '{{summary}}' } },
    ],
  },
];

function ActionConfigForm({ action, onChange }: { action: any; onChange: (a: any) => void }) {
  const cfg = action.config ?? {};
  switch (action.type) {
    case 'CREATE_INCIDENT': return (
      <div className="space-y-2 mt-2">
        <Input placeholder="Incident title (use {{scanType}}, {{riskScore}})" value={cfg.title ?? ''} onChange={e => onChange({...action, config:{...cfg,title:e.target.value}})} />
        <Select options={[{value:'P1_CRITICAL',label:'P1 Critical'},{value:'P2_HIGH',label:'P2 High'},{value:'P3_MEDIUM',label:'P3 Medium'}]} value={cfg.severity ?? 'P2_HIGH'} onChange={e => onChange({...action,config:{...cfg,severity:e.target.value}})} />
      </div>
    );
    case 'SEND_SLACK': return (
      <div className="space-y-2 mt-2">
        <Input placeholder="Slack webhook URL (leave blank to use first connected Slack integration)" value={cfg.webhookUrl ?? ''} onChange={e => onChange({...action,config:{...cfg,webhookUrl:e.target.value}})} />
        <Input placeholder="Message (use {{trigger}}, {{riskScore}}, {{summary}})" value={cfg.message ?? ''} onChange={e => onChange({...action,config:{...cfg,message:e.target.value}})} />
      </div>
    );
    case 'SEND_WEBHOOK': return (
      <Input className="mt-2" placeholder="Webhook URL (https://...)" value={cfg.url ?? ''} onChange={e => onChange({...action,config:{...cfg,url:e.target.value}})} />
    );
    case 'SEND_EMAIL': return (
      <div className="space-y-2 mt-2">
        <Input placeholder="To email address" value={cfg.to ?? ''} onChange={e => onChange({...action,config:{...cfg,to:e.target.value}})} />
        <Input placeholder="Subject (use {{trigger}}, {{riskLevel}})" value={cfg.subject ?? ''} onChange={e => onChange({...action,config:{...cfg,subject:e.target.value}})} />
      </div>
    );
    case 'AI_ANALYZE': return (
      <textarea placeholder="AI prompt (leave blank for default analysis)" value={cfg.prompt ?? ''} onChange={e => onChange({...action,config:{...cfg,prompt:e.target.value}})}
        rows={2} className="w-full mt-2 px-3 py-2 rounded-lg text-xs bg-[var(--bg3)] border border-[var(--border2)] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] outline-none focus:border-blue-500 resize-none" />
    );
    default: return null;
  }
}

function CreatePlaybookDialog({ orgId, onCreated, onClose }: { orgId:string; onCreated:()=>void; onClose:()=>void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [trigger, setTrigger] = useState('SCAN_CRITICAL');
  const [actions, setActions] = useState<any[]>([{ type: 'CREATE_INCIDENT', config: { title: 'Threat detected — {{scanType}} scan', severity: 'P2_HIGH', description: '{{summary}}' } }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function applyTemplate(t: any) {
    setName(t.name); setDescription(t.description);
    setTrigger(t.trigger); setActions(t.actions);
  }

  async function create() {
    if (!name.trim()) { setError('Name required'); return; }
    if (actions.length === 0) { setError('Add at least one action'); return; }
    setLoading(true); setError('');
    const res = await fetch('/api/playbooks', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ orgId, name, description, trigger, conditions:[], actions }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { setError(json.error?.message ?? 'Failed'); return; }
    onCreated();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="w-full max-w-2xl rounded-2xl shadow-2xl animate-fade-in overflow-y-auto max-h-[90vh]" style={{ background:'var(--card)', border:'1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-6 py-4 sticky top-0" style={{ background:'var(--card)', borderBottom:'1px solid var(--border)' }}>
          <h2 className="text-base font-bold text-[var(--text-primary)]">Create Playbook</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">✕</button>
        </div>
        <div className="p-6 space-y-5">
          {/* Templates */}
          <div>
            <p className="text-xs font-semibold mb-2" style={{color:'var(--text-muted)'}}>START FROM TEMPLATE</p>
            <div className="space-y-2">
              {TEMPLATES.map(t => (
                <button key={t.name} onClick={() => applyTemplate(t)}
                  className="w-full text-left p-3 rounded-xl transition-all hover:bg-blue-500/10"
                  style={{background:'var(--card)', border:'1px solid var(--border)'}}>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">{t.name}</p>
                  <p className="text-xs mt-0.5" style={{color:'var(--text-muted)'}}>{t.description}</p>
                </button>
              ))}
            </div>
          </div>
          <div style={{borderTop:'1px solid var(--border)', paddingTop:16}}>
            <Input label="Playbook name *" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Auto-escalate critical threats" />
          </div>
          <Select label="Trigger *" value={trigger} onChange={e => setTrigger(e.target.value)} options={TRIGGERS} />
          {/* Actions */}
          <div>
            <p className="text-xs font-semibold mb-2" style={{color:'var(--text-muted)'}}>ACTIONS (run in sequence)</p>
            <div className="space-y-3">
              {actions.map((action, i) => (
                <div key={i} className="rounded-xl p-3" style={{background:'var(--card)', border:'1px solid var(--border)'}}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold w-5 text-center" style={{color:'#3b82f6'}}>{i+1}</span>
                    <div className="flex-1">
                      <Select options={ACTION_TYPES} value={action.type}
                        onChange={e => setActions(prev => prev.map((a,j) => j===i ? {...a,type:e.target.value,config:{}} : a))} />
                    </div>
                    <button onClick={() => setActions(prev => prev.filter((_,j) => j!==i))} className="text-[var(--text-muted)] hover:text-red-400 flex-shrink-0"><Trash2 size={13} /></button>
                  </div>
                  <ActionConfigForm action={action} onChange={updated => setActions(prev => prev.map((a,j) => j===i ? updated : a))} />
                </div>
              ))}
              <button onClick={() => setActions(prev => [...prev, {type:'SEND_SLACK', config:{}}])}
                className="w-full py-2 rounded-xl text-xs text-blue-400 hover:text-blue-400 transition-colors flex items-center justify-center gap-1"
                style={{border:'1px dashed #2563eb'}}>
                <Plus size={12} /> Add action
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" loading={loading} onClick={create}>Create playbook</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlaybooksPage() {
  const { org } = useOrg();
  const [playbooks, setPlaybooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedRuns, setExpandedRuns] = useState<string | null>(null);
  const [runs, setRuns] = useState<Record<string,any[]>>({});

  async function fetchPlaybooks() {
    setLoading(true);
    const res = await fetch(`/api/playbooks?orgId=${org.id}`);
    const json = await res.json();
    if (json.data) setPlaybooks(json.data);
    setLoading(false);
  }

  useEffect(() => { fetchPlaybooks(); }, [org.id]);

  async function loadRuns(playbookId: string) {
    if (expandedRuns === playbookId) { setExpandedRuns(null); return; }
    setExpandedRuns(playbookId);
    if (!runs[playbookId]) {
      const res = await fetch(`/api/playbooks/${playbookId}/runs`);
      const json = await res.json();
      if (json.data) setRuns(prev => ({...prev, [playbookId]: json.data}));
    }
  }

  async function toggleActive(pb: any) {
    await fetch(`/api/playbooks/${pb.id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({isActive:!pb.isActive}) });
    fetchPlaybooks();
  }

  async function deletePlaybook(id: string) {
    if (!confirm('Delete this playbook?')) return;
    await fetch(`/api/playbooks/${id}`, { method:'DELETE' });
    fetchPlaybooks();
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <SectionHeader title="Playbooks" description="Automated security response rules — if threat detected, then take action"
        action={<Button icon={<Plus size={14}/>} onClick={() => setShowCreate(true)}>New playbook</Button>} />

      {/* How it works */}
      <div className="rounded-xl p-5" style={{background:'var(--card)', border:'1px solid var(--border)'}}>
        <p className="text-sm font-bold text-[var(--text-primary)] mb-3">How playbooks work</p>
        <div className="grid grid-cols-3 gap-3 animate-stagger">
          {[{icon:'⚡',t:'Trigger fires',d:'A scan or incident matches your trigger condition'},{icon:'🔍',t:'Conditions checked',d:'Additional filters narrow when the playbook runs'},{icon:'🎯',t:'Actions execute',d:'Create incidents, send Slack alerts, call webhooks automatically'}].map(s => (
            <div key={s.t} className="p-3 rounded-lg" style={{background:'var(--card)', border:'1px solid var(--border)'}}>
              <span className="text-xl">{s.icon}</span>
              <p className="text-xs font-semibold text-[var(--text-primary)] mt-2">{s.t}</p>
              <p className="text-xs mt-0.5" style={{color:'var(--text-muted)'}}>{s.d}</p>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({length:2}).map((_,i) => <Skeleton key={i} className="h-32 rounded-xl"/>)}</div>
      ) : playbooks.length === 0 ? (
        <div className="rounded-xl p-10 text-center" style={{background:'var(--card)', border:'1px dashed var(--border)'}}>
          <p className="text-4xl mb-3">⚡</p>
          <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">No playbooks yet</p>
          <p className="text-xs mb-4" style={{color:'var(--text-muted)'}}>Create a playbook to automate your security response</p>
          <Button size="sm" icon={<Plus size={13}/>} onClick={() => setShowCreate(true)}>Create first playbook</Button>
        </div>
      ) : (
        <div className="space-y-3 animate-stagger">
          {playbooks.map(pb => {
            const triggerLabel = TRIGGERS.find(t => t.value === pb.trigger)?.label ?? pb.trigger;
            const pbRuns = runs[pb.id] ?? [];
            const isExpanded = expandedRuns === pb.id;
            return (
              <div key={pb.id} className="rounded-xl overflow-hidden" style={{background:'var(--card)', border:`1px solid ${pb.isActive?'#2563eb':'var(--border)'}`}}>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-bold text-[var(--text-primary)]">{pb.name}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{background:pb.isActive?'rgba(16,185,129,0.15)':'rgba(100,116,139,0.15)',color:pb.isActive?'#10b981':'var(--text-muted)'}}>{pb.isActive?'Active':'Disabled'}</span>
                      </div>
                      <p className="text-xs" style={{color:'var(--text-muted)'}}>{triggerLabel}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => toggleActive(pb)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                        {pb.isActive ? <ToggleRight size={20} className="text-emerald-400"/> : <ToggleLeft size={20}/>}
                      </button>
                      <button onClick={() => deletePlaybook(pb.id)} className="text-[var(--text-muted)] hover:text-red-400 transition-colors"><Trash2 size={14}/></button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {(pb.actions as any[]).map((a:any,i:number) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{background:'var(--border)', color:'var(--text-secondary)', border:'1px solid var(--border2)'}}>
                        {ACTION_TYPES.find(at => at.value===a.type)?.label ?? a.type}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs" style={{color:'var(--text-faint)'}}>
                    <span>{pb.runCount} run{pb.runCount!==1?'s':''} · {pb.lastRunAt ? `Last: ${timeAgo(pb.lastRunAt)}` : 'Never run'}</span>
                    <button onClick={() => loadRuns(pb.id)} className="flex items-center gap-1 text-blue-400 hover:text-blue-400">
                      Run history {isExpanded ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <div style={{borderTop:'1px solid var(--border)'}}>
                    {pbRuns.length === 0 ? (
                      <p className="px-5 py-4 text-xs" style={{color:'var(--text-faint)'}}>No runs yet — this playbook fires automatically when the trigger condition is met.</p>
                    ) : pbRuns.map((run:any) => (
                      <div key={run.id} className="flex items-center gap-4 px-5 py-3" style={{borderBottom:'1px solid var(--border)'}}>
                        {run.status==='SUCCESS' ? <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0"/> : run.status==='PARTIAL' ? <CheckCircle2 size={14} className="text-amber-400 flex-shrink-0"/> : <XCircle size={14} className="text-red-400 flex-shrink-0"/>}
                        <div className="flex-1">
                          <p className="text-xs font-medium text-[var(--text-primary)]">{run.status} · {(run.results as any[]).length} action{(run.results as any[]).length!==1?'s':''}</p>
                          <p className="text-xs" style={{color:'var(--text-faint)'}}>{timeAgo(run.createdAt)} · {run.durationMs}ms</p>
                        </div>
                        <span className="text-xs font-mono" style={{color:'var(--text-muted)'}}>{run.triggerType}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {showCreate && <CreatePlaybookDialog orgId={org.id} onCreated={() => {setShowCreate(false); fetchPlaybooks();}} onClose={() => setShowCreate(false)}/>}
    </div>
  );
}
