import Link from "next/link";

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#050505",
        color: "#fff",
        textAlign: "center",
        fontFamily: "-apple-system,BlinkMacSystemFont,Segoe UI,PingFang SC,Microsoft YaHei,sans-serif",
      }}
    >
      <div>
        <div style={{ fontSize: 72, fontWeight: 900, letterSpacing: -4 }}>404</div>
        <h1 style={{ margin: "10px 0 8px", fontSize: 22 }}>这个页面走丢了</h1>
        <p style={{ margin: 0, color: "#888", fontSize: 14 }}>内容可能已删除，或者链接已经失效。</p>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            marginTop: 24,
            height: 44,
            padding: "0 24px",
            alignItems: "center",
            borderRadius: 10,
            background: "#fff",
            color: "#000",
            textDecoration: "none",
            fontWeight: 800,
          }}
        >
          回到星流
        </Link>
      </div>
    </main>
  );
}
