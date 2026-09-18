"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Menu, Plus, Search, Pencil, ShoppingBag, Clock3, WalletCards, Bell, Grid2X2, MessageCircle, Heart, Bookmark, Users, UserRoundPlus, Settings, HelpCircle, FileText, LogOut, X, ChevronRight, History, Sparkles, CircleDollarSign, CalendarDays, Play } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function ProfilePage() {
  const [session,setSession]=useState<any>(null);
  const [profile,setProfile]=useState<any>(null);
  const [videos,setVideos]=useState<any[]>([]);
  const [panel,setPanel]=useState(false);
  const [tab,setTab]=useState("作品");
  const [loading,setLoading]=useState(true);

  useEffect(()=>{(async()=>{
    const {data:{session}}=await supabase.auth.getSession();
    if(!session){setLoading(false);return}
    setSession(session);
    const [{data:p},{data:v}]=await Promise.all([
      supabase.from("profiles").select("*").eq("id",session.user.id).maybeSingle(),
      supabase.from("videos").select("id,title,video_url,cover_url,like_count,comment_count,created_at").eq("user_id",session.user.id).eq("status","published").order("created_at",{ascending:false})
    ]);
    setProfile(p);
    setVideos(v||[]);
    setLoading(false);
  })()},[]);

  const name=profile?.display_name||profile?.nickname||session?.user?.email?.split("@")[0]||"星流用户";
  const avatar=profile?.avatar_url||"/icon.svg";
  const id=profile?.username||session?.user?.id?.slice(0,8)||"xingliu";
  const likes=videos.reduce((n,v)=>n+(v.like_count||0),0);

  async function logout(){await supabase.auth.signOut();location.href="/"}

  if(loading)return <main className="loading">加载中…</main>;

  return <main className="page">
    <style jsx global>{`
      *{box-sizing:border-box}
      html,body{margin:0;padding:0;background:#fff;color:#16171b;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","PingFang SC","Microsoft YaHei",sans-serif}
      button{font:inherit;cursor:pointer}a{text-decoration:none;color:inherit}
      .page{min-height:100dvh;background:#fff;padding-bottom:78px}
      .cover{height:405px;position:relative;overflow:hidden;background:#738b95}
      .coverImg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:saturate(.82)}
      .coverShade{position:absolute;inset:0;background:linear-gradient(180deg,#0005 0%,transparent 34%,#0001 55%,#000b 100%)}
      .top{position:absolute;z-index:4;top:0;left:0;right:0;height:72px;padding:14px 18px;display:flex;align-items:center;justify-content:space-between}
      .topRight{display:flex;gap:10px}
      .glass{width:42px;height:42px;border:0;border-radius:50%;background:#0005;color:#fff;display:grid;place-items:center;backdrop-filter:blur(12px)}
      .hero{position:absolute;z-index:3;left:22px;right:22px;bottom:22px;color:#fff}
      .avatarRow{display:flex;align-items:flex-end;gap:14px}
      .avatar{width:92px;height:92px;border-radius:50%;object-fit:cover;border:3px solid #fff;background:#222;box-shadow:0 3px 14px #0006}
      .heroInfo{padding-bottom:3px}
      .name{font-size:27px;font-weight:850;line-height:1.15;text-shadow:0 2px 8px #0009}
      .handle{font-size:13px;margin-top:7px;color:#eee;text-shadow:0 1px 5px #0008}
      .bio{font-size:14px;margin-top:11px;max-width:95%;line-height:1.45;color:#f2f2f2;text-shadow:0 1px 5px #0008}
      .content{position:relative;background:#fff;border-radius:22px 22px 0 0;margin-top:-20px;z-index:5;min-height:500px}
      .stats{height:82px;display:grid;grid-template-columns:repeat(4,1fr);align-items:center}
      .stat{text-align:center}.stat b{display:block;font-size:20px;font-weight:850}.stat span{display:block;color:#777;font-size:12px;margin-top:4px}
      .actions{display:flex;gap:9px;padding:0 18px 16px}
      .edit{height:43px;flex:1;border:0;border-radius:8px;background:#f3f3f4;font-weight:750;display:flex;align-items:center;justify-content:center;gap:5px}
      .action{width:43px;height:43px;border:1px solid #e4e4e6;background:#fff;border-radius:8px;display:grid;place-items:center}
      .quick{display:grid;grid-template-columns:repeat(5,1fr);padding:12px 4px 17px;border-bottom:1px solid #eee}
      .q{border:0;background:#fff;display:flex;flex-direction:column;align-items:center;gap:7px;font-size:11px;color:#333}
      .q svg{width:23px;height:23px;stroke-width:1.8}
      .tabs{height:58px;display:grid;grid-template-columns:repeat(5,1fr);border-bottom:1px solid #eee;position:sticky;top:0;background:#fffffff5;backdrop-filter:blur(10px);z-index:8}
      .tab{border:0;background:none;color:#888;font-size:15px;position:relative}.tab.on{color:#17181d;font-weight:800}.tab.on:after{content:"";position:absolute;left:50%;bottom:0;transform:translateX(-50%);width:34px;height:3px;background:#17181d;border-radius:3px}
      .private{margin:14px 15px;border:1px solid #ededee;border-radius:9px;height:55px;display:flex;align-items:center;padding:0 13px;gap:9px;font-size:13px}.private span{color:#777}.private small{margin-left:auto;color:#999}
      .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;background:#f2f2f2}.tile{aspect-ratio:3/4;position:relative;background:#ddd;overflow:hidden}.tile img,.tile video{width:100%;height:100%;object-fit:cover}.shade{position:absolute;inset:55% 0 0;background:linear-gradient(transparent,#0008)}.meta{position:absolute;left:7px;bottom:7px;color:#fff;font-size:11px;text-shadow:0 1px 4px #000}.play{position:absolute;left:7px;top:7px;width:28px;height:28px;border-radius:50%;background:#0008;color:#fff;display:grid;place-items:center}
      .empty{text-align:center;color:#999;padding:72px 20px;font-size:14px}.empty a{display:inline-block;margin-top:12px;color:#ff3c68;font-weight:750}
      .bottom{position:fixed;z-index:20;left:0;right:0;bottom:0;height:78px;background:#fff;border-top:1px solid #eee;display:grid;grid-template-columns:repeat(5,1fr);padding-bottom:env(safe-area-inset-bottom)}.nav{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;font-size:11px}.plus{width:47px;height:42px;border:2px solid #17181d;border-radius:11px;display:grid;place-items:center;background:#fff}
      .mask{position:fixed;z-index:50;inset:0;background:#0006;display:flex;align-items:flex-end}.panel{width:100%;max-height:86dvh;overflow:auto;background:#f7f7f8;border-radius:20px 20px 0 0;padding-bottom:calc(18px + env(safe-area-inset-bottom));animation:up .2s ease}.panelHead{height:62px;background:#fff;padding:0 18px;display:flex;align-items:center;justify-content:space-between}.panelHead b{font-size:19px}.close{width:36px;height:36px;border:0;border-radius:50%;background:#f1f1f2;display:grid;place-items:center}
      .panelUser{margin:10px 12px;background:#fff;border-radius:12px;padding:12px;display:flex;align-items:center;gap:10px}.panelUser img{width:48px;height:48px;border-radius:50%;object-fit:cover}.panelUser div{flex:1}.panelUser b{display:block;font-size:15px}.panelUser span{display:block;color:#999;font-size:11px;margin-top:4px}.panelUser button{border:0;background:#f3f3f4;border-radius:15px;padding:7px 10px;font-size:12px}
      .group{margin:14px 12px}.groupTitle{font-size:13px;color:#777;margin:0 4px 8px}.featureGrid{display:grid;grid-template-columns:repeat(4,1fr);background:#fff;border-radius:12px;overflow:hidden}.feature{height:84px;border:0;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;font-size:11px}.feature svg{width:22px;height:22px;stroke-width:1.8}.feature.disabled{color:#aaa}.feature.disabled em{font-style:normal;font-size:8px;color:#bbb}
      .links{margin:14px 12px;background:#fff;border-radius:12px;overflow:hidden}.links button{width:100%;height:50px;border:0;border-bottom:1px solid #eee;background:#fff;display:flex;align-items:center;gap:10px;padding:0 15px;text-align:left;font-size:13px}.links button:last-child{border:0}.links button svg:last-child{margin-left:auto;color:#aaa}.links .logout{justify-content:center;color:#e83b58}
      .loading{min-height:100dvh;display:grid;place-items:center;color:#999}
      @keyframes up{from{transform:translateY(100%)}to{transform:translateY(0)}}
      @media(min-width:700px){.page{max-width:760px;margin:auto}.bottom{max-width:760px;left:50%;right:auto;transform:translateX(-50%);width:760px}}
      @media(max-width:420px){.cover{height:385px}.avatar{width:84px;height:84px}.name{font-size:24px}.quick{padding-left:0;padding-right:0}.tab{font-size:14px}}
    `}</style>

    <section className="cover">
      <div className="coverImg" style={{background:"linear-gradient(145deg,#7b9eae 0%,#b8c9cd 36%,#63777a 65%,#20282b 100%)"}} />
      <div className="coverShade"/>
      <div className="top">
        <Link href="/" className="glass"><ArrowLeft size={21}/></Link>
        <div className="topRight"><button className="glass"><Search size={20}/></button><button className="glass" onClick={()=>setPanel(true)}><Menu size={21}/></button></div>
      </div>
      <div className="hero">
        <div className="avatarRow"><img className="avatar" src={avatar} alt="头像"/><div className="heroInfo"><div className="name">{name}</div><div className="handle">星流号：{id}</div></div></div>
        <div className="bio">{profile?.bio||"记录生活，分享每一个瞬间"}</div>
      </div>
    </section>

    <section className="content">
      <div className="stats">
        <div className="stat"><b>{likes}</b><span>获赞</span></div>
        <div className="stat"><b>0</b><span>互关</span></div>
        <div className="stat"><b>0</b><span>关注</span></div>
        <div className="stat"><b>0</b><span>粉丝</span></div>
      </div>
      <div className="actions"><Link href="/settings" className="edit">编辑主页 <Pencil size={15}/></Link><button className="action"><ShareIcon/></button><button className="action" onClick={()=>setPanel(true)}><Menu size={18}/></button></div>
      <div className="quick">
        <Link className="q" href="/orders"><ShoppingBag/><span>我的订单</span></Link>
        <Link className="q" href="/history"><Clock3/><span>观看历史</span></Link>
        <Link className="q" href="/wallet"><WalletCards/><span>我的钱包</span></Link>
        <Link className="q" href="/notifications"><Bell/><span>我的预约</span></Link>
        <button className="q" onClick={()=>setPanel(true)}><Grid2X2/><span>全部功能</span></button>
      </div>
      <div className="tabs">{["作品","日常","推荐","收藏","喜欢"].map(t=><button key={t} className={tab===t?"tab on":"tab"} onClick={()=>setTab(t)}>{t}</button>)}</div>
      {tab==="作品" && <>{videos.length>0?<div className="grid">{videos.map(v=><Link className="tile" href={`/video/${v.id}`} key={v.id}>{v.cover_url?<img src={v.cover_url} alt=""/>:<video src={v.video_url} muted playsInline preload="metadata"/>}<span className="shade"/><span className="play"><Play size={13} fill="white"/></span><span className="meta">♥ {v.like_count||0}</span></Link>)}</div>:<div className="empty"><Grid2X2 size={34}/><div>还没有公开作品</div><Link href="/upload">发布你的第一个视频</Link></div>}</>}
      {tab!=="作品" && <div className="empty"><Grid2X2 size={34}/><div>{tab}内容将在这里显示</div></div>}
      <div className="private"><span>▣</span><b>私密作品</b><small>仅自己可见 <ChevronRight size={15}/></small></div>
    </section>

    {panel&&<div className="mask" onClick={()=>setPanel(false)}><section className="panel" onClick={e=>e.stopPropagation()}>
      <header className="panelHead"><b>全部功能</b><button className="close" onClick={()=>setPanel(false)}><X size={19}/></button></header>
      <div className="panelUser"><img src={avatar} alt=""/><div><b>{name}</b><span>星流号：{id}</span></div><button onClick={()=>location.href="/settings"}>编辑资料 <ChevronRight size={13}/></button></div>
      <FeatureGroup title="我的内容" items={[["作品",Grid2X2],["收藏",Bookmark],["喜欢",Heart],["历史",History]]}/>
      <FeatureGroup title="社交互动" items={[["粉丝",Users],["关注",UserRoundPlus],["消息",MessageCircle],["通知",Bell]]}/>
      <FeatureGroup title="创作与服务" items={[["发布",Plus],["创作者中心",Sparkles],["钱包",CircleDollarSign],["预约",CalendarDays]]}/>
      <div className="links"><button onClick={()=>location.href="/settings"}><Settings size={18}/>设置与隐私<ChevronRight/></button><button onClick={()=>alert("帮助与反馈功能正在接入")}><HelpCircle size={18}/>帮助与反馈<ChevronRight/></button><button onClick={()=>alert("星流用户协议与隐私政策")}><FileText size={18}/>用户协议与隐私<ChevronRight/></button><button className="logout" onClick={logout}><LogOut size={18}/>退出登录</button></div>
    </section></div>}

    <nav className="bottom"><Link className="nav" href="/">首页</Link><Link className="nav" href="/discover">朋友</Link><Link className="nav" href="/upload"><span className="plus"><Plus size={27}/></span></Link><Link className="nav" href="/messages"><MessageCircle size={21}/><span>消息</span></Link><Link className="nav" href="/profile"><Users size={21}/><span>我</span></Link></nav>
  </main>
}

function FeatureGroup({title,items}:{title:string;items:any[]}){
  return <section className="group"><div className="groupTitle">{title}</div><div className="featureGrid">{items.map(([label,Icon]:any)=><button className="feature disabled" key={label}><Icon/><span>{label}</span><em>即将上线</em></button>)}</div></section>
}

function ShareIcon(){return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.5-4.4M8.2 13.2l7.5 4.4"/></svg>}
