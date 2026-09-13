"use client";

import { useEffect } from "react";

export default function VideoFullscreen() {
  useEffect(() => {
    const onDoubleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLVideoElement)) return;

      event.preventDefault();
      event.stopPropagation();

      const video = target as HTMLVideoElement & {
        webkitEnterFullscreen?: () => void;
      };

      if (document.fullscreenElement) {
        void document.exitFullscreen().catch(() => {});
        return;
      }

      if (typeof video.requestFullscreen === "function") {
        void video.requestFullscreen().catch(() => {});
        return;
      }

      // iPhone Safari fallback.
      video.webkitEnterFullscreen?.();
    };

    document.addEventListener("dblclick", onDoubleClick, true);
    return () => document.removeEventListener("dblclick", onDoubleClick, true);
  }, []);

  return null;
}
