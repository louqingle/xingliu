"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Heart, MessageCircle, Share2, Search, Volume2, VolumeX, Home as HomeIcon, Users, Plus, Inbox, UserRound, Bookmark, X, Play, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabase";

type Video={id:string;src:string;username:string;title:string;music:string;likes:number;comments:number;avatar:string;avatarUrl:string|null;userId:string;createdAt:string};
type Comment={id:string;content:string;created_at:string;user_id:string;username:string;avatar_url:string|null};
const fmt=(n:number)=>n>=1000000?`${(n/1000000).toFixed(1)}M`:n>=10000?`${(n/10000).toFixed(1)}万`:n>=1000?`${(n/1000).toFixed(1)}K`:String(n);

export default function Home(){
 const router=useRouter();
 const feed=useRef<HTMLDivElement>(null);const players=useRef<Record<string,HTMLVideoElement|null>>({});const watchVideo=useRef<string|null>(null);const watchStarted=useRef(Date.now());
 const [videos,setVideos]=useState<Video[]>([]),[index,setIndex]=useState(0),[muted,setMuted]=useState(true),[liked,setLiked]=useState<string[]>([]),[saved,setSaved]=useState<string[]>([]),[following,setFollowing]=useState<string[]>([]),[uid,setUid]=useState<string|null>(null),[tab,setTab]=useState<"推荐"|"关注">("推荐"),[search,setSearch]=useState(false),[q,setQ]=useState(""),[toast,setToast]=useState(""),[loading,setLoading]=useState(true),[feedError,setFeedError]=useState(""),[commentVideo,setCommentVideo]=useState<Video|null>(null),[comments,setComments]=useState<Comment[]>([]),[commentText,setCommentText]=useState(""),[commentLoading,setCommentLoading]=useState(false),[commentSending,setCommentSending]=useState(false);

 const loadFeed=useCallback(async(user:string|null)=>{
  if(!supabase)return;
  setLoading(true);setFeedError("");
  const base=await supabase.from("videos").select("id,url,title,music,like_count,comment_count,user_id,created_at").eq("status","published").order("created_at",{ascending:false}).limit(100);
  if(base.error){setFeedError(base.error.message);setVideos([]);setLoading(false);return;}
  const rows=base.data||[];
  const ids=[...new Set(rows.map((v:any)=>v.user_id))];
  let profiles:any[]=[];
  if(ids.length){const p=await supabase.from("profiles").select("id,username,nickname,avatar_url").in("id",ids);if(p.error){setFeedError(p.error.message);setVideos([]);setLoading(false);return;}profiles=p.data||[];}
  const mapped=rows.map((v:any)=>{const p=profiles.find(x=>x.id===v.user_id);const name=p?.username||p?.nickname||"星流用户";return{id:v.id,src:v.url,title:v.title||"分享一个瞬间",music:v.music||"原创音乐 · 星流",username:name,likes:v.like_count||0,comments:v.comment_count||0,avatar:(name||"星").slice(0,1),avatarUrl:p?.avatar_url||null,userId:v.user_id,createdAt:v.created_at};});
  setVideos(mapped);
  if(user){
   const [l,f,s]=await Promise.all([
    supabase.from("likes").select("video_id").eq("user_id",user),
    supabase.from("follows").select("following_id").eq("follower_id",user),
    supabase.from("saved_videos").select("video_id").eq("user_id",user)
   ]);
   setLiked((l.data||[]).map((x:any)=>x.video_id));
   setFollowing((f.data||[]).map((x:any)=>x.following_id));
   setSaved((s.data||[]).map((x:any)=>x.video_id));
  } else { setLiked([]);setFollowing([]);setSaved([]); }
  setLoading(false);
 },[]);

 useEffect(()=>{let alive=true;(async()=>{if(!supabase)return;const {data:{session}}=await supabase.auth.getSession();if(!alive)return;const id=session?.user.id||null;setUid(id);await loadFeed(id);})();return()=>{alive=false}},[loadFeed]);
 useEffect(()=>{if(!supabase)return;const {data:sub}=supabase.auth.onAuthStateChange((_e,s)=>{const id=s?.user.id||null;setUid(id);void loadFeed(id)});return()=>sub.subscription.unsubscribe()},[loadFeed]);
 const list=useMemo(()=>{const base=tab==="关注"?videos.filter(v=>following.includes(v.userId)):videos;if(tab==="关注")return base;const hours=(date:string)=>Math.max(0,(Date.now()-new Date(date).getTime())/3600000);const score=(v:Video)=>v.likes*2.2+v.comments*3.5+Math.max(0,72-hours(v.createdAt))*1.2+(following.includes(v.userId)?10:0);return [...base].sort((a,b)=>score(b)-score(a));},[tab,videos,following]);
 const active=list[index]||list[0];
 useEffect(()=>{setIndex(0);feed.current?.scrollTo({top:0,behavior:"auto"})},[tab]);
 useEffect(()=>{const el=feed.current;if(!el)return;let raf=0;const onScroll=()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;const h=el.clientHeight||innerHeight;const i=Math.max(0,Math.min(Math.max(list.length-1,0),Math.round(el.scrollTop/h)));setIndex(x=>x===i?x:i)})};el.addEventListener("scroll",onScroll,{passive:true});return()=>{el.removeEventListener("scroll",onScroll);if(raf)cancelAnimationFrame(raf)}},[list.length]);
 useEffect(()=>{Object.entries(players.current).forEach(([id,v])=>{if(!v)return;v.muted=muted;if(id===active?.id)v.play().catch(()=>{});else v.pause()})},[active?.id,muted]);
 useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(""),1800);return()=>clearTimeout(t)},[toast]);
 useEffect(()=>{if(!active?.id||!supabase||!uid)return;const now=Date.now();if(watchVideo.current&&watchVideo.current!==active.id){const ms=Math.max(0,now-watchStarted.current);if(ms>500)void supabase.from("video_events").insert({user_id:uid,video_id:watchVideo.current,event_type:"watch",watch_ms:ms});}watchVideo.current=active.id;watchStarted.current=now;void supabase.from("video_events").insert({user_id:uid,video_id:active.id,event_type:"impression"});},[active?.id,uid]);
 function login(){setToast("请先登录星流账号");setTimeout(()=>router.push("/auth"),400)}
 async function event(type:string,id=active?.id){if(supabase&&uid&&id)void supabase.from("video_events").insert({user_id:uid,video_id:id,event_type:type})}
 async function like(v:Video){if(!uid){login();return}const on=liked.includes(v.id);setLiked(x=>on?x.filter(i=>i!==v.id):[...x,v.id]);setVideos(x=>x.map(a=>a.id===v.id?{...a,likes:Math.max(0,a.likes+(on?-1:1))}:a));if(supabase){const r=on?await supabase.from("likes").delete().eq("user_id",uid).eq("video_id",v.id):await supabase.from("likes").insert({user_id:uid,video_id:v.id});if(r.error){setLiked(x=>on?[...x,v.id]:x.filter(i=>i!==v.id));setVideos(x=>x.map(a=>a.id===v.id?{...a,likes:Math.max(0,a.likes+(on?1:-1))}:a));setToast("点赞失败："+r.error.message);return}}void event(on?"unlike":"like",v.id)}
 async function follow(v:Video){if(!uid){login();return}if(v.userId===uid)return;const on=following.includes(v.userId);setFollowing(x=>on?x.filter(i=>i!==v.userId):[...x,v.userId]);if(supabase){const r=on?await supabase.from("follows").delete().eq("follower_id",uid).eq("following_id",v.userId):await supabase.from("follows").insert({follower_id:uid,following_id:v.userId});if(r.error){setFollowing(x=>on?[...x,v.userId]:x.filter(i=>i!==v.userId));setToast("关注失败："+r.error.message);return}}void event(on?"unfollow":"follow",v.id)}
 async function save(v:Video){if(!uid){login();return}const on=saved.includes(v.id);setSaved(x=>on?x.filter(i=>i!==v.id):[...x,v.id]);if(supabase){const r=on?await supabase.from("saved_videos").delete().eq("user_id",uid).eq("video_id",v.id):await supabase.from("saved_videos").insert({user_id:uid,video_id:v.id});if(r.error){setSaved(x=>on?[...x,v.id]:x.filter(i=>i!==v.id));setToast("收藏失败："+r.error.message);return}}void event(on?"unsave":"save",v.id);setToast(on?"已取消收藏":"已收藏")}
 async function openComments(v:Video){if(!uid){login();return}setCommentVideo(v);setCommentText("");setCommentLoading(true);if(!supabase){setCommentLoading(false);return}const r=await supabase.from("comments").select("id,content,created_at,user_id").eq("video_id",v.id).order("created_at",{ascending:false}).limit(100);if(r.error){setToast("评论加载失败："+r.error.message);setComments([]);setCommentLoading(false);return}const rows=r.data||[];const ids=[...new Set(rows.map((x:any)=>x.user_id))];let profiles:any[]=[];if(ids.length){const p=await supabase.from("profiles").select("id,username,nickname,avatar_url").in("id",ids);profiles=p.data||[]}setComments(rows.map((x:any)=>{const p=profiles.find(z=>z.id===x.user_id);return{id:x.id,content:x.content,created_at:x.created_at,user_id:x.user_id,username:p?.username||p?.nickname||"星流用户",avatar_url:p?.avatar_url||null}}));setCommentLoading(false)}
 async function submitComment(e:FormEvent){e.preventDefault();const text=commentText.trim();if(!text||!commentVideo||!uid||!supabase||commentSending)return;setCommentSending(true);const r=await supabase.from("comments").insert({video_id:commentVideo.id,user_id:uid,content:text});if(r.error){setToast("评论失败："+r.error.message);setCommentSending(false);return}setCommentText("");setVideos(x=>x.map(v=>v.id===commentVideo.id?{...v,comments:v.comments+1}:v));void event("comment",commentVideo.id);setCommentSending(false);await openComments(commentVideo);setToast("评论成功")}
 function jump(i:number){feed.current?.scrollTo({top:i*(feed.current?.clientHeight||innerHeight),behavior:"smooth"})}
 const results=useMemo(()=>list.filter(v=>!q||`${v.username} ${v.title} ${v.music}`.toLowerCase().includes(q.toLowerCase())).slice(0,20),[list,q]);
 return <main className="app">
  <div className="topbar"><div className="tabs"><button className={`tab ${tab==="推荐"?"active":""}`} onClick={()=>setTab("推荐")}>推荐</button><button className={`tab ${tab==="关注"?"active":""}`} onClick={()=>setTab("关注")}>关注</button></div><button className="iconBtn" onClick={()=>setSearch(true)}><Search size={22}/></button></div>
  <div className="feed" ref={feed}>
   {loading?<section className="page" style={{display:"grid",placeItems:"center"}}><div style={{color:"#aaa"}}>正在加载星流…</div></section>:feedError?<section className="page" style={{display:"grid",placeItems:"center",padding:30}}><div style={{textAlign:"center"}}><h3>首页加载失败</h3><p style={{color:"#999",fontSize:13}}>{feedError}</p><button className="publish" onClick={()=>loadFeed(uid)}>重试</button></div></section>:list.length===0?<section className="page" style={{display:"grid",placeItems:"center",padding:30}}><div style={{textAlign:"center",color:"#999"}}><Users size={46}/><h3 style={{color:"#fff"}}>{tab==="关注"?"还没有关注内容":"还没有作品"}</h3><p>{tab==="关注"?"去推荐里发现喜欢的创作者":"发布你的第一个作品吧"}</p><button className="publish" onClick={()=>tab==="关注"?setTab("推荐"):router.push("/upload")}>{tab==="关注"?"去推荐":"发布作品"}</button></div></section>:list.map((v,i)=>{const near=Math.abs(i-index)<=1,isLike=liked.includes(v.id),isSave=saved.includes(v.id),isFollow=following.includes(v.userId);return <section className="page" key={v.id}>
    {near?<video ref={el=>{players.current[v.id]=el}} className="video" src={v.src} playsInline muted={muted} preload={i===index?"auto":"metadata"} onClick={()=>{const el=players.current[v.id];if(!el)return;if(el.paused)el.play().catch(()=>{});else el.pause()}} onDoubleClick={()=>like(v)} onEnded={()=>{if(i<list.length-1)jump(i+1)}}/>:<div className="video" style={{background:"#111"}}/>}
    <div className="shade top"/><div className="shade bottom"/><button className="sound" onClick={()=>setMuted(x=>!x)}>{muted?<VolumeX size={20}/>:<Volume2 size={20}/>}</button>
    <div className="actions"><button className="action" onClick={()=>like(v)}><span className={`circle ${isLike?"like on":""}`}><Heart size={27} fill={isLike?"currentColor":"none"}/></span><b>{fmt(v.likes)}</b></button><button className="action" onClick={()=>openComments(v)}><span className="circle"><MessageCircle size={27}/></span><b>{fmt(v.comments)}</b></button><button className="action" onClick={()=>save(v)}><span className={`circle ${isSave?"saved":""}`}><Bookmark size={25} fill={isSave?"currentColor":"none"}/></span><b>{isSave?"已收藏":"收藏"}</b></button><button className="action" onClick={async()=>{void event("share",v.id);const url=`${location.origin}/video/${v.id}`;if(navigator.share)await navigator.share({title:v.title,url}).catch(()=>{});else{await navigator.clipboard?.writeText(url);setToast("链接已复制")}}}><span className="circle"><Share2 size={25}/></span><b>分享</b></button><span className="disc"><Play size={18}/></span></div>
    <div className="info"><div className="author"><Link href={`/u/${v.userId}`} className="avatar">{v.avatarUrl?<img src={v.avatarUrl} alt=""/>:v.avatar}</Link><b className="authorName">@{v.username}</b>{v.userId!==uid&&<button className={`follow ${isFollow?"followed":""}`} onClick={()=>follow(v)}>{isFollow?"已关注":"关注"}</button>}</div><div className="title">{v.title}</div><div className="music">♫ {v.music}</div></div>
   </section>})}
  </div>
  <nav className="nav"><Link className="navItem active" href="/"><HomeIcon size={22}/><span>首页</span></Link><Link className="navItem" href="/discover"><Users size={22}/><span>发现</span></Link><Link className="publish" href="/upload"><Plus size={26}/></Link><Link className="navItem" href="/messages"><Inbox size={22}/><span>消息</span></Link><Link className="navItem" href="/profile"><UserRound size={22}/><span>我</span></Link></nav>
  {toast&&<div className="toast">{toast}</div>}
  {search&&<div className="modal"><div className="searchHead"><button onClick={()=>{setSearch(false);setQ("")}}><X/></button><div className="searchBox"><Search size={18}/><input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="搜索创作者或视频"/></div></div><div className="results"><h3>{q?`搜索结果 · ${q}`:"热门内容"}</h3>{results.map(v=><button key={v.id} className="result" onClick={()=>{setSearch(false);const i=list.findIndex(x=>x.id===v.id);if(i>=0)jump(i)}}><span className="miniAvatar">{v.avatarUrl?<img src={v.avatarUrl} alt=""/>:v.avatar}</span><span><b>@{v.username}</b><p>{v.title}</p></span></button>)}</div></div>}
  {commentVideo&&<div className="overlay" onClick={()=>setCommentVideo(null)}><section className="comments" onClick={e=>e.stopPropagation()}><div className="commentHead"><div><b>评论</b><span style={{color:"#777",fontSize:12}}>{comments.length} 条</span></div><button onClick={()=>setCommentVideo(null)}><X/></button></div><div className="commentList">{commentLoading?<div className="commentLoading">加载评论…</div>:comments.length===0?<div className="commentLoading">还没有评论，来抢第一条</div>:comments.map(c=><div className="comment" key={c.id}><span className="miniAvatar">{c.avatar_url?<img src={c.avatar_url} alt=""/>:c.username.slice(0,1)}</span><div className="commentBody"><b>@{c.username}</b><p>{c.content}</p><small>{new Date(c.created_at).toLocaleString()}</small></div></div>)}</div><form className="commentForm" onSubmit={submitComment}><div className="commentComposer"><input value={commentText} onChange={e=>setCommentText(e.target.value.slice(0,500))} placeholder="说点什么…" maxLength={500}/><button disabled={commentSending||!commentText.trim()}><Send size={18}/></button></div></form></section></div>}
 </main>
}
