"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Heart, MessageCircle, UserPlus, Bell } from "lucide-react";
import { supabase } from "../../lib/supabase";

type Notice={id:string;type:string;payload:any;created_at:string;read:boolean;actor:string;avatar:string};
export default function NotificationsPage(){
 const [items,setItems]=useState<Notice[]>([]);const [loading,setLoading]=useState(true);
 useEffect(()=>{(async()=>{if(!supabase)return;const {data:{session}}=await supabase.auth.getSession();if(!session){location.href="/auth";return}const {data}=await supabase.from("notifications").select("id,type,payload,read,created_at,actor_id").eq("user_id",session.user.id).order("created_at",{ascending:false}).limit(100);const actorIds=[...new Set((data||[]).map((x:any)=>x.actor_id).filter(Boolean))];const {data:ps}=actorIds.length?await supabase.from("profiles").select("id,display_name,username").in("id",actorIds):{data:[] as any[]};setItems((data||[]).map((n:any)=>{const p=ps?.find((x:any)=>x.id===n.actor_id);return{id:n.id,type:n.type,payload:n.payload||{},created_at:n.created_at,read:n.read,actor:p?.display_name||p?.username||"有人",avatar:(p?.display_name||p?.username||"星").slice(0,1)}}));setLoading(false)})();},[]);
 async function markAll(){if(!supabase)return;const {data:{session}}=await supabase.auth.getSession();if(!session)return;await supabase.from("notifications").update({read:true}).eq("user_id",session.user.id);setItems(x=>x.map(n=>({...n,read:true})))}
 return <main className="socialPage"><header className="socialHeader"><button onClick={()=>history.back()}><ArrowLeft/></button><h1>通知</h1><button onClick={markAll}>全部已读</button></header>{loading?<div className="emptyState">正在加载…</div>:items.length?<div className="noticeList">{items.map(n=><div className={n.read?"noticeRow":"noticeRow unreadNotice"} key={n.id}><div className="socialAvatar">{n.avatar}</div><div className="noticeBody"><div><b>{n.actor}</b>{textFor(n.type)}</div><small>{timeAgo(n.created_at)}</small>{n.payload?.content&&<p>{n.payload.content}</p>}</div><span className="noticeIcon">{n.type==="like"?<Heart size={20}/>:n.type==="comment"?<MessageCircle size={20}/>:n.type==="follow"?<UserPlus size={20}/>:<Bell size={20}/>}</span></div>)}</div>:<div className="emptyState"><Bell size={48}/><b>暂无通知</b><span>点赞、评论、关注和私信都会出现在这里</span></div>}</main>
}
function textFor(t:string){return t==="like"?" 赞了你的作品":t==="comment"?" 评论了你的作品":t==="follow"?" 关注了你":" 给你发来一条私信"}
function timeAgo(s:string){const m=Math.floor((Date.now()-new Date(s).getTime())/60000);if(m<1)return"刚刚";if(m<60)return`${m}分钟前`;const h=Math.floor(m/60);if(h<24)return`${h}小时前`;const d=Math.floor(h/24);return d<7?`${d}天前`:new Date(s).toLocaleDateString("zh-CN")}
