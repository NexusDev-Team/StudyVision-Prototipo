// Simulates the photo taken by the camera: a page mockup shot at a slight angle,
// with a camera-style vignette, instead of a generic "file" placeholder.
const LINE_WIDTHS = ["90%", "72%", "84%", "60%", "78%"];

const CORNER_STYLES = [
  { top: 8, left: 8, borderTop: "2px solid rgba(255,255,255,0.55)", borderLeft: "2px solid rgba(255,255,255,0.55)" },
  { top: 8, right: 8, borderTop: "2px solid rgba(255,255,255,0.55)", borderRight: "2px solid rgba(255,255,255,0.55)" },
  { bottom: 8, left: 8, borderBottom: "2px solid rgba(255,255,255,0.55)", borderLeft: "2px solid rgba(255,255,255,0.55)" },
  { bottom: 8, right: 8, borderBottom: "2px solid rgba(255,255,255,0.55)", borderRight: "2px solid rgba(255,255,255,0.55)" },
];

export default function CapturedPageVisual({ item, height = 140 }) {
  return (
    <div style={{ position: "relative", height, borderRadius: 20, overflow: "hidden", background: `linear-gradient(135deg, ${item.subjectColor} 0%, #1e1b4b 100%)`, boxShadow: `0 4px 20px ${item.subjectColor}33` }}>
      {/* Photographed page — real photo when available, mockup for synthetic items */}
      {item.photo ? (
        <img src={item.photo} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "70%", height: "82%", background: "#FAFAF7", borderRadius: 6, transform: "rotate(-4deg)", boxShadow: "0 14px 28px rgba(0,0,0,0.4)", padding: "10%", position: "relative" }}>
            <span style={{ position: "absolute", top: 8, right: 10, fontSize: 18, lineHeight: 1 }}>{item.subjectIcon}</span>
            {LINE_WIDTHS.map((w, i) => (
              <div key={i} style={{ height: 3.5, width: w, borderRadius: 2, marginBottom: 9, background: i === 0 ? item.subjectColor : "#CBD5E1", opacity: i === 0 ? 0.85 : 0.55 }} />
            ))}
          </div>
        </div>
      )}
      {/* Camera vignette */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 42%, transparent 45%, rgba(0,0,0,0.4) 100%)", pointerEvents: "none" }} />
      {/* Capture frame corners */}
      {CORNER_STYLES.map((pos, i) => (
        <div key={i} style={{ position: "absolute", width: 12, height: 12, ...pos }} />
      ))}
    </div>
  );
}
