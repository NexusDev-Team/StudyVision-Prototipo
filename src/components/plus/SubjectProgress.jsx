import Card from "../ui/Card";
import SectionLabel from "../ui/SectionLabel";
import ProgressBar from "../ui/ProgressBar";
import PlusPaywall from "./PlusPaywall";
import { PLUS_METRICS } from "../../data/plusMetrics";
import { SUBJECT_META } from "../../constants";

function SubjectRows({ subjects }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
    </div>
  );
}

// Free shows the first `visibleCount` subjects; the rest stay blurred behind
// a "ver evolução por tópico" unlock, in the same card — no separate blank state.
export default function SubjectProgress({ locked, visibleCount = 2, onStartTrial }) {
  const visible = locked ? PLUS_METRICS.subjects.slice(0, visibleCount) : PLUS_METRICS.subjects;
  const rest = locked ? PLUS_METRICS.subjects.slice(visibleCount) : [];

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
