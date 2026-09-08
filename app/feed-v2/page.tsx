"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Heart, MessageCircle, Share2, Search, Volume2, VolumeX, Home, Users, Plus, Inbox, UserRound, Bookmark, X, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type Video={id:string;src:string;username:string;title:string;music:string;likes:number;comments:number;avatar:string;userId:string};
const demo:Video[]=[{id:"demo-1",src:"https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",username:"星流用户",title:"欢迎来到星流。记录值得被看见的瞬间。",music:"原创音乐 · 星流",likes:1280,comments:86,avatar:"星",userId:""}];
const fmt=(n:number)=>n>=10000?`${(n/10000).toFixed(1)}万`:n>=1000?`${(n/1000).toFixed(1)}K`:String(n);

export default function FeedV2(){
 const router=useRouter();const feed=useRef<HTMLDivElement>(null);const players=useRef<Record<string,HTMLVideoElement|null>>({});
 const [videos,setVideos]=useState<Video[]>(demo),[index,setIndex]=useState(0),[muted,setMuted]=useState(true),[liked,setLiked]=useState<string[]>([]),[saved,setSaved]=useState<string[]>([]),[following,setFollowing]=useState<string[]>([]),[uid,setUid]=useState<string|null>(null),[tab,setTab]=useState<"推荐"|"关注">("推荐"),[search,setSearch]=useState(false),[q,setQ]=useState(""),[toast,setToast]=useState("");
 const load=useCallback(async(user:string|null)=>{if(!supabase)return;const {data}=await supabase.from("videos").select("id,url,title,music,like_count,comment_count,user_id,profiles(username,nickname,avatar_url)").eq("status","published").order("created_at",{ascending:false}).limit(30);if(!data?.length){setVideos(demo);return;}setVideos(data.map((v:any)=>{const p=Array.isArray(v.profiles)?v.profiles[0]:v.profiles;return{id:v.id,src:v.url,title:v.title||"",music:v.music||"原创音乐 · 星流",username:p?.username||p?.nickname||"星流用户",likes:v.like_count||0,comments:v.comment_count||0,avatar:(p?.nickname||p?.username||"星").slice(0,1),userId:v.user_id};}));if(user){const [{data:l},{data:f}]=await Promise.all([supabase.from("likes").select("video_id").eq("user_id",user),supabase.from("follows").select("following_id").eq("follower_id",user)]);setLiked((l||[]).map((x:any)=>x.video_id));setFollowing((f||[]).map((x:any)=>x.following_id));}},[]);
 useEffect(()=>{(async()=>{if(!supabase)return;const {data:{session}}=await supabase.auth.getSession();const id=session?.user.id||null;setUid(id);await load(id);})();},[load]);
 const list=useMemo(()=>tab==="关注"?videos.filter(v=>following.includes(v.userId)):videos,[tab,videos,following]);const active=list[index]||list[0];
 useEffect(()=>{setIndex(0);feed.current?.scrollTo({top:0});},[tab]);
 useEffect(()=>{const el=feed.current;if(!el)return;let raf=0;const fn=()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;const h=el.clientHeight||innerHeight;const i=Math.max(0,Math.min(list.length-1,Math.round(el.scrollTop/h)));setIndex(x=>x===i?x:i);});};el.addEventListener("scroll",fn,{passive:true});return()=>{el.removeEventListener("scroll",fn);cancelAnimationFrame(raf);};},[list.length]);
 useEffect(()=>{Object.entries(players.current).forEach(([id,v])=>{if(!v)return;v.muted=muted;if(id===active?.id)v.play().catch(()=>{});else v.pause();});},[active?.id,muted]);
 useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(""),1500);return()=>clearTimeout(t)},[toast]);
 async function event(type:string,id=active?.id){if(supabase&&uid&&id&&!id.startsWith("demo-"))void supabase.from("video_events").insert({user_id:uid,video_id:id,event_type:type});}
 async function like(v:Video){if(!uid){setToast("登录后即可点赞");router.push("/auth");return;}const on=liked.includes(v.id);setLiked(x=>on?x.filter(i=>i!==v.id):[...x,v.id]);setVideos(x=>x.map(a=>a.id===v.id?{...a,likes:Math.max(0,a.likes+(on?-1:1))}:a));if(!v.id.startsWith("demo-")&&supabase){if(on)await supabase.from("likes").delete().eq("user_id",uid).eq("video_id",v.id);else await supabase.from("likes").insert({user_id:uid,video_id:v.id});}void event(on?"unlike":"like",v.id);}
 async function save(v:Video){if(!uid){setToast("登录后即可收藏");return;}const on=saved.includes(v.id);setSaved(x=>on?x.filter(i=>i!==v.id):[...x,v.id]);void event(on?"unsave":"save",v.id);setToast(on?"已取消收藏":"已收藏");}
 async function follow(v:Video){if(!uid||!v.userId||v.userId===uid){if(!uid)setToast("登录后即可关注");return;}const on=following.includes(v.userId);setFollowing(x=>on?x.filter(i=>i!==v.userId):[...x,v.userId]);if(supabase){if(on)await supabase.from("follows").delete().eq("follower_id",uid).eq("following_id",v.userId);else await supabase.from("follows").insert({follower_id:uid,following_id:v.userId});}void event(on?"unfollow":"follow",v.id);}
 function jump(i:number){feed.current?.scrollTo({top:i*(feed.current?.clientHeight||innerHeight),behavior:"smooth"});}
 return <main className="app">
  <div className="topbar"><div className="tabs"><button className={`tab ${tab==="推荐"?"active":""}`} onClick={()=>setTab("推荐")}>推荐</button><button className={`tab ${tab==="关注"?"active":""}`} onClick={()=>setTab("关注")}>关注</button></div><button className="iconBtn" onClick={()=>setSearch(true)}><Search size={22}/></button></div>
  <div className="feed" ref={feed}>
   {list.length===0?<section className="page" style={{display:"grid",placeItems:"center",padding:30}}><div style={{textAlign:"center",color:"#999"}}><Users size={46}/><h3 style={{color:"#fff"}}>还没有关注内容</h3><p>去推荐里发现喜欢的创作者</p><button className="publish" onClick={()=>setTab("推荐")}>去推荐</button></div></section>:list.map((v,i)=>{const near=Math.abs(i-index)<=1;const isLike=liked.includes(v.id),isSave=saved.includes(v.id),isFollow=following.includes(v.userId);return <section className="page" key={v.id}>
    {near?<video ref={el=>{players.current[v.id]=el}} className="video" src={v.src} playsInline muted={muted} preload={i===index?"auto":"metadata"} onClick={()=>{const el=players.current[v.id];if(!el)return;if(el.paused)el.play().catch(()=>{});else el.pause();}} onDoubleClick={()=>like(v)} onEnded={()=>{if(i<list.length-1)jump(i+1)}}/>:<div className="video" style={{background:"linear-gradient(135deg,#151515,#050505)"}}/>}
    <div className="shade top"/><div className="shade bottom"/>
    <button className="sound" onClick={()=>setMuted(x=>!x)}>{muted?<VolumeX size={20}/>:<Volume2 size={20}/>}</button>
    <div className="actions">
      <button className="action" onClick={()=>like(v)}><span className={`circle ${isLike?"like on":""}`}><Heart size={27} fill={isLike?"currentColor":"none"}/></span><b>{fmt(v.likes)}</b></button>
      <button className="action" onClick={()=>router.push(`/video/${v.id}`)}><span className="circle"><MessageCircle size={27}/></span><b>{fmt(v.comments)}</b></button>
      <button className="action" onClick={()=>save(v)}><span className={`circle ${isSave?"saved":""}`}><Bookmark size={25} fill={isSave?"currentColor":"none"}/></span><b>{isSave?"已收藏":"收藏"}</b></button>
      <button className="action" onClick={async()=>{void event("share",v.id);if(navigator.share)await navigator.share({title:v.title||"星流",url:location.href}).catch(()=>{});else{await navigator.clipboard?.writeText(location.href);setToast("链接已复制")}}}><span className="circle"><Share2 size={25}/></span><b>分享</b></button>
      <span className="disc"><Play size={18}/></span>
    </div>
    <div className="info"><div className="author"><Link href={`/profile/${v.userId}`} className="avatar">{v.avatar}</Link><b className="authorName">@{v.username}</b>{v.userId&&v.userId!==uid&&<button className={`follow ${isFollow?"followed":""}`} onClick={()=>follow(v)}>{isFollow?"已关注":"关注"}</button>}</div><div className="title">{v.title||"分享一个瞬间"}</div><div className="music">♫ {v.music}</div></div>
   </section>})}
  </div>
  <nav className="nav"><Link className="navItem active" href="/" onClick={()=>jump(0)}><Home size={22}/><span>首页</span></Link><button className="navItem" onClick={()=>setToast("发现功能正在升级") }><Users size={22}/><span>发现</span></button><Link className="publish" href="/upload"><Plus size={26}/></Link><Link className="navItem" href="/messages"><Inbox size={22}/><span>消息</span></Link><Link className="navItem" href="/profile"><UserRound size={22}/><span>我</span></Link></nav>
  {toast&&<div className="toast">{toast}</div>}
  {search&&<div className="modal"><div className="searchHead"><button onClick={()=>{setSearch(false);setQ("")}}><X/></button><div className="searchBox"><Search size={18}/><input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="搜索创作者或视频"/></div></div><div className="results"><h3>{q?`搜索结果 · ${q}`:"热门内容"}</h3>{list.filter(v=>!q||`${v.username} ${v.title} ${v.music}`.toLowerCase().includes(q.toLowerCase())).slice(0,12).map(v=><button key={v.id} className="result" onClick={()=>{setSearch(false);const i=list.findIndex(x=>x.id===v.id);if(i>=0)jump(i)}}><span className="miniAvatar">{v.avatar}</span><span><b>@{v.username}</b><p>{v.title||"分享一个瞬间"}</p></span></button>)}</div></div>}
 </main>;
}
