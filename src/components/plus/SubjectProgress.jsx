import Card from "../ui/Card";
import SectionLabel from "../ui/SectionLabel";
import ProgressBar from "../ui/ProgressBar";
import { SUBJECT_META } from "../../constants";

function SubjectRows({ subjects, onSelect }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {subjects.map((s) => {
        const color = SUBJECT_META[s.name]?.color || "#2563EB";
        const value = s.accuracyRate;
        const row = (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 700, color: "#111827" }}>{s.name}</span>
              <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 700, color: value != null ? "#111827" : "#94A3B8" }}>
                {value != null ? `${value}%` : "sem quiz"}
              </span>
            </div>
            <ProgressBar value={value ?? 0} color={color} />
          </>
        );
        return onSelect ? (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer", minHeight: 44 }}
          >
            {row}
          </button>
        ) : (
          <div key={s.id}>{row}</div>
        );
      })}
    </div>
  );
}

// Taxa de acerto real por matéria. Sem matéria ainda: estado vazio, não um card
// em branco. `onSelect` (opcional) recebe o id da matéria tocada — usado pela
// Evolução para abrir a Biblioteca já filtrada. Gratuito por decisão de
// produto (Fase 5): sem paywall aqui.
export default function SubjectProgress({ subjects = [], onSelect }) {
  if (subjects.length === 0) {
    return (
      <div style={{ marginBottom: 20 }}>
        <SectionLabel>Evolução por matéria</SectionLabel>
        <Card style={{ padding: "22px 20px", margin: 0, textAlign: "center" }}>
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: "#64748B", margin: 0 }}>
            Capture um conteúdo e responda um quiz para ver sua evolução por matéria.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <SectionLabel>Evolução por matéria</SectionLabel>
      <Card style={{ padding: "18px 20px", margin: 0, display: "flex", flexDirection: "column", gap: 16 }}>
        <SubjectRows subjects={subjects} onSelect={onSelect} />
      </Card>
    </div>
  );
}
