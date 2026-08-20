import Card from "../ui/Card";
import SectionLabel from "../ui/SectionLabel";
import ProgressBar from "../ui/ProgressBar";
import { PLUS_METRICS } from "../../data/plusMetrics";
import { SUBJECT_META } from "../../constants";

export default function SubjectProgress({ limit }) {
  const subjects = limit ? PLUS_METRICS.subjects.slice(0, limit) : PLUS_METRICS.subjects;

  return (
    <div style={{ marginBottom: 20 }}>
      <SectionLabel>Evolução por matéria</SectionLabel>
      <Card style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
        {subjects.map(s => {
          const color = SUBJECT_META[s.name]?.color || "#2563EB";
          return (
            <div key={s.name}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 700, color: "#111827" }}>{s.name}</span>
                <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 700, color: "#111827" }}>{s.value}%</span>
              </div>
              <ProgressBar value={s.value} color={color} />
            </div>
          );
        })}
      </Card>
    </div>
  );
}
