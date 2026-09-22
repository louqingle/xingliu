"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search, Menu, UserRoundPlus, UsersRound, Pencil, ShoppingBag, Clock3, WalletCards, Bell, Grid2X2, Plus, MessageCircle, X, ChevronRight, Heart, Bookmark, History, Settings, HelpCircle, FileText, LogOut, Camera, Play, Sparkles } from "lucide-react";
import { supabase } from "../../lib/supabase";

type Video={id:string;video_url:string;cover_url:string|null;title:string|null;like_count:number;created_at:string};

export default function ProfilePage(){
  const [session,setSession]=useState<any>(null);
  const [profile,setProfile]=useState<any>(null);
  const [videos,setVideos]=useState<Video[]>([]);
  const [drafts,setDrafts]=useState(0);
  const [privateCount,setPrivateCount]=useState(0);
  const [followers,setFollowers]=useState(0);
  const [following,setFollowing]=useState(0);
  const [likes,setLikes]=useState(0);
  const [mutual,setMutual]=useState(0);
  const [tab,setTab]=useState("作品");
  const [panel,setPanel]=useState(false);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{(async()=>{
    const {data:{session}}=await supabase.auth.getSession();
    if(!session){setLoading(false);return}
    setSession(session);
    const uid=session.user.id;
    const [p,v,d,pr,fo,fr,lk]=await Promise.all([
      supabase.from("profiles").select("*").eq("id",uid).maybeSingle(),
      supabase.from("videos").select("id,video_url,cover_url,title,like_count,created_at").eq("user_id",uid).eq("status","published").order("created_at",{ascending:false}).limit(60),
      supabase.from("videos").select("id",{count:"exact",head:true}).eq("user_id",uid).eq("status","draft"),
      supabase.from("videos").select("id",{count:"exact",head:true}).eq("user_id",uid).eq("status","private"),
      supabase.from("follows").select("following_id",{count:"exact",head:true}).eq("follower_id",uid),
      supabase.from("follows").select("follower_id",{count:"exact",head:true}).eq("following_id",uid),
      supabase.from("likes").select("video_id",{count:"exact",head:true}).eq("user_id",uid)
    ]);
    setProfile(p.data); setVideos((v.data||[]) as Video[]); setDrafts(d.count||0); setPrivateCount(pr.count||0);
    setFollowing(fo.count||0); setFollowers(fr.count||0); setLikes((v.data||[]).reduce((n:any,x:any)=>n+(x.like_count||0),0));
    setLoading(false);
  })()},[]);

  const name=profile?.display_name||profile?.nickname||session?.user?.email?.split("@")[0]||"星流用户";
  const avatar=profile?.avatar_url||"/icon.svg";
  const xingliuId=profile?.username||session?.user?.id?.slice(0,8)||"xingliu";
  const bio=profile?.bio||"点击添加介绍，让大家认识你…";
  const tags=Array.isArray(profile?.tags)?profile.tags:[];

  if(loading)return <main className="loading">加载中…</main>;

  const content=tab==="作品"?videos:[];

  return <main className="page"><div className="scrollArea">
    <style jsx global>{`
      *{box-sizing:border-box}
      html,body{margin:0;padding:0;background:#f6f7f8;color:#16171d;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","PingFang SC","Microsoft YaHei",sans-serif}
      button{font:inherit;cursor:pointer}a{text-decoration:none;color:inherit}
      .page{height:100dvh;min-height:100dvh;background:#f6f7f8;overflow:hidden;position:relative} .scrollArea{height:100%;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;overscroll-behavior-y:auto;padding-bottom:calc(72px + env(safe-area-inset-bottom))}
      .hero{height:235px;position:relative;overflow:hidden;color:#fff;background:linear-gradient(180deg,#8bb7d0 0%,#527c95 38%,#34474d 73%,#252a2d 100%);background-image:linear-gradient(180deg,#0000 0%,#0002 42%,#000b 100%),url("${profile?.background_url||""}");background-size:cover;background-position:center}
      .hero:before{content:"";position:absolute;inset:0;background:radial-gradient(ellipse at 15% 28%,#ffffff22 0 10%,transparent 34%),linear-gradient(170deg,transparent 44%,#0008 100%)}
      .hero:after{content:"";position:absolute;left:-10%;right:-10%;bottom:18px;height:130px;background:radial-gradient(ellipse at 70% 60%,#10171988,transparent 58%),linear-gradient(180deg,transparent,#151a1c99);opacity:.9}
      .top{position:absolute;z-index:4;top:max(8px,env(safe-area-inset-top));left:0;right:0;padding:0 10px;display:flex;align-items:center;justify-content:space-between}
      .topRight{display:flex;gap:4px}
      .glass{height:34px;border:0;border-radius:23px;background:#17232c66;color:#fff;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);box-shadow:inset 0 0 0 1px #ffffff18}
      .pill{padding:0 9px;gap:4px;font-weight:650;font-size:13px;white-space:nowrap}.icon{width:34px}
      .heroInfo{position:absolute;z-index:3;left:17px;right:16px;bottom:14px;display:flex;align-items:flex-end;gap:14px}
      .avatarWrap{position:relative;flex:none}
      .avatar{width:104px;height:104px;border-radius:50%;object-fit:cover;background:#05050a;border:3px solid #fff;box-shadow:0 3px 18px #0008}
      .add{position:absolute;right:-1px;bottom:1px;width:30px;height:30px;border-radius:50%;border:3px solid #fff;background:#35cf55;color:#fff;display:grid;place-items:center}
      .identity{padding-bottom:3px;text-shadow:0 2px 7px #0009}.nameRow{display:flex;align-items:center;gap:8px}.name{font-size:22px;font-weight:850}.badge{background:#f32e58;border-radius:10px;padding:2px 6px;font-size:10px;font-weight:800}.id{font-size:11px;color:#ddd;margin-top:9px}.ai{margin-top:7px;width:max-content;padding:6px 10px;border:0;border-radius:20px;background:#ffffff22;color:#fff;font-weight:750;backdrop-filter:blur(8px)}
      .sheet{position:relative;z-index:5;margin-top:-1px;background:#fff;border-radius:10px 10px 0 0;min-height:calc(100dvh - 170px);padding-top:4px}
      .stats{display:grid;grid-template-columns:repeat(4,1fr);align-items:center;height:55px}.stat{text-align:center}.stat b{display:block;font-size:18px;line-height:1;font-weight:850}.stat span{display:block;margin-top:4px;color:#696b72;font-size:11px}
      .edit{height:34px;margin:0 16px 6px;border:0;border-radius:8px;background:#f4f4f6;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px}
      .bioRow{padding:5px 16px 1px;color:#686a70;font-size:13px;display:flex;align-items:center;gap:5px}.bioRow a{color:#666}
      .tags{padding:5px 16px 8px;display:flex;gap:7px;flex-wrap:wrap}.tag{border:0;background:#f5f5f6;border-radius:5px;color:#777;padding:4px 7px;font-size:10px}.tag.addTag{border:1px solid #eee;background:#fafafa}
      .quick{display:grid;grid-template-columns:repeat(5,1fr);padding:7px 5px 9px}.q{border:0;background:none;display:flex;flex-direction:column;align-items:center;gap:5px;color:#25262b;font-size:10px}.q svg{width:22px;height:22px;stroke-width:1.7}
      .promo{margin:0 16px 9px;height:48px;border:1px solid #e8e8ea;border-radius:9px;display:flex;align-items:center;padding:9px 10px;gap:11px;position:relative;overflow:hidden}.promoImg{width:42px;height:38px;border-radius:6px;background:linear-gradient(145deg,#111,#444);display:grid;place-items:center;color:#fff}.promoText{flex:1}.promoText b{display:block;font-size:11px}.promoText span{display:block;color:#888;margin-top:3px;font-size:9px}.promoBtn{border:0;border-radius:6px;background:#fff0f3;color:#ef3b65;font-weight:800;padding:6px 8px;font-size:10px}.promoX{position:absolute;right:4px;top:4px;border:0;background:none;color:#aaa}
      .tabs{height:39px;display:grid;grid-template-columns:repeat(5,1fr);border-bottom:1px solid #eee;position:sticky;top:0;background:#fffffff8;z-index:10}.tab{border:0;background:none;color:#777;font-size:12px;position:relative}.tab.on{color:#17181d;font-weight:850}.tab.on:after{content:"";position:absolute;left:50%;bottom:0;transform:translateX(-50%);height:3px;width:46px;background:#17181d;border-radius:4px}
      .private{margin:9px 16px 12px;height:43px;border:1px solid #e6e7e9;border-radius:8px;display:flex;align-items:center;padding:0 14px;gap:10px}.privateThumb{width:35px;height:31px;border-radius:4px;background:linear-gradient(135deg,#ddd,#777);display:grid;place-items:center;color:#fff}.privateText{font-weight:800;font-size:12px}.privateText small{display:block;color:#999;font-weight:400;margin-top:2px;font-size:9px}.privateCount{margin-left:auto;color:#777;display:flex;align-items:center}
      .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;background:#f3f3f3}.tile{position:relative;aspect-ratio:3/4;background:#ddd;overflow:hidden}.tile img,.tile video{width:100%;height:100%;object-fit:cover}.tileShade{position:absolute;inset:55% 0 0;background:linear-gradient(transparent,#0008)}.draft{position:absolute;left:8px;top:8px;background:#fff;color:#333;padding:5px 8px;border-radius:5px;font-size:12px;font-weight:750}.tileMeta{position:absolute;bottom:7px;left:8px;color:#fff;font-size:12px;text-shadow:0 1px 5px #000}.empty{text-align:center;padding:75px 20px 180px;color:#999}.empty a{display:inline-block;margin-top:10px;color:#f13b62;font-weight:750}
      .bottom{position:absolute;z-index:30;left:0;right:0;bottom:0;height:55px;background:#fff;border-top:1px solid #eee;display:grid;grid-template-columns:repeat(5,1fr);padding-bottom:env(safe-area-inset-bottom)}.nav{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font-weight:700;font-size:12px;color:#676870;min-height:55px}.nav.active{color:#17181d}.publish{width:38px;height:32px;border:2px solid #17181d;border-radius:11px;display:grid;place-items:center;background:#fff}
      .mask{position:fixed;inset:0;z-index:50;background:#0007;display:flex;align-items:flex-end}.panel{width:100%;max-height:88dvh;overflow:auto;background:#f7f7f8;border-radius:20px 20px 0 0;padding-bottom:24px}.panelHead{height:62px;background:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 18px}.panelHead b{font-size:18px}.close{width:36px;height:36px;border:0;border-radius:50%;background:#f1f1f2;display:grid;place-items:center}.panelUser{margin:10px 12px;background:#fff;border-radius:12px;padding:12px;display:flex;align-items:center;gap:10px}.panelUser img{width:48px;height:48px;border-radius:50%;object-fit:cover}.panelUser main{flex:1}.panelUser b{display:block}.panelUser span{display:block;color:#999;font-size:11px;margin-top:4px}.panelEdit{border:0;background:#f3f3f4;border-radius:16px;padding:7px 10px}.group{margin:14px 12px}.groupTitle{font-size:13px;color:#777;margin:0 4px 8px}.featureGrid{display:grid;grid-template-columns:repeat(4,1fr);background:#fff;border-radius:12px;overflow:hidden}.feature{height:82px;border:0;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;font-size:11px}.links{margin:14px 12px;background:#fff;border-radius:12px;overflow:hidden}.links button{width:100%;height:50px;border:0;border-bottom:1px solid #eee;background:#fff;display:flex;align-items:center;gap:10px;padding:0 15px;text-align:left}.links button:last-child{border:0}.logout{color:#e83d5d;justify-content:center}
      .loading{min-height:100dvh;display:grid;place-items:center;color:#999}
      @media(max-width:520px){.heroInfo{left:17px;gap:14px}.avatar{width:104px;height:104px}.name{font-size:22px}.identity{padding-bottom:3px}.sheet{border-radius:10px 10px 0 0}.stats{height:55px}.edit{margin-left:16px;margin-right:16px}.bioRow,.tags{padding-left:16px;padding-right:16px}}
    `}</style>

    <section className="hero">
      <div className="top">
        <Link href="/" className="glass icon"><ArrowLeft size={20}/></Link>
        <div className="topRight">
          <button className="glass pill" onClick={()=>alert("添加好友功能正在接入")}><UserRoundPlus size={21}/>添加好友</button>
          <button className="glass pill" onClick={()=>alert("新访客功能正在接入")}><UsersRound size={21}/>新访客 14</button>
          <button className="glass icon"><Search size={21}/></button>
          <button className="glass icon" onClick={()=>setPanel(true)}><Menu size={22}/></button>
        </div>
      </div>
      <div className="heroInfo">
        <div className="avatarWrap"><img className="avatar" src={avatar} alt="头像"/><button className="add" onClick={()=>location.href="/settings"}><Plus size={25}/></button></div>
        <div className="identity"><div className="nameRow"><span className="name">{name}</span><span className="badge">13</span></div><div className="id">抖音号：{xingliuId}</div><button className="ai" onClick={()=>alert("AI形象功能正在接入")}>创建 AI 形象 <ChevronRight size={16} style={{verticalAlign:"-3px"}}/></button></div>
      </div>
    </section>

    <section className="sheet">
      <div className="stats">
        <div className="stat"><b>{likes}</b><span>获赞</span></div>
        <div className="stat"><b>{mutual}</b><span>互关</span></div>
        <div className="stat"><b>{following}</b><span>关注</span></div>
        <div className="stat"><b>{followers}</b><span>粉丝</span></div>
      </div>
      <Link className="edit" href="/settings">编辑主页</Link>
      <div className="bioRow"><span>{bio}</span><Link href="/settings"><Pencil size={17}/></Link></div>
      <div className="tags">{tags.slice(0,5).map((t:string)=><span className="tag" key={t}>{t}</span>)}<Link className="tag addTag" href="/settings">＋ 添加性别等标签</Link></div>

      <div className="quick">
        <Link className="q" href="/orders"><ShoppingBag/><span>我的订单</span></Link>
        <Link className="q" href="/history"><Clock3/><span>观看历史</span></Link>
        <Link className="q" href="/wallet"><WalletCards/><span>我的钱包</span></Link>
        <Link className="q" href="/notifications"><Bell/><span>我的预约</span></Link>
        <button className="q" onClick={()=>setPanel(true)}><Grid2X2/><span>全部功能</span></button>
      </div>

      <div className="promo"><div className="promoImg"><Camera size={25}/></div><div className="promoText"><b>德系性能车</b><span>1.3万人参与</span></div><button className="promoBtn" onClick={()=>location.href="/upload"}><Camera size={15}/> 去发布</button><button className="promoX">×</button></div>

      <div className="tabs">{["作品","日常","推荐","收藏","喜欢"].map(t=><button key={t} className={tab===t?"tab on":"tab"} onClick={()=>setTab(t)}>{t}</button>)}</div>

      <div className="private"><div className="privateThumb"><Camera size={19}/></div><div className="privateText">私密作品<small>仅自己可见</small></div><div className="privateCount">{privateCount} <ChevronRight size={17}/></div></div>

      {content.length>0?<div className="grid">{content.map(v=><Link href={`/video/${v.id}`} className="tile" key={v.id}>{v.cover_url?<img src={v.cover_url} alt=""/>:<video src={v.video_url} muted playsInline preload="metadata"/>}<span className="tileShade"/><span className="tileMeta">♥ {v.like_count||0}</span></Link>)}</div>:<div className="empty"><Grid2X2 size={36}/><div>{tab==="作品"?"还没有公开作品":tab+"内容暂时为空"}</div><Link href="/upload">发布作品</Link></div>}

    </section>
    </div>

    <nav className="bottom">
        <Link className="nav" href="/">首页</Link><Link className="nav" href="/discover">朋友</Link><Link className="nav" href="/upload"><span className="publish"><Plus size={28}/></span></Link><Link className="nav" href="/messages"><MessageCircle/><span>消息</span></Link><Link className="nav active" href="/profile"><span style={{fontSize:24,fontWeight:900}}>我</span><span>我</span></Link>
    </nav>

    {panel&&<div className="mask" onClick={()=>setPanel(false)}><section className="panel" onClick={e=>e.stopPropagation()}>
      <header className="panelHead"><b>全部功能</b><button className="close" onClick={()=>setPanel(false)}><X size={19}/></button></header>
      <div className="panelUser"><img src={avatar} alt=""/><main><b>{name}</b><span>星流号：{xingliuId}</span></main><button className="panelEdit" onClick={()=>location.href="/settings"}>编辑资料</button></div>
      <FeatureGroup title="我的内容" items={[["作品",Grid2X2],["收藏",Bookmark],["喜欢",Heart],["历史",History]]}/>
      <FeatureGroup title="社交互动" items={[["粉丝",UsersRound],["关注",UserRoundPlus],["消息",MessageCircle],["通知",Bell]]}/>
      <FeatureGroup title="创作与服务" items={[["发布",Plus],["创作者中心",Sparkles],["钱包",WalletCards],["预约",Clock3]]}/>
      <div className="links"><button onClick={()=>location.href="/settings"}><Settings size={18}/>设置与隐私<ChevronRight/></button><button onClick={()=>alert("帮助与反馈正在接入")}><HelpCircle size={18}/>帮助与反馈<ChevronRight/></button><button onClick={()=>alert("星流用户协议与隐私政策")}><FileText size={18}/>用户协议与隐私<ChevronRight/></button><button className="logout" onClick={async()=>{await supabase.auth.signOut();location.href="/"}}><LogOut size={18}/>退出登录</button></div>
    </section></div>}
  </main>
}

function FeatureGroup({title,items}:{title:string;items:any[]}){
  return <section className="group"><div className="groupTitle">{title}</div><div className="featureGrid">{items.map(([label,Icon]:any)=><button className="feature" key={label} onClick={()=>alert(label+"功能正在接入")}><Icon size={22}/><span>{label}</span></button>)}</div></section>
}
