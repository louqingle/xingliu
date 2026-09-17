"use client";

import StudioV4 from "./studio-v4";

export default function StudioV4Fixed() {
  return (
    <>
      <StudioV4 />
      <style jsx global>{`
        html,body{margin:0!important;padding:0!important;background:#000!important;overflow:hidden!important}
        .studio{position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important;min-height:100dvh!important;overflow:hidden!important}
        .stage{position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important;min-height:100dvh!important;overflow:hidden!important;background:#000!important}
        .stage video{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;object-fit:cover!important;background:#000!important}
        .top{padding-top:max(12px,env(safe-area-inset-top))!important}
        .bottom{padding-bottom:max(28px,calc(28px + env(safe-area-inset-bottom)))!important}
      `}</style>
    </>
  );
}
