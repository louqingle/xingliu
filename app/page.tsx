"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle, Share2, Search, Volume2, VolumeX, Home as HomeIcon, Users, Plus, Inbox, UserRound, Bookmark, X, Play } from "lucide-react";
import { supabase } from "../lib/supabase";

type VideoItem = { id:string; src:string; username:string; title:string; music:string; likes:number; comments:number; views:number; avatar:string; userId:string; createdAt:string };
type CommentItem = { id:string; content:string; created_at:string; user_id:string; username:string; avatar_url:string|null };
type EventItem = { video_id:string; event_type:string; watch_ms:number|null; created_at:string };

const demoVideos: VideoItem[] = [
  {id:"demo-1",src:"https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",username:"星流用户",title:"欢迎来到星流，记录生活里值得被看见的瞬间。✨",music:"原创音乐 · 星流",likes:1280,comments:86,views:22000,avatar:"星",userId:"",createdAt:""},
  {id:"demo-2",src:"https://www.w3schools.com/html/mov_bbb.mp4",username:"小星",title:"今天的快乐很简单：出去走走，看看世界。",music:"星流音乐",likes:2356,comments:132,views:41000,avatar:"小",userId:"",createdAt:""},
];

const fmt=(n:number)=>n>=1000000?`${(n/1000000).toFixed(1)}M`:n>=10000?`${(n/10000).toFixed(1)}万`:n>=1000?`${(n/1000).toFixed(1)}K`:String(n);
const tokenize=(s:string)=>s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu," ").split(/\s+/).filter(x=>x.length>1);

function recommendationScore(v:VideoItem,events:EventItem[],followed:string[],liked:string[],now:number){
  const ev=events.filter(e=>e.video_id===v.id);
  const impressions=ev.filter(e=>e.event_type==="impression").length;
  const watchSeconds=ev.filter(e=>e.event_type==="watch").reduce((s,e)=>s+(e.watch_ms||0),0)/1000;
  const likedBefore=liked.includes(v.id)||ev.some(e=>e.event_type==="like");
  const followedCreator=followed.includes(v.userId);
  const ageDays=v.createdAt?Math.max(0,(now-new Date(v.createdAt).getTime())/86400000):30;
  const freshness=Math.max(0,18-ageDays*1.7);
  const engagement=Math.min(18,Math.log10(1+v.likes*2+v.comments*5)*5);
  const watchAffinity=Math.min(24,watchSeconds/5);
  const creatorAffinity=followedCreator?28:0;
  const likeAffinity=likedBefore?20:0;
  const seenPenalty=Math.min(35,impressions*8);
  const exploration=Math.random()*5;
  return freshness+engagement+watchAffinity+creatorAffinity+likeAffinity-seenPenalty+exploration;
}

