"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Heart, MessageCircle, Share2, Search, Volume2, VolumeX, Home as HomeIcon, Users, Plus, Inbox, UserRound, Bookmark, X, Play } from "lucide-react";
import { supabase } from "../lib/supabase";

type VideoItem = { id:string; src:string; username:string; title:string; music:string; likes:number; comments:number; views:number; avatar:string; tag:string; userId?:string; createdAt?:string };
type EventRow = { video_id:string; event_type:string; watch_ms:number; created_at:string };
type CommentItem = { id:string; content:string; created_at:string; user_id:string; username:string; avatar_url:string|null };

const demoVideos:VideoItem[] = [
 {id:"demo-1",src:"https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",username:"星流用户",title:"欢迎来到星流，记录生活里值得被看见的瞬间。✨",music:"原创音乐 · 星流",likes:1280,comments:86,views:22000,avatar:"星",tag:"生活"},
 {id:"demo-2",src:"https://www.w3schools.com/html/mov_bbb.mp4",username:"小星",title:"今天的快乐很简单：出去走走，看看世界。",music:"星流音乐",likes:2356,comments:132,views:41000,avatar:"小",tag:"日常"},
 {id:"demo-3",src:"https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",username:"阿乐",title:"把普通的一天拍下来，也许它就是最好的故事。",music:"热门BGM · 星流",likes:8942,comments:421,views:98000,avatar:"乐",tag:"记录"},
 {id:"demo-4",src:"https://www.w3schools.com/html/mov_bbb.mp4",username:"旅行者",title:"下一站，去一个没有去过的地方。🌍",music:"旅行歌单",likes:15420,comments:806,views:180000,avatar:"旅",tag:"旅行"},
];

function fmt(n:number){ if(n>=1000000)return `${(n/1000000).toFixed(1)}M`; if(n>=10000)return `${(n/10000).toFixed(1)}万`; if(n>=1000)return `${(n/1000).toFixed(1)}K`; return String(n); }

