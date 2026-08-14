import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, Search, BookOpen } from "lucide-react";
import LogoSVG from "../components/brand/LogoSVG";
import ContentCard from "../components/study/ContentCard";
import FilterPills from "../components/ui/FilterPills";
import { getStoredItems } from "../services/storage";
import { SUBJECT_FILTERS } from "../constants";

export default function LibraryScreen({ onOpenItem, onVisionPlus }) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("Todos");
  const [items, setItems] = useState([]);

  useEffect(() => { setItems(getStoredItems()); }, []);

  const filtered = items.filter(it => {
    const q = search.toLowerCase();
    const matchSearch = !q || it.concept.toLowerCase().includes(q) || it.subject.toLowerCase().includes(q);
    const matchFilter = activeFilter === "Todos" || it.subject === activeFilter;
    return matchSearch && matchFilter;
  });

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#F8FAFC", fontFamily: "Inter,sans-serif", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ background: "white", padding: "52px 20px 14px", borderBottom: "1px solid #F1F5F9", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <LogoSVG size={22} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#2563EB", letterSpacing: 0.5 }}>JOVI · STUDY VISION</span>
          </div>
          <motion.button whileTap={{ scale: 0.94 }} onClick={onVisionPlus}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 20, background: "linear-gradient(135deg,#2563EB,#7C3AED)", border: "none", cursor: "pointer" }}>
            <Star size={11} fill="white" color="white" />
            <span style={{ fontFamily: "Inter,sans-serif", fontSize: 12, fontWeight: 700, color: "white" }}>Vision+</span>
          </motion.button>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: 0 }}>Biblioteca</h1>
        <p style={{ fontSize: 13, color: "#64748B", margin: "2px 0 12px" }}>{filtered.length} conteúdo{filtered.length !== 1 ? "s" : ""} organizado{filtered.length !== 1 ? "s" : ""}</p>

        {/* Search */}
        <div style={{ position: "relative" }}>
          <Search size={15} color="#94A3B8" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar conteúdo..."
            style={{ width: "100%", height: 42, borderRadius: 12, paddingLeft: 38, paddingRight: 14, border: "1.5px solid #E2E8F0", background: "#F8FAFC", fontFamily: "Inter,sans-serif", fontSize: 14, color: "#111827", outline: "none", boxSizing: "border-box" }} />
        </div>

        {/* Filters */}
        <FilterPills
          options={SUBJECT_FILTERS} active={activeFilter} onSelect={setActiveFilter}
          layout="scroll" padding="5px 14px"
          activeBg="#2563EB" activeColor="white"
          inactiveBg="white" inactiveColor="#64748B" inactiveBorder="1.5px solid #E2E8F0"
          style={{ marginTop: 10 }}
        />
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px 24px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", paddingTop: 60, color: "#94A3B8" }}>
            <BookOpen size={40} style={{ margin: "0 auto 12px", display: "block" }} />
            <p style={{ fontSize: 14, fontFamily: "Inter,sans-serif" }}>Nenhum conteúdo encontrado</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((item, i) => (
              <ContentCard key={item.id} item={item} index={i} onClick={() => onOpenItem(item)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
