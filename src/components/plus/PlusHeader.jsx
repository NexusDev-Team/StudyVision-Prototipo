// Subtle-gradient header with the PLUS badge. Long-press-to-reset lands in T4.3.
export default function PlusHeader() {
  return (
    <div style={{ borderRadius: 20, padding: "18px 20px", marginBottom: 20, background: "var(--sv-grad-primary)", backgroundImage: "linear-gradient(135deg, rgba(37,99,235,0.08), rgba(124,58,237,0.08))" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontFamily: "Inter,sans-serif", fontSize: 22, fontWeight: 800, color: "#111827", margin: 0 }}>Study Vision+</h1>
        <span style={{ fontFamily: "Inter,sans-serif", fontSize: 11, fontWeight: 800, letterSpacing: 0.5, color: "white", background: "linear-gradient(135deg,#2563EB,#7C3AED)", padding: "4px 12px", borderRadius: 20 }}>
          PLUS
        </span>
      </div>
      <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: "#64748B", margin: "4px 0 0" }}>Seu aprendizado, acompanhado de perto.</p>
    </div>
  );
}
