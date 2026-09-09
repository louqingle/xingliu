"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#050505",
        color: "#fff",
        fontFamily: "-apple-system,BlinkMacSystemFont,Segoe UI,PingFang SC,Microsoft YaHei,sans-serif",
      }}
    >
      <section style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
        <div style={{ fontSize: 42, marginBottom: 12 }}>😵</div>
        <h1 style={{ margin: 0, fontSize: 22 }}>星流出了点小问题</h1>
        <p style={{ color: "#888", fontSize: 14, lineHeight: 1.7, margin: "10px 0 22px" }}>
          页面加载遇到异常，重新加载通常就能恢复。
        </p>
        <button
          onClick={() => reset()}
          style={{
            height: 44,
            padding: "0 24px",
            borderRadius: 10,
            border: 0,
            background: "#fff",
            color: "#111",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          重新加载
        </button>
      </section>
    </main>
  );
}
