"use client";

import { useEffect, useState } from "react";

const SPLASH_KEY = "xingliu_splash_seen_v4";
const MIN_SHOW_MS = 1250;
const MAX_SHOW_MS = 3800;

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    let maxTimer: ReturnType<typeof setTimeout> | undefined;
    let progressTimer: ReturnType<typeof setInterval> | undefined;
    let ready = false;
    const startedAt = Date.now();
    const root = document.documentElement;
    const body = document.body;
    const previousRootBg = root.style.backgroundColor;
    const previousBodyBg = body.style.backgroundColor;

    root.style.backgroundColor = "#02030a";
    body.style.backgroundColor = "#02030a";

    try {
      if (sessionStorage.getItem(SPLASH_KEY) === "1") {
        setVisible(false);
        root.style.backgroundColor = previousRootBg;
        body.style.backgroundColor = previousBodyBg;
        return;
      }
      sessionStorage.setItem(SPLASH_KEY, "1");
    } catch {}

    const finish = () => {
      if (!ready) return;
      const wait = Math.max(0, MIN_SHOW_MS - (Date.now() - startedAt));
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        setProgress(100);
        setLeaving(true);
        hideTimer = setTimeout(() => {
          setVisible(false);
          root.style.backgroundColor = previousRootBg;
          body.style.backgroundColor = previousBodyBg;
        }, 560);
      }, wait);
    };

    const onVideoReady = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLVideoElement)) return;
      if (!target.currentSrc && !target.src) return;
      ready = true;
      finish();
    };

    document.addEventListener("loadeddata", onVideoReady, true);
    document.addEventListener("canplay", onVideoReady, true);

    progressTimer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setProgress(Math.min(96, Math.round((elapsed / MAX_SHOW_MS) * 100)));
    }, 40);

    maxTimer = setTimeout(() => {
      ready = true;
      finish();
    }, MAX_SHOW_MS);

    const existingVideo = document.querySelector("video");
    if (existingVideo instanceof HTMLVideoElement) {
      if (existingVideo.readyState >= 2) {
        ready = true;
        finish();
      }
    }

    return () => {
      document.removeEventListener("loadeddata", onVideoReady, true);
      document.removeEventListener("canplay", onVideoReady, true);
      if (hideTimer) clearTimeout(hideTimer);
      if (maxTimer) clearTimeout(maxTimer);
      if (progressTimer) clearInterval(progressTimer);
      root.style.backgroundColor = previousRootBg;
      body.style.backgroundColor = previousBodyBg;
    };
  }, []);

  if (!visible) return null;

  return (
    <div className={`xingliuSplash ${leaving ? "xingliuSplashLeaving" : ""}`} aria-hidden="true">
      <style jsx global>{`
        .xingliuSplash{position:fixed;inset:0;z-index:99999;overflow:hidden;background:#02030a;color:#fff;display:flex;align-items:center;justify-content:center;flex-direction:column;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;opacity:1;transform:scale(1);transition:opacity .56s ease,transform .56s cubic-bezier(.2,.8,.2,1);isolation:isolate;contain:layout paint}
        .xingliuSplash:after{content:"";position:absolute;inset:-20%;background:radial-gradient(circle at 50% 48%,rgba(103,139,255,.13),transparent 28%,rgba(0,0,0,0) 55%);opacity:0;transform:scale(.7);pointer-events:none;transition:opacity .56s ease,transform .7s cubic-bezier(.2,.8,.2,1)}
        .xingliuSplashLeaving:after{opacity:1;transform:scale(1.5)}
        .xingliuSplashLeaving{opacity:0;transform:scale(1.035);pointer-events:none}
        .xingliuSpaceGlow{position:absolute;border-radius:50%;filter:blur(55px);pointer-events:none;animation:xingliuGlow 4s ease-in-out infinite alternate}
        .xingliuGlowOne{width:48vw;height:48vw;right:-18vw;top:2vh;background:radial-gradient(circle,rgba(47,91,255,.5),transparent 70%)}
        .xingliuGlowTwo{width:60vw;height:60vw;left:-28vw;bottom:-2vh;background:radial-gradient(circle,rgba(91,45,255,.4),transparent 68%);animation-delay:1s}
        .xingliuOrbit{position:absolute;width:140vw;height:52vw;border:1px solid rgba(57,112,255,.25);border-radius:50%;transform:rotate(-25deg);box-shadow:0 0 45px rgba(39,73,255,.13);animation:xingliuOrbit 7s linear infinite}
        .orbitOne{top:8%;left:-18%}.orbitTwo{bottom:3%;left:-20%;transform:rotate(-17deg);border-color:rgba(111,82,255,.2);animation-direction:reverse;animation-duration:10s}
        .xingliuStars{position:absolute;inset:0;opacity:.8;background-image:radial-gradient(circle at 13% 38%,#fff 0 1px,transparent 1.8px),radial-gradient(circle at 79% 18%,#6fa4ff 0 1.5px,transparent 2px),radial-gradient(circle at 86% 56%,#fff 0 1px,transparent 2px),radial-gradient(circle at 20% 72%,#7198ff 0 1px,transparent 2px),radial-gradient(circle at 65% 67%,#a18cff 0 1px,transparent 2px),radial-gradient(circle at 49% 15%,#6c8cff 0 1px,transparent 2px);animation:xingliuTwinkle 2.8s ease-in-out infinite}
        .starsTwo{opacity:.35;transform:scale(1.3);animation-delay:1.1s;filter:blur(.3px)}
        .xingliuBrand{position:relative;z-index:2;display:flex;align-items:center;flex-direction:column;transform:translateY(-2vh);animation:xingliuBrandIn .8s cubic-bezier(.2,.8,.2,1) both}
        .xingliuMark{position:relative;width:150px;height:118px;margin-bottom:12px;transform:rotate(-19deg);filter:drop-shadow(0 0 18px rgba(56,111,255,.65));animation:xingliuMarkIn 1s .12s cubic-bezier(.2,.8,.2,1) both}
        .xingliuMarkRing{position:absolute;inset:22px 2px 18px 2px;border:11px solid transparent;border-radius:55% 45% 55% 45%;border-top-color:#68a9ff;border-right-color:#9a6cff;border-bottom-color:#168dff;transform:rotate(-11deg);box-shadow:inset 0 0 18px rgba(93,135,255,.35),0 0 12px rgba(73,113,255,.38);animation:xingliuRing 2.2s ease-in-out infinite}
        .xingliuMarkCore{position:absolute;left:50%;top:50%;width:35px;height:35px;transform:translate(-50%,-50%) rotate(45deg);background:linear-gradient(135deg,#fff 15%,#91b7ff 48%,#9d68ff 80%);clip-path:polygon(50% 0,61% 39%,100% 50%,61% 61%,50% 100%,39% 61%,0 50%,39% 39%);box-shadow:0 0 25px #7ca7ff;animation:xingliuCore 1.8s ease-in-out infinite}
        .xingliuTitle{font-size:48px;line-height:1;font-weight:800;letter-spacing:7px;text-shadow:0 0 24px rgba(122,157,255,.3);animation:xingliuTextIn .7s .3s ease-out both}
        .xingliuEnglish{margin-top:11px;font-size:12px;letter-spacing:9px;color:#d7d8e8;transform:translateX(4px);animation:xingliuTextIn .7s .42s ease-out both}
        .xingliuTagline{position:absolute;z-index:2;bottom:22%;font-size:14px;letter-spacing:6px;color:rgba(238,240,255,.78);text-shadow:0 0 15px rgba(120,135,255,.2);animation:xingliuFadeUp .8s .55s ease-out both}
        .xingliuLoadingWrap{position:absolute;z-index:2;bottom:10.5%;width:170px;display:flex;flex-direction:column;align-items:center;gap:9px}
        .xingliuLoading{width:170px;height:3px;border-radius:999px;background:rgba(255,255,255,.11);overflow:hidden;box-shadow:0 0 12px rgba(70,90,255,.12)}
        .xingliuLoadingBar{height:100%;border-radius:999px;background:linear-gradient(90deg,#43a8ff,#7a59ff,#b46cff);box-shadow:0 0 13px rgba(93,109,255,.8);transition:width .12s linear}
        .xingliuLoadingText{font-size:9px;letter-spacing:3px;color:rgba(255,255,255,.35)}
        @keyframes xingliuTwinkle{0%,100%{opacity:.4}50%{opacity:.95}}
        @keyframes xingliuGlow{from{transform:scale(.92);opacity:.45}to{transform:scale(1.08);opacity:.8}}
        @keyframes xingliuOrbit{from{rotate:0deg}to{rotate:360deg}}
        @keyframes xingliuBrandIn{from{opacity:0;transform:translateY(18px) scale(.9)}to{opacity:1;transform:translateY(-2vh) scale(1)}}
        @keyframes xingliuMarkIn{from{opacity:0;transform:rotate(-19deg) scale(.55)}to{opacity:1;transform:rotate(-19deg) scale(1)}}
        @keyframes xingliuRing{0%,100%{filter:brightness(1);transform:rotate(-11deg) scale(.96)}50%{filter:brightness(1.45);transform:rotate(4deg) scale(1.04)}}
        @keyframes xingliuCore{0%,100%{transform:translate(-50%,-50%) rotate(45deg) scale(.88);box-shadow:0 0 18px #7ca7ff}50%{transform:translate(-50%,-50%) rotate(135deg) scale(1.12);box-shadow:0 0 34px #9db7ff}}
        @keyframes xingliuTextIn{from{opacity:0;letter-spacing:18px;filter:blur(7px)}to{opacity:1;letter-spacing:7px;filter:blur(0)}}
        @keyframes xingliuFadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @media (min-width:700px){.xingliuMark{width:185px;height:145px}.xingliuTitle{font-size:58px}.xingliuTagline{bottom:19%}}
        @media (prefers-reduced-motion:reduce){.xingliuSplash,.xingliuSplash:after,.xingliuStars,.xingliuSpaceGlow,.xingliuOrbit,.xingliuBrand,.xingliuMark,.xingliuMarkRing,.xingliuMarkCore,.xingliuTitle,.xingliuEnglish,.xingliuTagline{animation:none!important;transition:none!important}}
      `}</style>
      <div className="xingliuSpaceGlow xingliuGlowOne" /><div className="xingliuSpaceGlow xingliuGlowTwo" />
      <div className="xingliuOrbit orbitOne" /><div className="xingliuOrbit orbitTwo" />
      <div className="xingliuStars starsOne" /><div className="xingliuStars starsTwo" />
      <div className="xingliuBrand">
        <div className="xingliuMark"><span className="xingliuMarkCore" /><span className="xingliuMarkRing" /></div>
        <div className="xingliuTitle">星流</div><div className="xingliuEnglish">X I N G L I U</div>
      </div>
      <div className="xingliuTagline">— 记录每一个闪耀瞬间 —</div>
      <div className="xingliuLoadingWrap"><div className="xingliuLoading"><div className="xingliuLoadingBar" style={{width:`${progress}%`}} /></div><div className="xingliuLoadingText">ENTERING XINGLIU</div></div>
    </div>
  );
}
