export default function StatusBar({ light = false }) {
  const c = light ? "white" : "#111827";
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 48, zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "0 22px 8px", pointerEvents: "none" }}>
      <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 700, color: c, letterSpacing: -0.3 }}>9:41</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 1.5 }}>
          {[4, 6, 8, 10].map((h, i) => (
            <div key={i} style={{ width: 3, height: h, background: c, borderRadius: 2, opacity: i < 3 ? 1 : 0.35 }} />
          ))}
        </div>
        <svg width="16" height="12" viewBox="0 0 16 12" fill={c} opacity="0.9">
          <rect x="0.5" y="0.5" width="13" height="10" rx="1.5" fill="none" stroke={c} strokeWidth="1.2"/>
          <rect x="14" y="3.5" width="1.5" height="4" rx="0.75" fill={c}/>
          <rect x="1.8" y="1.8" width="9" height="7.4" rx="0.8" fill={c} opacity="0.7"/>
        </svg>
      </div>
    </div>
  );
}
