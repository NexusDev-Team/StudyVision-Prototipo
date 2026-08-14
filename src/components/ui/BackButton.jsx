import { ChevronLeft } from "lucide-react";
import styles from "./BackButton.module.css";

export default function BackButton({ onClick, color = "#2563EB", label = "Voltar" }) {
  return (
    <button className={styles.back} onClick={onClick}>
      <ChevronLeft size={20} color={color} />
      <span className={styles.label} style={{ color }}>{label}</span>
    </button>
  );
}
