'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, Clock, ShieldAlert, Edit2, Check, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, Avatar, Skeleton, EmptyState, Divider } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui';
import { formatDateTime, timeAgo, cn } from '@/lib/utils';

const SEV_COLORS: Record<string,string> = {P1_CRITICAL:'text-red-400',P2_HIGH:'text-red-400',P3_MEDIUM:'text-amber-400',P4_LOW:'text-emerald-400'};
const STATUS_OPTS = [{value:'OPEN',label:'Open'},{value:'INVESTIGATING',label:'Investigating'},{value:'CONTAINED',label:'Contained'},{value:'RESOLVED',label:'Resolved'},{value:'CLOSED',label:'Closed'}];

export default function IncidentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const incidentId = params?.id as string;
  const slug = params?.slug as string;
  const [incident, setIncident] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  async function fetchIncident() {
    const res = await fetch(`/api/incidents/${incidentId}`);
    const json = await res.json();
    if(json.data){setIncident(json.data);setNewStatus(json.data.status);}
    setLoading(false);
  }

  useEffect(()=>{fetchIncident();},[incidentId]);

  async function addComment() {
    if(!comment.trim()||submitting) return;
    setSubmitting(true);
    const res = await fetch(`/api/incidents/${incidentId}/updates`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:comment})});
    if(res.ok){setComment('');fetchIncident();}
    setSubmitting(false);
  }

  async function updateStatus() {
    if(newStatus===incident.status){setEditingStatus(false);return;}
    const res = await fetch(`/api/incidents/${incidentId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:newStatus})});
    if(res.ok){setEditingStatus(false);fetchIncident();}
  }

  if(loading) return <div className="max-w-3xl space-y-6"><Skeleton className="h-8 w-48"/><Skeleton className="h-40 rounded-xl"/><Skeleton className="h-64 rounded-xl"/></div>;
  if(!incident) return <EmptyState icon={<ShieldAlert size={32}/>} title="Incident not found" action={<Button onClick={()=>router.back()}>Go back</Button>}/>;

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      <Button variant="ghost" size="sm" icon={<ArrowLeft size={14}/>} onClick={()=>router.push(`/org/${slug}/incidents`)}>Back to incidents</Button>

      <Card>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={cn('text-sm font-bold',SEV_COLORS[incident.severity])}>{incident.severity.replace('_',' ')}</span>
              {editingStatus?(
                <div className="flex items-center gap-2">
                  <div className="w-40"><Select options={STATUS_OPTS} value={newStatus} onChange={e=>setNewStatus(e.target.value)}/></div>
                  <button onClick={updateStatus} className="p-1 text-emerald-400 hover:text-emerald-400"><Check size={14}/></button>
                  <button onClick={()=>setEditingStatus(false)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X size={14}/></button>
                </div>
              ):(
                <button onClick={()=>setEditingStatus(true)} className="flex items-center gap-1 px-2 py-0.5 rounded-lg border border-[var(--border)] text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border2)] transition-colors">
                  {incident.status} <Edit2 size={10} className="ml-1"/>
                </button>
              )}
            </div>
            <h1 className="text-lg font-bold text-[var(--text-primary)]">{incident.title}</h1>
          </div>
        </div>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4 whitespace-pre-wrap">{incident.description}</p>
        <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] flex-wrap">
          <span className="flex items-center gap-1"><Clock size={11}/>Created {formatDateTime(incident.createdAt)}</span>
          {incident.resolvedAt&&<span>Resolved {formatDateTime(incident.resolvedAt)}</span>}
          {incident.assignedTo&&<span className="flex items-center gap-1.5 ml-auto"><Avatar name={incident.assignedTo.name} image={incident.assignedTo.image} size="sm"/>{incident.assignedTo.name??incident.assignedTo.email}</span>}
        </div>
      </Card>

      <Card padding={false}>
        <div className="px-5 py-3 border-b border-[var(--border)]">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Investigation Timeline <span className="text-[var(--text-muted)] font-normal">({incident.updates?.length??0})</span></p>
        </div>
        {incident.updates?.length===0?(
          <div className="p-8 text-center text-[var(--text-muted)] text-sm">No updates yet — add the first comment below.</div>
        ):(
          <div className="px-5 py-4 space-y-4">
            {incident.updates?.map((u:any,i:number)=>(
              <div key={u.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <Avatar name={u.author?.name} image={u.author?.image} size="sm" className="flex-shrink-0"/>
                  {i<incident.updates.length-1&&<div className="w-px flex-1 bg-[var(--border)] mt-2"/>}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-[var(--text-primary)]">{u.author?.name??u.author?.email}</span>
                    <span className="text-xs text-[var(--text-faint)]">{timeAgo(u.createdAt)}</span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{u.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        <Divider/>
        <div className="px-5 py-4 space-y-3">
          <textarea value={comment} onChange={e=>setComment(e.target.value)} placeholder="Add an investigation update, containment steps, or notes..." rows={3}
            className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--bg3)] border border-[var(--border2)] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-y"
            onKeyDown={e=>{if(e.key==='Enter'&&e.ctrlKey)addComment();}}/>
          <div className="flex items-center justify-between">
            <p className="text-xs text-[var(--text-faint)]">Ctrl+Enter to submit</p>
            <Button size="sm" icon={<Send size={13}/>} onClick={addComment} loading={submitting} disabled={!comment.trim()}>Add update</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
