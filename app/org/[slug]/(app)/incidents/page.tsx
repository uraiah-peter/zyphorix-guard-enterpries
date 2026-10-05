'use client';
import { useEffect, useState } from 'react';
import { useOrg } from '@/components/layout/OrgProvider';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Plus, ChevronDown, User } from 'lucide-react';
import { Card, SectionHeader, EmptyState, Skeleton, Avatar } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui';
import { timeAgo, cn } from '@/lib/utils';
import { CreateIncidentDialog } from '@/components/incidents/CreateIncidentDialog';

const SEV: Record<string,{label:string;color:string;bg:string;border:string}> = {
  P1_CRITICAL:{label:'P1 Critical',color:'text-red-400',   bg:'bg-red-700/15',    border:'border-red-600/40'},
  P2_HIGH:    {label:'P2 High',    color:'text-red-400',   bg:'bg-red-500/10',    border:'border-red-500/30'},
  P3_MEDIUM:  {label:'P3 Medium',  color:'text-amber-400', bg:'bg-amber-500/10',  border:'border-amber-500/30'},
  P4_LOW:     {label:'P4 Low',     color:'text-emerald-400',bg:'bg-emerald-500/10',border:'border-emerald-500/30'},
};
const STATUS: Record<string,{label:string;color:string}> = {
  OPEN:{label:'Open',color:'text-red-400'}, INVESTIGATING:{label:'Investigating',color:'text-amber-400'},
  CONTAINED:{label:'Contained',color:'text-blue-400'}, RESOLVED:{label:'Resolved',color:'text-emerald-400'},
  CLOSED:{label:'Closed',color:'text-[var(--text-muted)]'},
};

function SevBadge({severity}:{severity:string}) {
  const c = SEV[severity] ?? SEV['P4_LOW'];
  return <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border',c.bg,c.color,c.border)}>{c.label}</span>;
}

export default function IncidentsPage() {
  const {org} = useOrg();
  const router = useRouter();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string|undefined>();
  const [loadingMore, setLoadingMore] = useState(false);

  async function fetchIncidents(reset=true) {
    if(reset) setLoading(true); else setLoadingMore(true);
    const p = new URLSearchParams({orgId:org.id,limit:'20'});
    if(statusFilter) p.append('status',statusFilter);
    if(severityFilter) p.append('severity',severityFilter);
    if(!reset&&cursor) p.append('cursor',cursor);
    const res = await fetch(`/api/incidents?${p}`);
    const json = await res.json();
    if(json.data) {
      const {items,hasMore:more} = json.data;
      if(reset) setIncidents(items); else setIncidents(p=>[...p,...items]);
      setHasMore(more);
      if(items.length>0) setCursor(items[items.length-1].createdAt);
    }
    setLoading(false); setLoadingMore(false);
  }

  useEffect(()=>{setCursor(undefined);fetchIncidents(true);},[org.id,statusFilter,severityFilter]);

  const counts = incidents.reduce((a,i)=>{a[i.status]=(a[i.status]??0)+1;return a;},{} as Record<string,number>);
  const active = incidents.filter(i=>!['RESOLVED','CLOSED'].includes(i.status)).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader title="Incident Management" description={`${active} active incident${active!==1?'s':''}`}
        action={<Button icon={<Plus size={14}/>} onClick={()=>setShowCreate(true)}>New incident</Button>} />

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-stagger">
        {[{label:'Open',key:'OPEN',color:'#ef4444'},{label:'Investigating',key:'INVESTIGATING',color:'#f59e0b'},{label:'Contained',key:'CONTAINED',color:'#3b82f6'},{label:'Resolved',key:'RESOLVED',color:'#10b981'}].map(s=>(
          <button key={s.key} onClick={()=>setStatusFilter(statusFilter===s.key?'':s.key)}
            className="card-lift p-3 rounded-xl border text-left transition-all"
            style={{borderColor:`${s.color}30`,background:statusFilter===s.key?`${s.color}10`:'var(--card)'}}>
            <p className="text-2xl font-black" style={{color:s.color}}>{counts[s.key]??0}</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-44"><Select options={[{value:'',label:'All statuses'},{value:'OPEN',label:'Open'},{value:'INVESTIGATING',label:'Investigating'},{value:'CONTAINED',label:'Contained'},{value:'RESOLVED',label:'Resolved'},{value:'CLOSED',label:'Closed'}]} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} /></div>
        <div className="w-44"><Select options={[{value:'',label:'All severities'},{value:'P1_CRITICAL',label:'P1 Critical'},{value:'P2_HIGH',label:'P2 High'},{value:'P3_MEDIUM',label:'P3 Medium'},{value:'P4_LOW',label:'P4 Low'}]} value={severityFilter} onChange={e=>setSeverityFilter(e.target.value)} /></div>
        {(statusFilter||severityFilter)&&<Button variant="ghost" size="sm" onClick={()=>{setStatusFilter('');setSeverityFilter('');}}>Clear</Button>}
      </div>

      <Card padding={false}>
        {loading?(
          <div className="p-5 space-y-4">{Array.from({length:4}).map((_,i)=><div key={i} className="flex items-center gap-4"><Skeleton className="w-8 h-8 rounded-lg"/><div className="flex-1 space-y-2"><Skeleton className="h-4 w-56"/><Skeleton className="h-3 w-32"/></div></div>)}</div>
        ):incidents.length===0?(
          <EmptyState icon={<ShieldAlert size={32}/>} title="No incidents" description="Create an incident to track and manage security events."
            action={<Button size="sm" icon={<Plus size={14}/>} onClick={()=>setShowCreate(true)}>Create first incident</Button>} />
        ):(
          <>
            <div className="divide-y divide-[var(--border)]">
              {incidents.map(inc=>{
                const sc = STATUS[inc.status]??STATUS['OPEN'];
                return (
                  <button key={inc.id} onClick={()=>router.push(`/org/${org.slug}/incidents/${inc.id}`)}
                    className="w-full flex items-start gap-4 px-5 py-4 hover:bg-[var(--card2)] transition-colors text-left">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <SevBadge severity={inc.severity}/>
                        <span className={cn('text-xs font-medium',sc.color)}>{sc.label}</span>
                      </div>
                      <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{inc.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-muted)]">
                        <span>{timeAgo(inc.createdAt)}</span>
                        <span>{inc._count?.updates??0} update{inc._count?.updates!==1?'s':''}</span>
                        {inc.assignedTo&&<span className="flex items-center gap-1"><User size={10}/>{inc.assignedTo.name??inc.assignedTo.email}</span>}
                      </div>
                    </div>
                    {inc.assignedTo&&<Avatar name={inc.assignedTo.name} image={inc.assignedTo.image} size="sm" className="flex-shrink-0 mt-1"/>}
                  </button>
                );
              })}
            </div>
            {hasMore&&<div className="flex justify-center p-4 border-t border-[var(--border)]"><Button variant="secondary" size="sm" loading={loadingMore} onClick={()=>fetchIncidents(false)} iconRight={<ChevronDown size={14}/>}>Load more</Button></div>}
          </>
        )}
      </Card>

      {showCreate&&<CreateIncidentDialog orgId={org.id} onCreated={()=>{setShowCreate(false);fetchIncidents();}} onClose={()=>setShowCreate(false)}/>}
    </div>
  );
}
