"use client";

import StudioV4 from "./studio-v4";

export default function NoZoomStudio() {
  return (
    <>
      <StudioV4 />
      <style jsx global>{`
        /* 防止前置摄像头因为 9:16 全屏裁切而产生“放大”效果 */
        .stage video {
          object-fit: contain !important;
          object-position: center center !important;
          background: #000 !important;
        }
      `}</style>
    </>
  );
}