export default function Home(){
  const router=useRouter();
  const feedRef=useRef<HTMLDivElement|null>(null);
  const videoRefs=useRef<Record<string,HTMLVideoElement|null>>({});
  const timers=useRef<Record<string,number>>({});
  const tick=useRef(Date.now());
  const [videos,setVideos]=useState<VideoItem[]>(demoVideos),[current,setCurrent]=useState(0),[liked,setLiked]=useState<string[]>([]),[saved,setSaved]=useState<string[]>([]),[followed,setFollowed]=useState<string[]>([]),[muted,setMuted]=useState(true),[paused,setPaused]=useState(false),[tab,setTab]=useState<"推荐"|"关注">("推荐"),[userId,setUserId]=useState<string|null>(null),[loading,setLoading]=useState(true),[toast,setToast]=useState(""),[searchOpen,setSearchOpen]=useState(false),[query,setQuery]=useState(""),[commentOpen,setCommentOpen]=useState(false),[comments,setComments]=useState<CommentItem[]>([]),[comment,setComment]=useState("");

  const loadFeed=useCallback(async(uid:string|null)=>{
    if(!supabase)return;
    const {data}=await supabase.from("videos").select("id,url,title,music,like_count,comment_count,user_id,created_at,profiles(username,nickname,avatar_url)").eq("status","published").order("created_at",{ascending:false}).limit(80);
    if(!data?.length){setVideos(demoVideos);return;}
    const mapped:VideoItem[]=data.map((v:any)=>{const p=Array.isArray(v.profiles)?v.profiles[0]:v.profiles;const name=p?.username||p?.nickname||"星流用户";return{id:v.id,src:v.url,username:name,title:v.title||"",music:v.music||"原创音乐 · 星流",likes:v.like_count||0,comments:v.comment_count||0,views:0,avatar:(p?.nickname||p?.username||"星").slice(0,1),userId:v.user_id,createdAt:v.created_at};});
    if(!uid){setVideos(mapped);return;}
    const [{data:events},{data:followRows},{data:likeRows}]=await Promise.all([
      supabase.from("video_events").select("video_id,event_type,watch_ms,created_at").eq("user_id",uid).order("created_at",{ascending:false}).limit(800),
      supabase.from("follows").select("following_id").eq("follower_id",uid),
      supabase.from("likes").select("video_id").eq("user_id",uid)
    ]);
    const eventList=(events||[]) as EventItem[];
    const following=(followRows||[]).map((x:any)=>x.following_id);
    const likedIds=(likeRows||[]).map((x:any)=>x.video_id);
    const engagedCreator=new Map<string,number>();
    for(const e of eventList){const owner=mapped.find(v=>v.id===e.video_id)?.userId;if(owner)engagedCreator.set(owner,(engagedCreator.get(owner)||0)+1);}
    const interestTokens=new Map<string,number>();
    for(const e of eventList.filter(e=>["like","comment","watch","share","save"].includes(e.event_type))){const v=mapped.find(x=>x.id===e.video_id);if(!v)continue;for(const t of tokenize(`${v.title} ${v.music}`))interestTokens.set(t,(interestTokens.get(t)||0)+1);}
    const now=Date.now();
    const score=(v:VideoItem)=>{
      let s=recommendationScore(v,eventList,following,likedIds,now);
      const creator=engagedCreator.get(v.userId)||0;
      s+=Math.min(24,creator*3.5);
      const terms=tokenize(`${v.title} ${v.music}`);
      s+=Math.min(30,terms.reduce((n,t)=>n+(interestTokens.get(t)||0)*2.2,0));
      if(v.userId===uid)s-=80;
      return s;
    };
    const ranked=[...mapped].sort((a,b)=>score(b)-score(a));
    const diversified:VideoItem[]=[];const creatorCount=new Map<string,number>();
    for(const v of ranked){const count=creatorCount.get(v.userId)||0;if(count>=3&&diversified.length<ranked.length-2)continue;diversified.push(v);creatorCount.set(v.userId,count+1);}
    setVideos(diversified.length?diversified:ranked);
  },[]);

  useEffect(()=>{let alive=true;(async()=>{if(!supabase){setLoading(false);return;}const {data:{session}}=await supabase.auth.getSession();if(!alive)return;const uid=session?.user.id??null;setUserId(uid);await loadFeed(uid);if(alive)setLoading(false);})();return()=>{alive=false};},[loadFeed]);
  useEffect(()=>{if(!supabase)return;const {data:sub}=supabase.auth.onAuthStateChange((_e,s)=>setUserId(s?.user.id??null));return()=>sub.subscription.unsubscribe();},[]);
  useEffect(()=>{if(!supabase||!userId)return;(async()=>{const [{data:l},{data:f}]=await Promise.all([supabase.from("likes").select("video_id").eq("user_id",userId),supabase.from("follows").select("following_id").eq("follower_id",userId)]);setLiked((l||[]).map((x:any)=>x.video_id));setFollowed((f||[]).map((x:any)=>x.following_id));})();},[userId]);

  const feedVideos=useMemo(()=>tab==="关注"?videos.filter(v=>v.userId&&followed.includes(v.userId)):videos,[tab,videos,followed]);
  const active=feedVideos[current]||feedVideos[0];

  useEffect(()=>{setCurrent(0);setPaused(false);feedRef.current?.scrollTo({top:0,behavior:"smooth"});},[tab]);
  useEffect(()=>{const el=feedRef.current;if(!el)return;const onScroll=()=>{const h=el.clientHeight||window.innerHeight||1;setCurrent(Math.max(0,Math.min(Math.max(feedVideos.length-1,0),Math.round(el.scrollTop/h))));};el.addEventListener("scroll",onScroll,{passive:true});return()=>el.removeEventListener("scroll",onScroll);},[feedVideos.length]);
  useEffect(()=>{Object.entries(videoRefs.current).forEach(([id,v])=>{if(!v)return;v.muted=muted;if(id===active?.id&&!paused)v.play().catch(()=>{});else v.pause();});tick.current=Date.now();if(active&&!active.id.startsWith("demo-")&&userId&&supabase)supabase.from("video_events").insert({user_id:userId,video_id:active.id,event_type:"impression"});},[active?.id,muted,paused,userId]);
  useEffect(()=>{if(!active||active.id.startsWith("demo-")||!userId||!supabase)return;const t=window.setInterval(()=>{if(paused)return;const d=Math.max(0,Date.now()-tick.current);tick.current=Date.now();timers.current[active.id]=(timers.current[active.id]||0)+d;if(timers.current[active.id]>=3000){const ms=timers.current[active.id];timers.current[active.id]=0;supabase.from("video_events").insert({user_id:userId,video_id:active.id,event_type:"watch",watch_ms:ms});}},3000);return()=>window.clearInterval(t);},[active?.id,userId,paused]);
  useEffect(()=>{if(!toast)return;const t=window.setTimeout(()=>setToast(""),1800);return()=>window.clearTimeout(t)},[toast]);

  async function track(type:string,id=active?.id){if(supabase&&userId&&id&&!id.startsWith("demo-"))await supabase.from("video_events").insert({user_id:userId,video_id:id,event_type:type});}
  function login(){setToast("登录后即可使用");window.setTimeout(()=>router.push("/auth"),450);}
  async function like(v:VideoItem){if(!userId||!supabase)return login();const has=liked.includes(v.id);setLiked(x=>has?x.filter(i=>i!==v.id):[...x,v.id]);setVideos(x=>x.map(i=>i.id===v.id?{...i,likes:Math.max(0,i.likes+(has?-1:1))}:i));if(has)await supabase.from("likes").delete().eq("video_id",v.id).eq("user_id",userId);else await supabase.from("likes").insert({video_id:v.id,user_id:userId});await track(has?"unlike":"like",v.id);}
  async function save(v:VideoItem){if(!userId)return login();const has=saved.includes(v.id);setSaved(x=>has?x.filter(i=>i!==v.id):[...x,v.id]);await track(has?"unsave":"save",v.id);setToast(has?"已取消收藏":"已收藏");}
  async function follow(v:VideoItem){if(!userId||!supabase)return login();if(!v.userId||v.userId===userId)return;const has=followed.includes(v.userId);setFollowed(x=>has?x.filter(i=>i!==v.userId):[...x,v.userId]);if(has)await supabase.from("follows").delete().eq("follower_id",userId).eq("following_id",v.userId);else await supabase.from("follows").insert({follower_id:userId,following_id:v.userId});await track(has?"unfollow":"follow",v.id);}
  async function share(){await track("share");const url=window.location.href;if(navigator.share)await navigator.share({title:active?.title||"星流视频",url}).catch(()=>{});else{await navigator.clipboard?.writeText(url);setToast("链接已复制");}}
  async function openComments(){if(!active)return;if(!userId)return login();setCommentOpen(true);if(active.id.startsWith("demo-")||!supabase)return;const {data}=await supabase.from("comments").select("id,content,created_at,user_id").eq("video_id",active.id).order("created_at",{ascending:false}).limit(100);const rows=data||[];const ids=[...new Set(rows.map((x:any)=>x.user_id))];let profiles:any[]=[];if(ids.length){const r=await supabase.from("profiles").select("id,username,nickname,avatar_url").in("id",ids);profiles=r.data||[];}setComments(rows.map((x:any)=>{const p=profiles.find((z:any)=>z.id===x.user_id);return{id:x.id,content:x.content,created_at:x.created_at,user_id:x.user_id,username:p?.username||p?.nickname||"星流用户",avatar_url:p?.avatar_url||null};}));}
  async function submitComment(e:React.FormEvent){e.preventDefault();const text=comment.trim();if(!text||!active||!userId||!supabase)return;if(active.id.startsWith("demo-")){setToast("示例视频暂不支持评论");return;}const {data,error}=await supabase.from("comments").insert({video_id:active.id,user_id:userId,content:text}).select("id,content,created_at,user_id").single();if(error||!data){setToast("评论失败");return;}setComments(x=>[{...data,username:"我",avatar_url:null},...x]);setVideos(x=>x.map(v=>v.id===active.id?{...v,comments:v.comments+1}:v));setComment("");await track("comment",active.id);}
  const results=useMemo(()=>{const q=query.trim().toLowerCase();return(q?feedVideos.filter(v=>`${v.username} ${v.title} ${v.music}`.toLowerCase().includes(q)):feedVideos).slice(0,12)},[query,feedVideos]);
  function jump(v:VideoItem){const i=feedVideos.findIndex(x=>x.id===v.id);setSearchOpen(false);if(i>=0)feedRef.current?.scrollTo({top:i*(feedRef.current?.clientHeight||window.innerHeight),behavior:"smooth"});}

  if(loading)return <main className="app"><div className="loading">正在进入星流…</div></main>;
  return <main className="app">
    <div className="feed" ref={feedRef}>
      {feedVideos.length===0?<section className="page" style={{display:"grid",placeItems:"center",padding:32}}><div style={{textAlign:"center"}}><Users size={48}/><h2>关注的人还没有作品</h2><p style={{opacity:.65}}>先去推荐页发现喜欢的创作者</p><button className="follow" onClick={()=>setTab("推荐")}>去推荐</button></div></section>:feedVideos.map((v,i)=>{const isLike=liked.includes(v.id),isSave=saved.includes(v.id),isFollow=followed.includes(v.userId);return <section className="page" key={v.id}>
        <video ref={el=>{videoRefs.current[v.id]=el}} className="video" src={v.src} muted={muted} loop playsInline preload={i<=current+1?"auto":"metadata"} onClick={()=>setPaused(x=>!x)} onDoubleClick={()=>like(v)}/>
        <div className="shade top"/><div className="shade bottom"/>
        {paused&&i===current&&<button className="pause" onClick={()=>setPaused(false)}><Play size={34} fill="white"/></button>}
        <div className="topbar"><div className="tabs"><button className={tab==="关注"?"tab active":"tab"} onClick={()=>setTab("关注")}>关注</button><button className={tab==="推荐"?"tab active":"tab"} onClick={()=>setTab("推荐")}>推荐</button></div><button className="iconBtn" onClick={()=>setSearchOpen(true)}><Search size={25}/></button></div>
        <button className="sound" onClick={()=>setMuted(x=>!x)}>{muted?<VolumeX size={20}/>:<Volume2 size={20}/>}</button>
        <aside className="actions"><button className="action" onClick={()=>like(v)}><span className={isLike?"circle like on":"circle like"}><Heart size={30} fill={isLike?"currentColor":"none"}/></span><b>{fmt(v.likes)}</b></button><button className="action" onClick={openComments}><span className="circle"><MessageCircle size={29}/></span><b>{fmt(v.comments)}</b></button><button className="action" onClick={()=>save(v)}><span className={isSave?"circle saved":"circle"}><Bookmark size={28} fill={isSave?"currentColor":"none"}/></span><b>{isSave?"已收藏":"收藏"}</b></button><button className="action" onClick={share}><span className="circle"><Share2 size={28}/></span><b>分享</b></button><div className="disc">♪</div></aside>
        <div className="info"><div className="author"><Link className="avatar" href={v.userId?`/u/${v.userId}`:"/"}>{v.avatar}</Link><Link className="authorName" href={v.userId?`/u/${v.userId}`:"/"}>@{v.username}</Link>{v.userId&&v.userId!==userId&&<button className={isFollow?"follow followed":"follow"} onClick={()=>follow(v)}>{isFollow?"已关注":"+ 关注"}</button>}</div><div className="title">{v.title}</div><div className="music">♫ {v.music}</div></div>
      </section>})}
    </div>
    <nav className="nav"><Link className="navItem active" href="/"><HomeIcon/><span>首页</span></Link><Link className="navItem" href="/following"><Users/><span>关注</span></Link><Link className="navItem" href="/upload"><span className="publish"><Plus size={25}/></span></Link><Link className="navItem" href="/messages"><Inbox/><span>消息</span></Link><Link className="navItem" href={userId?"/profile":"/auth"}><UserRound/><span>我</span></Link></nav>
    {toast&&<div className="toast">{toast}</div>}
    {searchOpen&&<div className="modal"><div className="searchHead"><button onClick={()=>setSearchOpen(false)}><X/></button><div className="searchBox"><Search size={18}/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索创作者、作品、音乐"/></div></div><div className="results"><h3>{query?"搜索结果":"热门作品"}</h3>{results.map(v=><button className="result" key={v.id} onClick={()=>jump(v)}><span className="miniAvatar">{v.avatar}</span><span><b>@{v.username}</b><p>{v.title}</p></span></button>)}{!results.length&&<div className="empty-content">没有找到相关作品</div>}</div></div>}
    {commentOpen&&<div className="overlay" onClick={()=>setCommentOpen(false)}><div className="comments" onClick={e=>e.stopPropagation()}><div className="commentHead"><div><b>{active?.comments||0} 条评论</b></div><button onClick={()=>setCommentOpen(false)}><X/></button></div><div className="commentList">{comments.length?comments.map(c=><div className="comment" key={c.id}><span className="miniAvatar">{c.username.slice(0,1)}</span><div className="commentBody"><b>@{c.username}</b><p>{c.content}</p><small>{new Date(c.created_at).toLocaleString()}</small></div></div>):<div className="commentLoading">还没有评论，来抢第一条吧</div>}</div><form className="commentForm" onSubmit={submitComment}><div className="commentComposer"><input value={comment} onChange={e=>setComment(e.target.value.slice(0,300))} placeholder="说点什么…"/><button type="submit">发</button></div></form></div></div>}
  </main>;
}
