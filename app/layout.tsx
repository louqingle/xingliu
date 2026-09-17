import type { Metadata, Viewport } from "next";
import { X as LucideX } from "lucide-react";
import "./globals.css";
import "./feed-enhance.css";
import "./profile/profile-enhance.css";
import SplashScreen from "./splash-screen";
import VideoFullscreen from "./video-fullscreen";

globalThis.X = LucideX;

export const metadata: Metadata = {
  metadataBase: new URL("https://xingliu.vercel.app"),
  title: {
    default: "星流 - 短视频社区",
    template: "%s | 星流",
  },
  description: "星流，发现有趣视频，连接真实创作者。",
  applicationName: "星流",
  keywords: ["星流", "短视频", "视频社区", "创作者", "短视频平台"],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "星流",
    title: "星流 - 短视频社区",
    description: "发现有趣视频，连接真实创作者。",
  },
  twitter: {
    card: "summary",
    title: "星流 - 短视频社区",
    description: "发现有趣视频，连接真实创作者。",
  },
  appleWebApp: {
    capable: true,
    title: "星流",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#050505",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        <SplashScreen />
        <VideoFullscreen />
        {children}
      </body>
    </html>
  );
}
