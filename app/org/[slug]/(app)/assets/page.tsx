'use client';
import { useEffect, useState } from 'react';
import { useOrg } from '@/components/layout/OrgProvider';
import { Database, Plus, ChevronDown, Tag, Globe, Server, Cpu, Cloud, Mail, Layers } from 'lucide-react';
import { Card, SectionHeader, EmptyState, Skeleton } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui';
import { timeAgo, cn, RISK_COLORS } from '@/lib/utils';

const TC: Record<string,{label:string;icon:React.ElementType;color:string}> = {
  DOMAIN:{label:'Domain',icon:Globe,color:'#3b82f6'}, IP_ADDRESS:{label:'IP Address',icon:Server,color:'#6366f1'},
  SERVER:{label:'Server',icon:Server,color:'#8b5cf6'}, ENDPOINT:{label:'Endpoint',icon:Cpu,color:'#06b6d4'},
  CLOUD_RESOURCE:{label:'Cloud Resource',icon:Cloud,color:'#10b981'}, EMAIL_ACCOUNT:{label:'Email Account',icon:Mail,color:'#f59e0b'},
  APPLICATION:{label:'Application',icon:Layers,color:'#ec4899'},
};

function CreateAssetDialog({orgId,onCreated,onClose}:{orgId:string;onCreated:()=>void;onClose:()=>void}) {
  const [name,setName]=useState(''); const [value,setValue]=useState(''); const [type,setType]=useState('DOMAIN');
  const [tagsInput,setTagsInput]=useState(''); const [loading,setLoading]=useState(false); const [error,setError]=useState('');

  async function handleCreate() {
    if(!name.trim()||!value.trim()){setError('Name and value are required');return;}
    setLoading(true); setError('');
    const tags = tagsInput.split(',').map(t=>t.trim()).filter(Boolean).slice(0,20);
    const res = await fetch('/api/assets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({orgId,type,name,value,tags})});
    const json = await res.json();
    setLoading(false);
    if(!res.ok){setError(json.error?.message??'Failed to create asset');return;}
    onCreated();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg2)] shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Add asset</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <Select label="Asset type" value={type} onChange={e=>setType(e.target.value)} options={Object.entries(TC).map(([v,c])=>({value:v,label:c.label}))}/>
          <Input label="Name" placeholder="e.g. Production API Server" value={name} onChange={e=>setName(e.target.value)}/>
          <Input label="Value" placeholder="e.g. api.company.com or 192.168.1.1" value={value} onChange={e=>setValue(e.target.value)}/>
          <Input label="Tags (comma-separated)" placeholder="production, critical, external" value={tagsInput} onChange={e=>setTagsInput(e.target.value)} leftIcon={<Tag size={13}/>}/>
          {error&&<p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" loading={loading} onClick={handleCreate}>Add asset</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AssetsPage() {
  const {org,canManage} = useOrg();
  const [assets,setAssets]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [showCreate,setShowCreate]=useState(false);
  const [typeFilter,setTypeFilter]=useState('');
  const [hasMore,setHasMore]=useState(false);
  const [cursor,setCursor]=useState<string|undefined>();

  async function fetchAssets(reset=true) {
    if(reset) setLoading(true);
    const p=new URLSearchParams({orgId:org.id,limit:'20'});
    if(typeFilter) p.append('type',typeFilter);
    if(!reset&&cursor) p.append('cursor',cursor);
    const res=await fetch(`/api/assets?${p}`);
    const json=await res.json();
    if(json.data){
      const{items,hasMore:more}=json.data;
      if(reset) setAssets(items); else setAssets(p=>[...p,...items]);
      setHasMore(more);
      if(items.length>0) setCursor(items[items.length-1].createdAt);
    }
    setLoading(false);
  }

  useEffect(()=>{setCursor(undefined);fetchAssets(true);},[org.id,typeFilter]);

  async function deleteAsset(id:string) {
    if(!confirm('Delete this asset?')) return;
    await fetch(`/api/assets/${id}`,{method:'DELETE'});
    fetchAssets();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader title="Asset Inventory" description={`${assets.length} asset${assets.length!==1?'s':''} tracked`}
        action={<Button icon={<Plus size={14}/>} onClick={()=>setShowCreate(true)}>Add asset</Button>}/>

      <div className="flex items-center gap-3">
        <div className="w-48"><Select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}
          options={[{value:'',label:'All types'},...Object.entries(TC).map(([v,c])=>({value:v,label:c.label}))]}/></div>
        {typeFilter&&<Button variant="ghost" size="sm" onClick={()=>setTypeFilter('')}>Clear</Button>}
      </div>

      <Card padding={false}>
        {loading?(
          <div className="p-5 space-y-4">{Array.from({length:5}).map((_,i)=><div key={i} className="flex items-center gap-4"><Skeleton className="w-9 h-9 rounded-lg"/><div className="flex-1 space-y-2"><Skeleton className="h-4 w-40"/><Skeleton className="h-3 w-28"/></div></div>)}</div>
        ):assets.length===0?(
          <EmptyState icon={<Database size={32}/>} title="No assets tracked" description="Add domains, IPs, servers, and other assets to monitor your attack surface."
            action={<Button size="sm" icon={<Plus size={14}/>} onClick={()=>setShowCreate(true)}>Add first asset</Button>}/>
        ):(
          <>
            <div className="hidden sm:grid grid-cols-12 px-5 py-2.5 border-b border-[var(--border)] text-xs font-semibold text-[var(--text-faint)] uppercase tracking-wider">
              <div className="col-span-1">Type</div><div className="col-span-4 pl-3">Name</div><div className="col-span-4">Value</div><div className="col-span-2">Risk</div><div className="col-span-1">Scanned</div>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {assets.map(asset=>{
                const tc=TC[asset.type]??TC['DOMAIN'];
                const Icon=tc.icon;
                const rc=asset.riskScore!==null?(asset.riskScore>=66?RISK_COLORS['HIGH']:asset.riskScore>=41?RISK_COLORS['MEDIUM']:RISK_COLORS['SAFE']):null;
                return (
                  <div key={asset.id} className="group grid grid-cols-12 items-center px-5 py-3.5 hover:bg-[var(--card2)] transition-colors">
                    <div className="col-span-1">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{background:`${tc.color}18`,border:`1px solid ${tc.color}25`}}>
                        <Icon size={14} style={{color:tc.color}}/>
                      </div>
                    </div>
                    <div className="col-span-4 pl-3">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{asset.name}</p>
                      {asset.tags.length>0&&<div className="flex gap-1 mt-1 flex-wrap">{asset.tags.slice(0,3).map((t:string)=><span key={t} className="text-xs px-1.5 py-0.5 rounded bg-[var(--bg3)] text-[var(--text-faint)]">{t}</span>)}</div>}
                    </div>
                    <div className="col-span-4"><p className="text-xs font-mono text-[var(--text-muted)] truncate">{asset.value}</p></div>
                    <div className="col-span-2">
                      {rc?<span className={cn('text-xs font-bold',rc.text)}>{asset.riskScore}/100</span>:<span className="text-xs text-[var(--text-faint)]">—</span>}
                    </div>
                    <div className="col-span-1 flex items-center justify-between">
                      <span className="text-xs text-[var(--text-faint)]">{asset.lastScannedAt?timeAgo(asset.lastScannedAt):'—'}</span>
                      {canManage&&<button onClick={()=>deleteAsset(asset.id)} className="text-[var(--text-faint)] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-xs ml-1">✕</button>}
                    </div>
                  </div>
                );
              })}
            </div>
            {hasMore&&<div className="flex justify-center p-4 border-t border-[var(--border)]"><Button variant="secondary" size="sm" onClick={()=>fetchAssets(false)} iconRight={<ChevronDown size={14}/>}>Load more</Button></div>}
          </>
        )}
      </Card>

      {showCreate&&<CreateAssetDialog orgId={org.id} onCreated={()=>{setShowCreate(false);fetchAssets();}} onClose={()=>setShowCreate(false)}/>}
    </div>
  );
}
