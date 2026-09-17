"use client";

import StudioV4 from "./studio-v4";

export default function StudioV4Fixed() {
  return (
    <>
      <StudioV4 />
      <style jsx global>{`
        /* V4 camera framing fix: prevent the iPhone camera from looking excessively zoomed/cropped. */
        .stage video {
          object-fit: contain !important;
          transform: ${"scaleX(-1)"} !important;
          background: #000 !important;
        }
        .stage {
          background: #000 !important;
        }
      `}</style>
    </>
  );
}
