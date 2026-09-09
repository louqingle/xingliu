export default function Loading() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        background: "#050505",
        color: "#aaa",
        fontFamily: "-apple-system,BlinkMacSystemFont,Segoe UI,PingFang SC,Microsoft YaHei,sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 42,
            height: 42,
            margin: "0 auto 14px",
            border: "3px solid #333",
            borderTopColor: "#fff",
            borderRadius: "50%",
            animation: "xingliu-spin .8s linear infinite",
          }}
        />
        <div style={{ fontSize: 14 }}>正在进入星流…</div>
        <style>{`@keyframes xingliu-spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </main>
  );
}
