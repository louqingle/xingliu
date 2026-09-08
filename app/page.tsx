"use client";

import { useEffect, useRef, useState } from "react";
import { Heart, MessageCircle, Share2, Search, Volume2, VolumeX, Home, Users, Plus, Inbox, UserRound, Bookmark, MoreHorizontal, X, Send, Play, Pause } from "lucide-react";

type VideoItem={id:number;src:string;username:string;title:string;music:string;likes:number;comments:number;avatar:string;tag:string};
const videos:VideoItem[]=[
{id:1,src:"https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",username:"星流用户",title:"欢迎来到星流，记录生活里值得被看见的瞬间。✨",music:"原创音乐 · 星流",likes:1280,comments:86,avatar:"星",tag:"生活"},
{id:2,src:"https://www.w3schools.com/html/mov_bbb.mp4",username:"小星",title:"今天的快乐很简单：出去走走，看看世界。",music:"星流音乐",likes:2356,comments:132,avatar:"小",tag:"日常"},
{id:3,src:"https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",username:"阿乐",title:"把普通的一天拍下来，也许它就是最好的故事。",music:"热门BGM · 星流",likes:8942,comments:421,avatar:"乐",tag:"记录"},
{id:4,src:"https://www.w3schools.com/html/mov_bbb.mp4",username:"旅行者",title:"下一站，去一个没有去过的地方。🌍",music:"旅行歌单",likes:15420,comments:806,avatar:"旅",tag:"旅行"},
];

