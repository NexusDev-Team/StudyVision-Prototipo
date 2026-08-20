import Card from "../ui/Card";
import SectionLabel from "../ui/SectionLabel";
import SparkChart from "../ui/SparkChart";
import { PLUS_METRICS } from "../../data/plusMetrics";

export default function PerformanceChart() {
  return (
    <div style={{ marginBottom: 20 }}>
      <SectionLabel>Seu desempenho</SectionLabel>
      <Card style={{ padding: "18px 20px 10px" }}>
        <SparkChart points={PLUS_METRICS.weeks} labels={["Semana 1", "Semana 2", "Semana 3", "Semana 4"]} color="#7C3AED" />
      </Card>
    </div>
  );
}
