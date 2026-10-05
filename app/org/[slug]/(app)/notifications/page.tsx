'use client';
import { useEffect, useState } from 'react';
import { useOrg } from '@/components/layout/OrgProvider';
import { useRouter } from 'next/navigation';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { Card, SectionHeader, Badge, EmptyState, Skeleton } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { timeAgo, cn } from '@/lib/utils';

const ICONS: Record<string,string> = {SCAN_COMPLETE:'🔍',THREAT_DETECTED:'🚨',INCIDENT_CREATED:'⚠️',INCIDENT_UPDATED:'📋',PLAN_EXPIRING:'⏰',USAGE_LIMIT_WARNING:'📊',TEAM_INVITE:'👥',CLOUD_ISSUE_FOUND:'☁️',WEEKLY_REPORT:'📈',MEMBER_JOINED:'👤',API_KEY_CREATED:'🔑'};
const SEV_BORDERS: Record<string,string> = {CRITICAL:'border-l-red-500',HIGH:'border-l-orange-500',MEDIUM:'border-l-amber-500',LOW:'border-l-emerald-500',SAFE:'border-l-emerald-500'};

export default function NotificationsPage() {
  const {org} = useOrg();
  const router = useRouter();
  const [notifications,setNotifications]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [unreadOnly,setUnreadOnly]=useState(false);
  const [markingAll,setMarkingAll]=useState(false);

  async function fetchNotifications() {
    setLoading(true);
    const p=new URLSearchParams({orgId:org.id,limit:'50'});
    if(unreadOnly) p.append('unread','true');
    const res=await fetch(`/api/notifications?${p}`);
    const json=await res.json();
    if(json.data) setNotifications(json.data.notifications??[]);
    setLoading(false);
  }

  useEffect(()=>{fetchNotifications();},[org.id,unreadOnly]);

  async function markRead(notifId:string,isUnread:boolean) {
    if(!isUnread) return;
    await fetch(`/api/notifications/${notifId}/read`,{method:'POST'});
    setNotifications(prev=>prev.map(n=>n.notification?.id===notifId?{...n,readAt:new Date().toISOString()}:n));
  }

  async function markAllRead() {
    setMarkingAll(true);
    await fetch(`/api/notifications/read-all?orgId=${org.id}`,{method:'POST'});
    setNotifications(prev=>prev.map(n=>({...n,readAt:n.readAt??new Date().toISOString()})));
    setMarkingAll(false);
  }

  const unreadCount = notifications.filter(n=>!n.readAt).length;

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      <SectionHeader title="Notification Center"
        description={unreadCount>0?`${unreadCount} unread notification${unreadCount!==1?'s':''}`:'All caught up'}
        action={unreadCount>0&&<Button variant="secondary" size="sm" icon={<CheckCheck size={14}/>} loading={markingAll} onClick={markAllRead}>Mark all read</Button>}/>

      <div className="flex items-center gap-3">
        <Button variant={unreadOnly?'primary':'secondary'} size="sm" onClick={()=>setUnreadOnly(v=>!v)}>
          {unreadOnly?'Showing unread':'Show unread only'}
        </Button>
        <p className="text-xs text-[var(--text-muted)] ml-auto">{notifications.length} notification{notifications.length!==1?'s':''}</p>
      </div>

      <Card padding={false}>
        {loading?(
          <div className="p-5 space-y-4">{Array.from({length:5}).map((_,i)=><div key={i} className="flex items-start gap-4"><Skeleton className="w-8 h-8 rounded-lg flex-shrink-0"/><div className="flex-1 space-y-2"><Skeleton className="h-4 w-48"/><Skeleton className="h-3 w-64"/><Skeleton className="h-3 w-20"/></div></div>)}</div>
        ):notifications.length===0?(
          <EmptyState icon={<Bell size={32}/>} title={unreadOnly?'No unread notifications':'No notifications yet'}
            description={unreadOnly?'Switch off the filter to see all notifications.':'Security events and alerts will appear here.'}
            action={unreadOnly?<Button size="sm" variant="secondary" onClick={()=>setUnreadOnly(false)}>Show all</Button>:undefined}/>
        ):(
          <div className="divide-y divide-[var(--border)]">
            {notifications.map(un=>{
              const n=un.notification;
              if(!n) return null;
              const isUnread=!un.readAt;
              const borderColor=n.severity?SEV_BORDERS[n.severity]:'border-l-transparent';
              return (
                <div key={un.id}
                  className={cn('flex items-start gap-4 px-5 py-4 border-l-2 cursor-pointer hover:bg-[var(--card2)] transition-all',borderColor,isUnread&&'bg-blue-500/5')}
                  onClick={()=>{markRead(n.id,isUnread);if(n.actionUrl)router.push(`/org/${org.slug}${n.actionUrl}`);}}>
                  <span className="text-xl flex-shrink-0 mt-0.5">{ICONS[n.type]??'🔔'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn('text-sm font-medium',isUnread?'text-[var(--text-primary)]':'text-[var(--text-secondary)]')}>{n.title}</p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isUnread&&<span className="w-2 h-2 rounded-full bg-blue-400"/>}
                        {n.severity&&<Badge variant={n.severity==='CRITICAL'?'danger':n.severity==='HIGH'?'warning':'success'} className="text-xs">{n.severity}</Badge>}
                      </div>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">{n.message}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-[var(--text-faint)]">{timeAgo(n.createdAt)}</span>
                      {n.actionUrl&&<span className="text-xs text-blue-400">View →</span>}
                      {isUnread&&<button className="text-xs text-[var(--text-faint)] hover:text-[var(--text-muted)] ml-auto flex items-center gap-1" onClick={e=>{e.stopPropagation();markRead(n.id,true);}}>
                        <Check size={10}/> Mark read
                      </button>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