export default function Home(){
 const feedRef=useRef<HTMLDivElement|null>(null);
 const videoRefs=useRef<(HTMLVideoElement|null)[]>([]);
 const watchTimers=useRef<Record<string,number>>({});
 const lastTick=useRef<number>(Date.now());
 const [videos,setVideos]=useState<VideoItem[]>(demoVideos);
 const [current,setCurrent]=useState(0);
 const [liked,setLiked]=useState<string[]>([]);
 const [saved,setSaved]=useState<string[]>([]);
 const [followed,setFollowed]=useState<string[]>([]);
 const [muted,setMuted]=useState(true);
 const [paused,setPaused]=useState(false);
 const [tab,setTab]=useState<"推荐"|"关注">("推荐");
 const [searchOpen,setSearchOpen]=useState(false);
 const [query,setQuery]=useState("");
 const [commentOpen,setCommentOpen]=useState(false);
 const [comments,setComments]=useState<CommentItem[]>([]);
 const [comment,setComment]=useState("");
 const [toast,setToast]=useState("");
 const [userId,setUserId]=useState<string|null>(null);
 const [eventRows,setEventRows]=useState<EventRow[]>([]);
 const active=videos[current]||videos[0];

 const loadFeed=useCallback(async(uid:string|null)=>{
  if(!supabase)return;
  const {data} = await supabase.from("videos").select("id,video_url,caption,music,likes_count,comments_count,views_count,user_id,created_at,profiles(username,display_name,avatar_url)").order("created_at",{ascending:false}).limit(60);
  if(!data?.length){setVideos(demoVideos);return;}
  const mapped:VideoItem[] = data.map((v:any)=>{const p=Array.isArray(v.profiles)?v.profiles[0]:v.profiles;return {id:v.id,src:v.video_url,username:p?.username||p?.display_name||"星流用户",title:v.caption||"",music:v.music||"原创音乐 · 星流",likes:v.likes_count||0,comments:v.comments_count||0,views:v.views_count||0,avatar:(p?.display_name||p?.username||"星").slice(0,1),tag:"星流",userId:v.user_id,createdAt:v.created_at};});
  if(!uid){setVideos(mapped);return;}
  const {data:events}=await supabase.from("video_events").select("video_id,event_type,watch_ms,created_at").eq("user_id",uid).order("created_at",{ascending:false}).limit(500);
  setEventRows(events||[]);
  const score=(v:VideoItem)=>{
   const ev=(events||[]).filter((e:any)=>e.video_id===v.id);
   const watch=ev.filter((e:any)=>e.event_type==="watch").reduce((s:number,e:any)=>s+(e.watch_ms||0),0)/1000;
   const likes=ev.some((e:any)=>e.event_type==="like")?18:0;
   const comments=ev.some((e:any)=>e.event_type==="comment")?14:0;
   const shares=ev.some((e:any)=>e.event_type==="share")?12:0;
   const saves=ev.some((e:any)=>e.event_type==="save")?10:0;
   const skips=ev.filter((e:any)=>e.event_type==="skip").length*10;
   const seen=ev.filter((e:any)=>e.event_type==="impression").length;
   const recency=v.createdAt?Math.max(0,7-(Date.now()-new Date(v.createdAt).getTime())/86400000):0;
   const popularity=Math.log10(1+v.likes*2+v.comments*4+v.views*.05);
   return popularity+recency+Math.min(watch/8,20)+likes+comments+shares+saves-skips-seen*1.5+(v.userId&&followed.includes(v.userId)?16:0);
  };
  setVideos([...mapped].sort((a,b)=>score(b)-score(a)));
 },[followed]);

 useEffect(()=>{let alive=true;(async()=>{if(!supabase)return;const {data:{session}}=await supabase.auth.getSession();if(!alive)return;const uid=session?.user.id??null;setUserId(uid);await loadFeed(uid);})();return()=>{alive=false}},[loadFeed]);
 useEffect(()=>{if(!supabase)return;const {data:listener}=supabase.auth.onAuthStateChange((_e,s)=>{setUserId(s?.user.id??null);});return()=>listener.subscription.unsubscribe()},[]);
 useEffect(()=>{if(!supabase||!userId)return;(async()=>{const {data:ls}=await supabase.from("likes").select("video_id").eq("user_id",userId);if(ls)setLiked(ls.map((x:any)=>x.video_id));const {data:fs}=await supabase.from("follows").select("following_id").eq("follower_id",userId);if(fs)setFollowed(fs.map((x:any)=>x.following_id));})();},[userId]);
 useEffect(()=>{const f=feedRef.current;if(!f)return;const on=()=>setCurrent(Math.max(0,Math.min(videos.length-1,Math.round(f.scrollTop/window.innerHeight))));f.addEventListener("scroll",on,{passive:true});return()=>f.removeEventListener("scroll",on)},[videos.length]);
 useEffect(()=>{videoRefs.current.forEach((v,i)=>{if(!v)return;v.muted=muted;if(i===current&&!paused){v.play().catch(()=>{});}else v.pause();});lastTick.current=Date.now();if(active?.id&&!active.id.startsWith("demo-")&&userId&&supabase){supabase.from("video_events").insert({user_id:userId,video_id:active.id,event_type:"impression"}).then(()=>{});}},[current,muted,paused,videos,userId,active?.id]);
 useEffect(()=>{if(!active||active.id.startsWith("demo-")||!userId||!supabase)return;const timer=window.setInterval(()=>{if(paused)return;const delta=Math.max(0,Date.now()-lastTick.current);lastTick.current=Date.now();watchTimers.current[active.id]=(watchTimers.current[active.id]||0)+delta;if(watchTimers.current[active.id]>=3000){const ms=watchTimers.current[active.id];watchTimers.current[active.id]=0;supabase.from("video_events").insert({user_id:userId,video_id:active.id,event_type:"watch",watch_ms:ms}).then(()=>{});}},3000);return()=>window.clearInterval(timer)},[active?.id,userId,paused]);
 useEffect(()=>{if(!toast)return;const t=window.setTimeout(()=>setToast(""),1800);return()=>window.clearTimeout(t)},[toast]);
 useEffect(()=>{if(!commentOpen||!active||active.id.startsWith("demo-")||!supabase)return;supabase.from("comments").select("id,content,created_at,user_id,profiles(username,avatar_url)").eq("video_id",active.id).order("created_at",{ascending:false}).limit(100).then(({data})=>setComments((data||[]).map((x:any)=>{const p=Array.isArray(x.profiles)?x.profiles[0]:x.profiles;return{id:x.id,content:x.content,created_at:x.created_at,user_id:x.user_id,username:p?.username||"星流用户",avatar_url:p?.avatar_url||null}})));},[commentOpen,current,active?.id]);
 const rankedVideos=useMemo(()=>tab==="关注"?videos.filter(v=>v.userId&&followed.includes(v.userId)):videos,[tab,videos,followed]);
 useEffect(()=>{if(current>=rankedVideos.length&&rankedVideos.length)setCurrent(0)},[current,rankedVideos.length]);
 function toastMsg(s:string){setToast(s)}
 async function track(type:string,videoId=active?.id,watchMs=0){if(!supabase||!userId||!videoId||videoId.startsWith("demo-"))return;await supabase.from("video_events").insert({user_id:userId,video_id:videoId,event_type:type,watch_ms:watchMs});}
 async function toggleLike(v:VideoItem){if(!supabase||!userId){toastMsg("登录后即可点赞");return}const has=liked.includes(v.id);setLiked(x=>has?x.filter(i=>i!==v.id):[...x,v.id]);setVideos(x=>x.map(i=>i.id===v.id?{...i,likes:Math.max(0,i.likes+(has?-1:1))}:i));await track(has?"unlike":"like",v.id);if(has)await supabase.from("likes").delete().eq("video_id",v.id).eq("user_id",userId);else await supabase.from("likes").insert({video_id:v.id,user_id:userId});}
 async function toggleSave(v:VideoItem){const has=saved.includes(v.id);setSaved(x=>has?x.filter(i=>i!==v.id):[...x,v.id]);await track(has?"unsave":"save",v.id);toastMsg(has?"已取消收藏":"已收藏");}
 async function toggleFollow(v:VideoItem){if(!supabase||!userId){toastMsg("登录后即可关注");return}if(!v.userId||v.userId===userId){toastMsg("不能关注自己");return}const has=followed.includes(v.userId);setFollowed(x=>has?x.filter(i=>i!==v.userId):[...x,v.userId!]);await track(has?"unlike":"follow",v.id);if(has)await supabase.from("follows").delete().eq("follower_id",userId).eq("following_id",v.userId);else await supabase.from("follows").insert({follower_id:userId,following_id:v.userId});}
 async function share(){await track("share");if(navigator.share)navigator.share({title:active.title,url:location.href}).catch(()=>{});else{await navigator.clipboard?.writeText(location.href);toastMsg("链接已复制")}}
 async function submitComment(e:any){e.preventDefault();const text=comment.trim();if(!text)return;if(!supabase||!userId){toastMsg("登录后即可评论");return}if(active.id.startsWith("demo-")){toastMsg("示例视频暂不支持评论");return}const {data,error}=await supabase.from("comments").insert({video_id:active.id,user_id:userId,content:text}).select("id,content,created_at,user_id,profiles(username,avatar_url)").single();if(error){toastMsg("评论失败");return}const p=Array.isArray((data as any).profiles)?(data as any).profiles[0]:(data as any).profiles;setComments(x=>[{id:(data as any).id,content:text,created_at:(data as any).created_at,user_id:userId,username:p?.username||"我",avatar_url:p?.avatar_url||null},...x]);setComment("");await track("comment");}
 function go(path:string){location.href=path}
 return <main className="app"><div className="feed" ref={feedRef}>{rankedVideos.map((v,i)=>{const isLiked=liked.includes(v.id),isSaved=saved.includes(v.id),isFollowed=v.userId?followed.includes(v.userId):false;return <section className="page" key={v.id}><video ref={e=>{videoRefs.current[i]=e}} className="video" src={v.src} muted={muted} loop playsInline preload={i<=current+1?"auto":"metadata"} onClick={()=>setPaused(x=>!x)} onEnded={()=>track("watch",v.id,Math.round((watchTimers.current[v.id]||0)))}/><div className="shade top"/><div className="shade bottom"/>{paused&&i===current&&<button className="pause" onClick={()=>setPaused(false)}><Play size={34} fill="white"/></button>}<div className="topbar"><div className="tabs"><button className={tab==="关注"?"tab":"tab active"} onClick={()=>{setTab("关注");setCurrent(0)}}>关注</button><button className={tab==="推荐"?"tab active":"tab"} onClick={()=>{setTab("推荐");setCurrent(0)}}>推荐</button></div><button className="iconBtn" onClick={()=>setSearchOpen(true)}><Search size={25}/></button></div><button className="sound" onClick={()=>setMuted(x=>!x)}>{muted?<VolumeX size={20}/>:<Volume2 size={20}/>}</button><aside className="actions"><button className="action" onClick={()=>toggleLike(v)}><span className={isLiked?"circle like on":"circle like"}><Heart size={30} fill={isLiked?"currentColor":"none"}/></span><b>{fmt(v.likes)}</b></button><button className="action" onClick={()=>{setCommentOpen(true);track("impression",v.id)}}><span className="circle"><MessageCircle size={29}/></span><b>{fmt(v.comments)}</b></button><button className="action" onClick={()=>toggleSave(v)}><span className={isSaved?"circle saved":"circle"}><Bookmark size={28} fill={isSaved?"currentColor":"none"}/></span><b>{isSaved?"已收藏":"收藏"}</b></button><button className="action" onClick={share}><span className="circle"><Share2 size={28}/></span><b>分享</b></button><div className="disc">♪</div></aside><div className="info"><div className="author"><button className="avatar" onClick={()=>v.userId?go(`/u/${v.userId}`):toastMsg("演示用户没有个人主页")}>{v.avatar}</button><button className="authorName" onClick={()=>v.userId?go(`/u/${v.userId}`):toastMsg("演示用户没有个人主页")}>@{v.username}</button>{v.userId&&v.userId!==userId&&<button className={isFollowed?"follow followed":"follow"} onClick={()=>toggleFollow(v)}>{isFollowed?"已关注":"+ 关注"}</button>}</div><div className="title">{v.title}</div><div className="music">♪ {v.music} · #{v.tag}</div></div></section>})}</div><nav className="nav"><button className="navItem active" onClick={()=>feedRef.current?.scrollTo({top:0,behavior:"smooth"})}><HomeIcon/><span>首页</span></button><button className="navItem" onClick={()=>go("/following")}><Users/><span>关注</span></button><button className="publish" onClick={()=>userId?go("/upload"):go("/auth")}><Plus size={29}/></button><button className="navItem" onClick={()=>go("/messages")}><Inbox/><span>消息</span></button><button className="navItem" onClick={()=>go(userId?"/profile":"/auth")}><UserRound/><span>我</span></button></nav>{toast&&<div className="toast">{toast}</div>}{searchOpen&&<div className="modal searchModal"><div className="searchHead"><button onClick={()=>setSearchOpen(false)}><X/></button><div className="searchBox"><Search size={18}/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索视频、用户、音乐"/></div></div><div className="results">{query?<>{videos.filter(v=>(v.title+v.username+v.tag).includes(query)).map(v=><button className="result" key={v.id} onClick={()=>{setSearchOpen(false);const n=rankedVideos.findIndex(x=>x.id===v.id);if(n>=0)feedRef.current?.scrollTo({top:n*window.innerHeight,behavior:"smooth"})}}><div className="miniAvatar">{v.avatar}</div><div><b>@{v.username}</b><p>{v.title}</p></div></button>)}</>:<><h3>大家都在搜</h3><div className="chips">{["旅行","美食","日常","AI","音乐","搞笑","摄影","宠物"].map(x=><button key={x} onClick={()=>setQuery(x)}>#{x}</button>)}</div></>}</div></div>}{commentOpen&&<div className="overlay" onClick={()=>setCommentOpen(false)}><div className="comments" onClick={e=>e.stopPropagation()}><div className="commentHead"><b>{active.id.startsWith("demo-")?active.comments:comments.length}条评论</b><button onClick={()=>setCommentOpen(false)}><X/></button></div><div className="commentList">{comments.length?comments.map(c=><div className="comment" key={c.id}><div className="miniAvatar">{c.avatar_url?<img src={c.avatar_url} alt=""/>:c.username.slice(0,1)}</div><div><b>@{c.username}</b><p>{c.content}</p></div></div>):<div className="commentLoading">还没有评论</div>}</div><form className="commentForm" onSubmit={submitComment}><input value={comment} onChange={e=>setComment(e.target.value)} placeholder={userId?"说点什么…":"登录后评论"}/><button type="submit">发送</button></form></div></div>}</main>;
}
