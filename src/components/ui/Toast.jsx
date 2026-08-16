import { useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";

export default function Toast({ message, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 1800); return () => clearTimeout(t); }, [message]);
  return (
    <motion.div initial={{ y: 100, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 80, opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      style={{ position: "absolute", bottom: 90, left: 20, right: 20, zIndex: 999, background: "#111827", borderRadius: 16, padding: "14px 18px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
      <CheckCircle size={20} color="#14B8A6" />
      <span style={{ fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 600, color: "white" }}>{message}</span>
    </motion.div>
  );
}
