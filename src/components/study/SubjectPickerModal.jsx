import { useState } from "react";
import { X, Check, Plus } from "lucide-react";
import Modal from "../ui/Modal";
import { createSubjectEntry, findSubjectByName } from "../../services/subjectService";
import { getSubjectVisual, UNASSIGNED_SUBJECT_LABEL } from "../../constants";

// Escolhe (ou cria) a matéria de um conteúdo. currentSubjectId identifica a
// opção já selecionada; onSelect(subjectId|null, subjectName) devolve a
// escolha para quem chamou persistir via moveContentToSubject.
export default function SubjectPickerModal({ subjects, currentSubjectId, onSelect, onClose, mutate }) {
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");

  const handleCreateAndSelect = () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      setError("Digite um nome para a matéria.");
      return;
    }
    if (findSubjectByName(trimmed)) {
      setError("Já existe uma matéria com esse nome — selecione-a na lista.");
      return;
    }
    const subject = mutate(() => createSubjectEntry(trimmed));
    if (subject) onSelect(subject.id, subject.name);
  };

  return (
    <Modal onClose={onClose} label="Escolher matéria">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <p style={{ fontSize: 17, fontWeight: 800, color: "#111827", margin: 0 }}>Escolher matéria</p>
        <button onClick={onClose} aria-label="Fechar" style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
          <X size={20} color="#94A3B8" />
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: "40vh", overflowY: "auto", marginBottom: 14 }}>
        <button onClick={() => onSelect(null, "")}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, border: !currentSubjectId ? "1.5px solid #2563EB" : "1.5px solid #E2E8F0", background: !currentSubjectId ? "#EFF6FF" : "white", cursor: "pointer", textAlign: "left" }}>
          <span style={{ width: 30, height: 30, borderRadius: 9, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>🗂️</span>
          <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: "#111827" }}>{UNASSIGNED_SUBJECT_LABEL}</span>
          {!currentSubjectId && <Check size={16} color="#2563EB" />}
        </button>
        {subjects.map((s) => {
          const visual = getSubjectVisual(s.name);
          const isActive = currentSubjectId === s.id;
          return (
            <button key={s.id} onClick={() => onSelect(s.id, s.name)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, border: isActive ? "1.5px solid #2563EB" : "1.5px solid #E2E8F0", background: isActive ? "#EFF6FF" : "white", cursor: "pointer", textAlign: "left" }}>
              <span style={{ width: 30, height: 30, borderRadius: 9, background: visual.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>{visual.emoji}</span>
              <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
              {isActive && <Check size={16} color="#2563EB" />}
            </button>
          );
        })}
      </div>

      <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: 1, marginBottom: 8 }}>OU CRIAR NOVA</p>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={newName}
          onChange={(e) => { setNewName(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleCreateAndSelect()}
          placeholder="Nome da nova matéria"
          style={{ flex: 1, height: 44, borderRadius: 12, border: "1.5px solid #E2E8F0", padding: "0 12px", fontFamily: "Inter,sans-serif", fontSize: 13.5, boxSizing: "border-box" }}
        />
        <button onClick={handleCreateAndSelect} aria-label="Criar e selecionar"
          style={{ width: 44, height: 44, borderRadius: 12, background: "#2563EB", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Plus size={18} color="white" />
        </button>
      </div>
      {error && <p style={{ fontSize: 12, color: "#DC2626", margin: "8px 0 0" }}>{error}</p>}
    </Modal>
  );
}
