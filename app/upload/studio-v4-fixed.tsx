"use client";

import StudioV4 from "./studio-v4";

export default function StudioV4Fixed() {
  return (
    <>
      <StudioV4 />
      <style jsx global>{`
        /* V4 camera framing fix: show the full camera frame instead of an excessive crop. */
        .stage video {
          object-fit: contain !important;
          background: #000 !important;
        }
        .stage {
          background: #000 !important;
        }
      `}</style>
    </>
  );
}