export default function Home(){
 const feedRef=useRef<HTMLDivElement|null>(null); const videoRefs=useRef<(HTMLVideoElement|null)[]>([]);
 const [current,setCurrent]=useState(0); const [liked,setLiked]=useState<number[]>([]); const [saved,setSaved]=useState<number[]>([]); const [followed,setFollowed]=useState<number[]>([]);
 const [muted,setMuted]=useState(true); const [paused,setPaused]=useState(false); const [tab,setTab]=useState("推荐"); const [commentOpen,setCommentOpen]=useState(false); const [searchOpen,setSearchOpen]=useState(false); const [publishOpen,setPublishOpen]=useState(false); const [query,setQuery]=useState(""); const [comment,setComment]=useState(""); const [comments,setComments]=useState<string[]>(["这个视频拍得真好！","星流越来越有意思了"]); const [toast,setToast]=useState("");
 const active=videos[current]||videos[0];
 useEffect(()=>{const f=feedRef.current;if(!f)return;const on=()=>setCurrent(Math.max(0,Math.min(videos.length-1,Math.round(f.scrollTop/window.innerHeight))));f.addEventListener("scroll",on,{passive:true});return()=>f.removeEventListener("scroll",on)},[]);
 useEffect(()=>{videoRefs.current.forEach((v,i)=>{if(!v)return;v.muted=muted;if(i===current&&!paused)v.play().catch(()=>{});else v.pause()})},[current,muted,paused]);
 useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(""),1800);return()=>clearTimeout(t)},[toast]);
 function toastMsg(s:string){setToast(s)}
 function toggleLike(id:number){setLiked(x=>x.includes(id)?x.filter(i=>i!==id):[...x,id])}
 function toggleSave(id:number){setSaved(x=>x.includes(id)?x.filter(i=>i!==id):[...x,id]);toastMsg(saved.includes(id)?"已取消收藏":"已收藏")}
 function toggleFollow(id:number){setFollowed(x=>x.includes(id)?x.filter(i=>i!==id):[...x,id]);toastMsg(followed.includes(id)?"已取消关注":"已关注")}
 function share(){if(navigator.share)navigator.share({title:active.title,url:location.href}).catch(()=>{});else{navigator.clipboard?.writeText(location.href);toastMsg("链接已复制")}}
 function go(path:string){location.href=path}
 return <main className="app">
 <div className="feed" ref={feedRef}>{videos.map((v,i)=>{const isLiked=liked.includes(v.id),isSaved=saved.includes(v.id),isFollowed=followed.includes(v.id);return <section className="page" key={v.id}>
   <video ref={e=>{videoRefs.current[i]=e}} className="video" src={v.src} muted={muted} loop playsInline preload={i<2?"auto":"metadata"} onClick={()=>setPaused(x=>!x)}/>
   <div className="shade top"/><div className="shade bottom"/>
   {paused&&i===current&&<button className="pause" onClick={()=>setPaused(false)}><Play size={34} fill="white"/></button>}
   <div className="topbar"><div className="tabs"><button className={tab==="关注"?"tab":"tab active"} onClick={()=>setTab("关注")}>关注</button><button className={tab==="推荐"?"tab active":"tab"} onClick={()=>setTab("推荐")}>推荐</button></div><button className="iconBtn" onClick={()=>setSearchOpen(true)}><Search size={25}/></button></div>
   <button className="sound" onClick={()=>setMuted(x=>!x)}>{muted?<VolumeX size={20}/>:<Volume2 size={20}/>}</button>
   <aside className="actions">
    <button className="action" onClick={()=>toggleLike(v.id)}><span className={isLiked?"circle like on":"circle like"}><Heart size={30} fill={isLiked?"currentColor":"none"}/></span><b>{fmt(v.likes+(isLiked?1:0))}</b></button>
    <button className="action" onClick={()=>setCommentOpen(true)}><span className="circle"><MessageCircle size={29}/></span><b>{fmt(v.comments)}</b></button>
    <button className="action" onClick={()=>toggleSave(v.id)}><span className={isSaved?"circle saved":"circle"}><Bookmark size={28} fill={isSaved?"currentColor":"none"}/></span><b>{isSaved?"已收藏":"收藏"}</b></button>
    <button className="action" onClick={share}><span className="circle"><Share2 size={28}/></span><b>分享</b></button>
    <div className="disc">♪</div>
   </aside>
   <div className="info"><div className="author"><div className="avatar">{v.avatar}</div><b>@{v.username}</b><button className={isFollowed?"follow followed":"follow"} onClick={()=>toggleFollow(v.id)}>{isFollowed?"已关注":"+ 关注"}</button></div><div className="title">{v.title}</div><div className="music">♪ {v.music} · #{v.tag}</div></div>
 </section>})}</div>
 <nav className="nav"><button className="navItem active" onClick={()=>feedRef.current?.scrollTo({top:0,behavior:"smooth"})}><Home/><span>首页</span></button><button className="navItem" onClick={()=>setTab("关注")}><Users/><span>关注</span></button><button className="publish" onClick={()=>setPublishOpen(true)}><Plus size={29}/></button><button className="navItem" onClick={()=>toastMsg("消息中心正在建设中")}><Inbox/><span>消息</span></button><button className="navItem" onClick={()=>go(localStorage.getItem("xingliu-current-user")?"/profile":"/auth")}><UserRound/><span>我</span></button></nav>
 {toast&&<div className="toast">{toast}</div>}
 {searchOpen&&<div className="modal searchModal"><div className="searchHead"><button onClick={()=>setSearchOpen(false)}><X/></button><div className="searchBox"><Search size={18}/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索视频、用户、音乐"/></div></div><div className="results">{query?<><h3>搜索“{query}”</h3>{videos.filter(v=>(v.title+v.username+v.tag).includes(query)).map(v=><button className="result" key={v.id} onClick={()=>{setSearchOpen(false);feedRef.current?.scrollTo({top:(v.id-1)*window.innerHeight,behavior:"smooth"})}}><div className="miniAvatar">{v.avatar}</div><div><b>@{v.username}</b><p>{v.title}</p></div></button>)}</>:<><h3>大家都在搜</h3><div className="chips">{["旅行","美食","日常","AI","音乐","搞笑","摄影","宠物"].map(x=><button key={x} onClick={()=>setQuery(x)}>#{x}</button>)}</div></>}</div></div>}
 {commentOpen&&<div className="overlay" onClick={()=>setCommentOpen(false)}><div className="comments" onClick={e=>e.stopPropagation()}><div className="commentHead"><b>{active.comments}条评论</b><button onClick={()=>setCommentOpen(false)}><X/></button></div><div className="commentList">{comments.map((c,i)=><div className="comment" key={i}><div className="miniAvatar">{i?"星":"乐"}</div><div><b>{i?"星流用户":"热心网友"}</b><p>{c}</p><small>刚刚 · 回复</small></div><Heart size={17}/></div>)}</div><form className="commentForm" onSubmit={e=>{e.preventDefault();if(comment.trim()){setComments(x=>[...x,comment.trim()]);setComment("")}}}><input value={comment} onChange={e=>setComment(e.target.value)} placeholder="留下你的精彩评论..."/><button><Send size={20}/></button></form></div></div>}
 {publishOpen&&<div className="overlay" onClick={()=>setPublishOpen(false)}><div className="publishPanel" onClick={e=>e.stopPropagation()}><div className="commentHead"><b>发布作品</b><button onClick={()=>setPublishOpen(false)}><X/></button></div><div className="upload"><div className="uploadIcon"><Plus size={34}/></div><h3>上传你的第一个作品</h3><p>视频、图片都可以分享给星流用户</p><button onClick={()=>toastMsg("上传入口已准备，下一步接入存储")}>选择作品</button></div><div className="publishOptions"><span>公开发布</span><span>允许评论　›</span><span>添加话题　›</span></div></div></div>}
 </main>
}
function fmt(n:number){return n>=10000?(n/10000).toFixed(1).replace(".0","")+"万":n.toLocaleString("zh-CN")}
