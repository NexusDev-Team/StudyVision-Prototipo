import Card from "../ui/Card";
import SectionLabel from "../ui/SectionLabel";
import SparkChart from "../ui/SparkChart";
import PlusPaywall from "./PlusPaywall";
import { PLUS_METRICS } from "../../data/plusMetrics";

export default function PerformanceChart({ locked, onStartTrial }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <SectionLabel>Seu desempenho</SectionLabel>
      <PlusPaywall locked={locked} title="Ver análise detalhada" message="Acompanhe sua evolução semana a semana." onStartTrial={onStartTrial}>
        <Card style={{ padding: "18px 20px 10px", margin: 0 }}>
          <SparkChart points={PLUS_METRICS.weeks} labels={["Semana 1", "Semana 2", "Semana 3", "Semana 4"]} color="#7C3AED" />
        </Card>
      </PlusPaywall>
    </div>
  );
}
