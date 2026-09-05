import { RotateCcw } from "lucide-react";
import Card from "../ui/Card";
import SectionLabel from "../ui/SectionLabel";
import { SUBJECT_META } from "../../constants";

// Matérias que precisam de revisão (evolutionService.getSubjectsToReview):
// acerto real < 60% ou revisão pendente atrasada, agregado por matéria.
// Substitui a antiga "Distribuição de domínio". Gratuito, sem paywall.
// `onSelect` (opcional) recebe o subjectId — abre a Biblioteca filtrada.
export default function ReviewNeededCard({ subjects = [], onSelect }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <SectionLabel>Matérias para rever</SectionLabel>
      {subjects.length === 0 ? (
        <Card style={{ padding: "22px 20px", margin: 0, textAlign: "center" }}>
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: "#64748B", margin: 0 }}>
            Nenhuma matéria precisando de revisão agora.
          </p>
        </Card>
      ) : (
        <Card style={{ padding: "8px 20px", margin: 0 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {subjects.map((s, i) => {
              const color = SUBJECT_META[s.name]?.color || "#2563EB";
              const divider = i < subjects.length - 1 ? "1px solid #F1F5F9" : "none";
              const row = (
                <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
                  <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: "50%", background: color, flexShrink: 0 }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 700, color: "#111827", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {s.name}
                    </p>
                    <p style={{ fontFamily: "Inter,sans-serif", fontSize: 11, color: "#94A3B8", margin: "1px 0 0" }}>
                      {s.reason} · {s.count} {s.count === 1 ? "conteúdo" : "conteúdos"}
                    </p>
                  </div>
                  <RotateCcw size={15} color="#F59E0B" style={{ flexShrink: 0 }} />
                </div>
              );
              return onSelect ? (
                <button
                  key={s.subjectId ?? s.name}
                  onClick={() => onSelect(s.subjectId)}
                  style={{ display: "flex", width: "100%", textAlign: "left", background: "none", border: "none", borderBottom: divider, padding: "12px 0", cursor: "pointer", minHeight: 44 }}
                >
                  {row}
                </button>
              ) : (
                <div key={s.subjectId ?? s.name} style={{ padding: "12px 0", borderBottom: divider }}>{row}</div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
