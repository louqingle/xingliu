import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "星流 - 短视频社区",
    short_name: "星流",
    description: "发现有趣视频，连接真实创作者。",
    start_url: "/",
    display: "standalone",
    background_color: "#050505",
    theme_color: "#050505",
    orientation: "portrait",
  };
}
