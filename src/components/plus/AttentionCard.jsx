import { AlertTriangle } from "lucide-react";
import Card from "../ui/Card";

// Orientação, não erro — âmbar, não vermelho. Conteúdos com acerto real < 60%
// ou com revisão pendente atrasada (evolutionService.getWeakContents).
export default function AttentionCard({ items = [], onSelect }) {
  return (
    <Card style={{ padding: "18px 20px", marginBottom: 20, background: "var(--sv-amber-bg)", border: "1px solid var(--sv-amber-border)" }}>
      <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 800, color: "var(--sv-amber-text)", margin: "0 0 10px" }}>Precisa de atenção</p>
      {items.length === 0 ? (
        <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "var(--sv-amber-text)", margin: 0 }}>
          Nenhum conteúdo precisando de reforço agora. Continue assim!
        </p>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
            {items.map((item) => {
              const label = item.reason === "overdue_review" && item.accuracy == null ? "Revisão atrasada" : `${item.accuracy}%`;
              const row = (
                <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                  <AlertTriangle size={16} color="#F59E0B" style={{ flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 600, color: "#111827", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {item.title}
                    </p>
                    {item.subjectName && (
                      <p style={{ fontFamily: "Inter,sans-serif", fontSize: 11, color: "var(--sv-amber-text)", margin: 0 }}>{item.subjectName}</p>
                    )}
                  </div>
                  <span style={{ fontFamily: "Inter,sans-serif", fontSize: 12, fontWeight: 700, color: "#B45309", marginLeft: "auto", flexShrink: 0 }}>{label}</span>
                </div>
              );
              return onSelect ? (
                <button
                  key={item.contentId}
                  onClick={() => onSelect(item.contentId)}
                  style={{ display: "flex", width: "100%", textAlign: "left", background: "none", border: "none", padding: "6px 0", cursor: "pointer", minHeight: 44 }}
                >
                  {row}
                </button>
              ) : (
                <div key={item.contentId} style={{ padding: "6px 0" }}>{row}</div>
              );
            })}
          </div>
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "var(--sv-amber-text)", margin: 0 }}>
            Esses conteúdos podem precisar de mais uma revisão.
          </p>
        </>
      )}
    </Card>
  );
}
