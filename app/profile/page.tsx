"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Menu, Plus, Grid2X2, X } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function ProfilePage() {
  const [name, setName] = useState("星流用户");
  const [panel, setPanel] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase?.auth.getSession() || { data: { session: null } };
      const session = data.session;
      if (!session) return;
      const { data: profile } = await supabase.from("profiles").select("display_name,nickname").eq("id", session.user.id).maybeSingle();
      setName(profile?.display_name || profile?.nickname || "星流用户");
    })();
  }, []);

  return (
    <main className="page">
      <style jsx global>{`
        *{box-sizing:border-box}html,body{margin:0;background:#f7f7f8;color:#17181d;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif}button{font:inherit;cursor:pointer}a{text-decoration:none;color:inherit}.page{min-height:100dvh;padding-bottom:80px}.cover{height:350px;position:relative;background:linear-gradient(180deg,#86aec9,#b7ced7 40%,#263337)}.top{position:absolute;top:0;left:0;right:0;display:flex;justify-content:space-between;padding:20px}.glass{border:0;border-radius:22px;background:#18202666;color:#fff;width:45px;height:42px;display:grid;place-items:center}.hero{position:absolute;left:24px;bottom:25px;color:#fff}.avatar{width:140px;height:140px;border-radius:50%;border:4px solid #fff;background:#111;object-fit:cover}.name{font-size:28px;font-weight:800;margin-top:12px}.handle{margin-top:5px;color:#eee}.content{margin-top:-1px;background:#fff;border-radius:24px 24px 0 0;position:relative;padding-top:20px}.stats{display:grid;grid-template-columns:repeat(4,1fr);text-align:center}.stats b{display:block;font-size:24px}.stats span{color:#777;font-size:14px}.edit{display:block;margin:20px 22px;height:50px;border-radius:9px;background:#f1f1f3;text-align:center;padding:14px;font-weight:800}.quick{display:grid;grid-template-columns:repeat(5,1fr);padding:18px 8px;border-bottom:1px solid #eee}.q{border:0;background:none;display:flex;flex-direction:column;align-items:center;gap:8px;font-size:12px}.tabs{display:grid;grid-template-columns:repeat(5,1fr);height:60px}.tab{border:0;background:none;color:#777}.tab.on{color:#111;font-weight:800;border-bottom:3px solid #111}.empty{text-align:center;padding:70px;color:#888}.bottom{position:fixed;bottom:0;left:0;right:0;height:78px;background:#fff;border-top:1px solid #eee;display:grid;grid-template-columns:repeat(5,1fr);z-index:10}.nav{display:grid;place-items:center}.plus{width:52px;height:52px;border:3px solid #111;border-radius:16px;display:grid;place-items:center}.mask{position:fixed;inset:0;background:#0007;z-index:30;display:flex;align-items:flex-end}.panel{width:100%;max-height:88dvh;overflow:auto;background:#f7f7f8;border-radius:22px 22px 0 0;padding-bottom:24px}.panelHead{height:65px;background:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 20px}.panelHead button{border:0;border-radius:50%;width:38px;height:38px}.panelProfile{margin:12px;padding:14px;background:#fff;border-radius:14px;font-weight:800}.group{margin:14px 12px}.group h3{font-size:14px}.grid{display:grid;grid-template-columns:repeat(4,1fr);background:#fff;border-radius:14px;overflow:hidden}.item{min-height:90px;border:0;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font-size:12px}.links{margin:12px;background:#fff;border-radius:14px;overflow:hidden}.links button{width:100%;height:52px;border:0;border-bottom:1px solid #eee;background:#fff;text-align:left;padding:0 16px}.links button:last-child{border:0}
      `}</style>
      <section className="cover"><div className="top"><Link href="/"><span className="glass">‹</span></Link><button className="glass" onClick={() => setPanel(true)}><Menu size={22}/></button></div><div className="hero"><img className="avatar" src="/icon.svg" alt="头像"/><div className="name">{name}</div><div className="handle">星流号：xingliu</div></div></section>
      <section className="content"><div className="stats"><div><b>0</b><span>获赞</span></div><div><b>0</b><span>互关</span></div><div><b>0</b><span>关注</span></div><div><b>0</b><span>粉丝</span></div></div><Link className="edit" href="/settings">编辑主页</Link><div className="quick"><Link className="q" href="/orders">🛍️<span>我的订单</span></Link><Link className="q" href="/history">◷<span>观看历史</span></Link><Link className="q" href="/wallet">▣<span>我的钱包</span></Link><Link className="q" href="/notifications">♧<span>我的预约</span></Link><button className="q" onClick={() => setPanel(true)}><Grid2X2 size={25}/><span>全部功能</span></button></div><div className="tabs">{["作品","日常","推荐","收藏","喜欢"].map((item) => <button key={item} className={item === "作品" ? "tab on" : "tab"}>{item}</button>)}</div><div className="empty">还没有公开作品<br/><Link href="/upload">发布你的第一个视频 →</Link></div></section>
      {panel && <div className="mask" onClick={() => setPanel(false)}><section className="panel" onClick={(e) => e.stopPropagation()}><header className="panelHead"><b>全部功能</b><button onClick={() => setPanel(false)}><X size={20}/></button></header><div className="panelProfile">{name}<div style={{fontSize:12,color:"#999",marginTop:5}}>星流个人中心</div></div><Group title="我的内容" items={["我的作品","我的收藏","我的喜欢","观看历史"]}/><Group title="社交互动" items={["我的粉丝","我的关注","消息","通知"]}/><Group title="创作与服务" items={["发布作品","创作者中心","我的钱包","我的预约"]}/><div className="links"><button onClick={() => { location.href = "/settings"; }}>⚙️ 设置与隐私</button><button onClick={() => alert("帮助中心正在建设中")}>❓ 帮助与反馈</button><button onClick={() => alert("星流服务协议与隐私政策")}>📄 用户协议与隐私</button></div></section></div>}
      <nav className="bottom"><Link className="nav" href="/">首页</Link><Link className="nav" href="/discover">朋友</Link><Link className="nav" href="/upload"><span className="plus"><Plus size={30}/></span></Link><Link className="nav" href="/messages">消息</Link><Link className="nav" href="/profile">我</Link></nav>
    </main>
  );
}

function Group({ title, items }: { title: string; items: string[] }) {
  return <section className="group"><h3>{title}</h3><div className="grid">{items.map((item) => <button className="item" key={item} onClick={() => alert(`${item}功能正在接入`) }><Grid2X2 size={23}/>{item}</button>)}</div></section>;
}
