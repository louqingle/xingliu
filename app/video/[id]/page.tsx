"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Heart, MessageCircle, Share2, Bookmark, Send, UserRound } from "lucide-react";
import { supabase } from "../../../lib/supabase";

type Video = { id:string; url:string; title:string|null; music:string|null; like_count:number; comment_count:number; user_id:string; created_at:string; profile:any };
type Comment = { id:string; content:string; created_at:string; user_id:string; username:string; avatar_url:string|null };

const fmt=(n:number)=>n>=10000?`${(n/10000).toFixed(1).replace(".0","")}万`:n.toLocaleString("zh-CN");

export default function VideoPage(){
  const params=useParams<{id:string}>();
  const router=useRouter();
  const id=params?.id;
  const [video,setVideo]=useState<Video|null>(null);
  const [comments,setComments]=useState<Comment[]>([]);
  const [userId,setUserId]=useState<string|null>(null);
  const [liked,setLiked]=useState(false);
  const [saved,setSaved]=useState(false);
  const [following,setFollowing]=useState(false);
  const [text,setText]=useState("");
  const [loading,setLoading]=useState(true);
  const [sending,setSending]=useState(false);
  const [toast,setToast]=useState("");

  useEffect(()=>{let alive=true;(async()=>{
    if(!supabase||!id){setLoading(false);return;}
    const [{data:{session}},{data:v,error}]=await Promise.all([
      supabase.auth.getSession(),
      supabase.from("videos").select("id,url,title,music,like_count,comment_count,user_id,created_at,profiles(username,nickname,avatar_url)").eq("id",id).maybeSingle()
    ]);
    if(!alive)return;
    const uid=session?.user.id??null;setUserId(uid);
    if(error||!v){setLoading(false);return;}
    const profile=Array.isArray((v as any).profiles)?(v as any).profiles[0]:(v as any).profiles;
    setVideo({...v as any,profile});
    if(uid){
      const [{data:l},{data:f}]=await Promise.all([
        supabase.from("likes").select("video_id").eq("user_id",uid).eq("video_id",id).maybeSingle(),
        supabase.from("follows").select("following_id").eq("follower_id",uid).eq("following_id",v.user_id).maybeSingle()
      ]);
      setLiked(!!l);setFollowing(!!f);
      await supabase.from("video_events").insert({user_id:uid,video_id:id,event_type:"impression"});
    }
    await loadComments(id);
    setLoading(false);
  })();return()=>{alive=false}},[id]);

  async function loadComments(videoId:string){
    if(!supabase)return;
    const {data}=await supabase.from("comments").select("id,content,created_at,user_id").eq("video_id",videoId).order("created_at",{ascending:false}).limit(100);
    const rows=data||[];const ids=[...new Set(rows.map((x:any)=>x.user_id))];let ps:any[]=[];
    if(ids.length){const r=await supabase.from("profiles").select("id,username,nickname,avatar_url").in("id",ids);ps=r.data||[];}
    setComments(rows.map((x:any)=>{const p=ps.find((z:any)=>z.id===x.user_id);return {...x,username:p?.username||p?.nickname||"星流用户",avatar_url:p?.avatar_url||null}}));
  }
  function needLogin(){setToast("登录后才能操作");setTimeout(()=>router.push("/auth"),450)}
  async function toggleLike(){if(!video||!supabase)return;if(!userId)return needLogin();const next=!liked;setLiked(next);setVideo(v=>v?{...v,like_count:Math.max(0,v.like_count+(next?1:-1))}:v);if(next)await supabase.from("likes").insert({video_id:video.id,user_id:userId});else await supabase.from("likes").delete().eq("video_id",video.id).eq("user_id",userId);await supabase.from("video_events").insert({user_id:userId,video_id:video.id,event_type:next?"like":"unlike"});}
  async function toggleFollow(){if(!video||!supabase)return;if(!userId)return needLogin();if(video.user_id===userId)return;const next=!following;setFollowing(next);if(next)await supabase.from("follows").insert({follower_id:userId,following_id:video.user_id});else await supabase.from("follows").delete().eq("follower_id",userId).eq("following_id",video.user_id);}
  async function submit(e:React.FormEvent){e.preventDefault();const value=text.trim();if(!value||!video||!supabase)return;if(!userId)return needLogin();setSending(true);const {data,error}=await supabase.from("comments").insert({video_id:video.id,user_id:userId,content:value}).select("id,content,created_at,user_id").single();if(!error&&data){setComments(c=>[{...data,username:"我",avatar_url:null},...c]);setVideo(v=>v?{...v,comment_count:v.comment_count+1}:v);setText("");await supabase.from("video_events").insert({user_id:userId,video_id:video.id,event_type:"comment"});}else setToast("评论失败，请稍后重试");setSending(false);}
  async function share(){if(!video)return;const url=window.location.href;if(navigator.share)await navigator.share({title:video.title||"星流视频",url}).catch(()=>{});else{await navigator.clipboard?.writeText(url);setToast("链接已复制");}}
  async function save(){if(!video)return;if(!userId)return needLogin();setSaved(v=>!v);setToast(saved?"已取消收藏":"已收藏");}

  if(loading)return <main className="video-detail-loading">正在加载视频…</main>;
  if(!video)return <main className="video-detail-loading"><div><h2>视频不存在</h2><button onClick={()=>router.back()}>返回</button></div></main>;
  const name=video.profile?.username||video.profile?.nickname||"星流用户";const avatar=video.profile?.avatar_url;const initial=(video.profile?.nickname||name||"星").slice(0,1);
  return <main className="video-detail">
    <header className="video-detail-head"><button onClick={()=>router.back()}><ArrowLeft/></button><strong>视频</strong><button onClick={share}><Share2/></button></header>
    <section className="video-stage"><video src={video.url} controls autoPlay playsInline loop /></section>
    <section className="video-detail-body">
      <div className="creator"><button className="creator-avatar" onClick={()=>router.push(`/u/${video.user_id}`)}>{avatar?<img src={avatar} alt=""/>:initial}</button><div className="creator-meta"><button className="creator-name" onClick={()=>router.push(`/u/${video.user_id}`)}>@{name}</button><span>{new Date(video.created_at).toLocaleDateString("zh-CN")}</span></div>{video.user_id!==userId&&<button className={following?"detail-follow following":"detail-follow"} onClick={toggleFollow}>{following?"已关注":"+ 关注"}</button>}</div>
      <h1>{video.title||""}</h1><p className="detail-music">♫ {video.music||"原创音乐 · 星流"}</p>
      <div className="detail-actions"><button className={liked?"detail-action liked":"detail-action"} onClick={toggleLike}><Heart fill={liked?"currentColor":"none"}/><b>{fmt(video.like_count)}</b></button><button className="detail-action" onClick={()=>document.getElementById("comment-input")?.focus()}><MessageCircle/><b>{fmt(video.comment_count)}</b></button><button className={saved?"detail-action saved":"detail-action"} onClick={save}><Bookmark fill={saved?"currentColor":"none"}/><b>{saved?"已收藏":"收藏"}</b></button><button className="detail-action" onClick={share}><Share2/><b>分享</b></button></div>
    </section>
    <section className="detail-comments"><div className="detail-comments-title">评论 {video.comment_count}</div>{comments.length?comments.map(c=><article className="detail-comment" key={c.id}><div className="comment-avatar">{c.avatar_url?<img src={c.avatar_url} alt=""/>:c.username.slice(0,1)}</div><div><strong>@{c.username}</strong><p>{c.content}</p><small>{new Date(c.created_at).toLocaleString("zh-CN")}</small></div></article>):<div className="no-comments">还没有评论，来抢沙发 👋</div>}</section>
    <form className="detail-comment-form" onSubmit={submit}><input id="comment-input" value={text} onChange={e=>setText(e.target.value)} placeholder={userId?"说点什么…":"登录后发表评论"} onFocus={()=>{if(!userId)needLogin()}}/><button disabled={sending||!text.trim()}><Send size={19}/></button></form>
    <nav className="detail-bottom"><button onClick={()=>router.push("/")}><UserRound/><span>首页</span></button><button onClick={()=>router.push("/upload")} className="detail-plus">＋</button><button onClick={()=>router.push(userId?"/profile":"/auth")}><UserRound/><span>我</span></button></nav>
    {toast&&<div className="detail-toast">{toast}</div>}
  </main>;
}
