"use client";

import { useEffect, useState } from "react";

const SPLASH_KEY = "xingliu_splash_seen_v1";

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
      if (sessionStorage.getItem(SPLASH_KEY) === "1") {
        setVisible(false);
        return;
      }
      sessionStorage.setItem(SPLASH_KEY, "1");
    } catch {
      // If storage is unavailable, still show the splash once for this mount.
    }

    timer = setTimeout(() => {
      setLeaving(true);
      setTimeout(() => setVisible(false), 420);
    }, 1650);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className={`xingliuSplash ${leaving ? "xingliuSplashLeaving" : ""}`} aria-hidden="true">
      <div className="xingliuSpaceGlow xingliuGlowOne" />
      <div className="xingliuSpaceGlow xingliuGlowTwo" />
      <div className="xingliuOrbit orbitOne" />
      <div className="xingliuOrbit orbitTwo" />
      <div className="xingliuStars starsOne" />
      <div className="xingliuStars starsTwo" />

      <div className="xingliuBrand">
        <div className="xingliuMark">
          <span className="xingliuMarkCore" />
          <span className="xingliuMarkRing" />
        </div>
        <div className="xingliuTitle">星流</div>
        <div className="xingliuEnglish">X I N G L I U</div>
      </div>

      <div className="xingliuTagline">— 记录每一个闪耀瞬间 —</div>

      <div className="xingliuLoading" />
    </div>
  );
}
