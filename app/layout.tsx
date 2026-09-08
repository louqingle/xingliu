import type { Metadata } from "next";
import "./globals.css";
import "./feed-enhance.css";

export const metadata: Metadata = {
  title: "星流 - 短视频社区",
  description: "星流，发现有趣视频，连接真实创作者。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
