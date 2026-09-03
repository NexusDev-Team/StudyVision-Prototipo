import Card from "../ui/Card";
import SectionLabel from "../ui/SectionLabel";
import ProgressBar from "../ui/ProgressBar";
import PlusPaywall from "./PlusPaywall";
import { SUBJECT_META } from "../../constants";

function SubjectRows({ subjects }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {subjects.map((s) => {
        const color = SUBJECT_META[s.name]?.color || "#2563EB";
        const value = s.accuracyRate;
        return (
          <div key={s.id}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 700, color: "#111827" }}>{s.name}</span>
              <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 700, color: value != null ? "#111827" : "#94A3B8" }}>
                {value != null ? `${value}%` : "sem quiz"}
              </span>
            </div>
            <ProgressBar value={value ?? 0} color={color} />
          </div>
        );
      })}
    </div>
  );
}

// Taxa de acerto real por matéria. Sem matéria ainda: estado vazio, não um card
// em branco.
export default function SubjectProgress({ subjects = [], locked, visibleCount = 2, onStartTrial }) {
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

  const visible = locked ? subjects.slice(0, visibleCount) : subjects;
  const rest = locked ? subjects.slice(visibleCount) : [];

  return (
    <div style={{ marginBottom: 20 }}>
      <SectionLabel>Evolução por matéria</SectionLabel>
      <Card style={{ padding: "18px 20px", margin: 0, display: "flex", flexDirection: "column", gap: 16 }}>
        <SubjectRows subjects={visible} />
        {rest.length > 0 && (
          <PlusPaywall locked compact title="Ver evolução por tópico" onStartTrial={onStartTrial}>
            <div style={{ marginTop: 4 }}>
              <SubjectRows subjects={rest} />
            </div>
          </PlusPaywall>
        )}
      </Card>
    </div>
  );
}
