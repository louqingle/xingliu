"use client";

import { useEffect, useState } from "react";

const SPLASH_KEY = "xingliu_splash_seen_v2";
const READY_EVENT = "xingliu-home-ready";
const MIN_SHOW_MS = 850;
const MAX_SHOW_MS = 3200;

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    let maxTimer: ReturnType<typeof setTimeout> | undefined;
    let ready = false;
    const startedAt = Date.now();

    try {
      if (sessionStorage.getItem(SPLASH_KEY) === "1") {
        setVisible(false);
        return;
      }
      sessionStorage.setItem(SPLASH_KEY, "1");
    } catch {}

    const leave = () => {
      if (!ready) return;
      const wait = Math.max(0, MIN_SHOW_MS - (Date.now() - startedAt));
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        setLeaving(true);
        hideTimer = setTimeout(() => setVisible(false), 420);
      }, wait);
    };

    const onReady = () => {
      ready = true;
      leave();
    };

    window.addEventListener(READY_EVENT, onReady);

    maxTimer = setTimeout(() => {
      ready = true;
      leave();
    }, MAX_SHOW_MS);

    return () => {
      window.removeEventListener(READY_EVENT, onReady);
      if (hideTimer) clearTimeout(hideTimer);
      if (maxTimer) clearTimeout(maxTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className={`xingliuSplash ${leaving ? "xingliuSplashLeaving" : ""}`} aria-hidden="true">
      <style jsx global>{`
        .xingliuSplash{position:fixed;inset:0;z-index:99999;overflow:hidden;background:#02030a;color:#fff;display:flex;align-items:center;justify-content:center;flex-direction:column;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;opacity:1;transition:opacity .42s ease,transform .42s ease;isolation:isolate}
        .xingliuSplashLeaving{opacity:0;transform:scale(1.025);pointer-events:none}
        .xingliuSpaceGlow{position:absolute;border-radius:50%;filter:blur(45px);opacity:.65;pointer-events:none}
        .xingliuGlowOne{width:42vw;height:42vw;right:-16vw;top:7vh;background:radial-gradient(circle,rgba(47,91,255,.42),transparent 70%)}
        .xingliuGlowTwo{width:55vw;height:55vw;left:-24vw;bottom:5vh;background:radial-gradient(circle,rgba(75,35,255,.35),transparent 68%)}
        .xingliuOrbit{position:absolute;width:135vw;height:48vw;border:1px solid rgba(57,92,255,.28);border-radius:50%;transform:rotate(-25deg);box-shadow:0 0 35px rgba(39,73,255,.13)}
        .orbitOne{top:10%;left:-15%}.orbitTwo{bottom:5%;left:-18%;transform:rotate(-17deg);border-color:rgba(70,118,255,.2)}
        .xingliuStars{position:absolute;inset:0;opacity:.8;background-image:radial-gradient(circle at 13% 38%,#fff 0 1px,transparent 1.8px),radial-gradient(circle at 79% 18%,#6fa4ff 0 1.5px,transparent 2px),radial-gradient(circle at 86% 56%,#fff 0 1px,transparent 2px),radial-gradient(circle at 20% 72%,#7198ff 0 1px,transparent 2px),radial-gradient(circle at 65% 67%,#a18cff 0 1px,transparent 2px),radial-gradient(circle at 49% 15%,#6c8cff 0 1px,transparent 2px);animation:xingliuTwinkle 3.8s ease-in-out infinite}
        .starsTwo{opacity:.38;transform:scale(1.2);animation-delay:1.2s}
        .xingliuBrand{position:relative;z-index:2;display:flex;align-items:center;flex-direction:column;transform:translateY(-2vh);animation:xingliuBrandIn .65s ease-out both}
        .xingliuMark{position:relative;width:150px;height:118px;margin-bottom:12px;transform:rotate(-19deg);filter:drop-shadow(0 0 18px rgba(56,111,255,.65))}
        .xingliuMarkRing{position:absolute;inset:22px 2px 18px 2px;border:11px solid transparent;border-radius:55% 45% 55% 45%;border-top-color:#68a9ff;border-right-color:#9a6cff;border-bottom-color:#168dff;transform:rotate(-11deg);box-shadow:inset 0 0 18px rgba(93,135,255,.35),0 0 12px rgba(73,113,255,.38)}
        .xingliuMarkCore{position:absolute;left:50%;top:50%;width:35px;height:35px;transform:translate(-50%,-50%) rotate(45deg);background:linear-gradient(135deg,#fff 15%,#91b7ff 48%,#9d68ff 80%);clip-path:polygon(50% 0,61% 39%,100% 50%,61% 61%,50% 100%,39% 61%,0 50%,39% 39%);box-shadow:0 0 25px #7ca7ff}
        .xingliuTitle{font-size:48px;line-height:1;font-weight:800;letter-spacing:7px;text-shadow:0 0 24px rgba(122,157,255,.3)}
        .xingliuEnglish{margin-top:11px;font-size:12px;letter-spacing:9px;color:#d7d8e8;transform:translateX(4px)}
        .xingliuTagline{position:absolute;z-index:2;bottom:22%;font-size:14px;letter-spacing:6px;color:rgba(238,240,255,.78);text-shadow:0 0 15px rgba(120,135,255,.2);animation:xingliuFadeUp .8s .25s ease-out both}
        .xingliuLoading{position:absolute;z-index:2;bottom:10.5%;width:150px;height:4px;border-radius:999px;background:rgba(255,255,255,.12);overflow:hidden}
        .xingliuLoading:after{content:"";display:block;width:62%;height:100%;border-radius:999px;background:linear-gradient(90deg,#43a8ff,#7a59ff);box-shadow:0 0 12px rgba(93,109,255,.7);animation:xingliuLoad 3.2s linear forwards}
        @keyframes xingliuLoad{from{transform:translateX(-110%)}to{transform:translateX(0)}}
        @keyframes xingliuTwinkle{0%,100%{opacity:.45}50%{opacity:.95}}
        @keyframes xingliuBrandIn{from{opacity:0;transform:translateY(10px) scale(.96)}to{opacity:1;transform:translateY(-2vh) scale(1)}}
        @keyframes xingliuFadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @media (min-width:700px){.xingliuMark{width:185px;height:145px}.xingliuTitle{font-size:58px}.xingliuTagline{bottom:19%}}
        @media (prefers-reduced-motion:reduce){.xingliuSplash,.xingliuStars,.xingliuLoading:after,.xingliuBrand,.xingliuTagline{animation:none!important;transition:none!important}}
      `}</style>
      <div className="xingliuSpaceGlow xingliuGlowOne" /><div className="xingliuSpaceGlow xingliuGlowTwo" />
      <div className="xingliuOrbit orbitOne" /><div className="xingliuOrbit orbitTwo" />
      <div className="xingliuStars starsOne" /><div className="xingliuStars starsTwo" />
      <div className="xingliuBrand"><div className="xingliuMark"><span className="xingliuMarkCore" /><span className="xingliuMarkRing" /></div><div className="xingliuTitle">星流</div><div className="xingliuEnglish">X I N G L I U</div></div>
      <div className="xingliuTagline">— 记录每一个闪耀瞬间 —</div><div className="xingliuLoading" />
    </div>
  );
}
