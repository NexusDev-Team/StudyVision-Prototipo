import { useState } from "react";
import { X, Plus, Pencil, Trash2, Check } from "lucide-react";
import Modal from "../ui/Modal";
import {
  createSubjectEntry,
  renameSubject,
  deleteSubject,
  findSubjectByName,
  SubjectDeletionError,
} from "../../services/subjectService";
import { getSubjectVisual } from "../../constants";

// Gerencia matérias (criar/renomear/excluir) direto da Biblioteca. Toda
// escrita passa por `mutate` do useContentStore, para o snapshot recarregar
// na hora. Exclusão de matéria com conteúdo pede uma decisão explícita:
// mover para outra matéria ou deixar sem matéria — nunca decide sozinho.
export default function SubjectManagerModal({ subjects, contents, mutate, onClose, onToast }) {
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [deletingId, setDeletingId] = useState(null); // matéria em fluxo de exclusão
  const [reassignTo, setReassignTo] = useState("");

  const countFor = (subjectId) => contents.filter((c) => c.subjectId === subjectId).length;

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      setError("Digite um nome para a matéria.");
      return;
    }
    if (findSubjectByName(trimmed)) {
      setError("Já existe uma matéria com esse nome.");
      return;
    }
    mutate(() => createSubjectEntry(trimmed));
    setNewName("");
    setError("");
    onToast?.("✓ Matéria criada");
  };

  const startRename = (subject) => {
    setEditingId(subject.id);
    setEditingName(subject.name);
  };

  const confirmRename = (subject) => {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    mutate(() => renameSubject(subject.id, trimmed));
    setEditingId(null);
    onToast?.("✓ Matéria renomeada");
  };

  const startDelete = (subject) => {
    if (countFor(subject.id) === 0) {
      mutate(() => deleteSubject(subject.id));
      onToast?.("✓ Matéria excluída");
      return;
    }
    setDeletingId(subject.id);
    setReassignTo("");
  };

  const confirmDelete = (subject) => {
    try {
      mutate(() => deleteSubject(subject.id, reassignTo ? { reassignTo } : { unassign: true }));
      setDeletingId(null);
      onToast?.("✓ Matéria excluída");
    } catch (err) {
      if (err instanceof SubjectDeletionError) {
        onToast?.(err.message);
      } else {
        onToast?.("Não foi possível excluir a matéria.");
      }
    }
  };

  return (
    <Modal>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <p style={{ fontSize: 17, fontWeight: 800, color: "#111827", margin: 0 }}>Gerenciar matérias</p>
        <button onClick={onClose} aria-label="Fechar" style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
          <X size={20} color="#94A3B8" />
        </button>
      </div>

      {/* Criar nova matéria */}
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input
          value={newName}
          onChange={(e) => { setNewName(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="Nova matéria (ex: Banco de Dados)"
          style={{ flex: 1, height: 44, borderRadius: 12, border: "1.5px solid #E2E8F0", padding: "0 12px", fontFamily: "Inter,sans-serif", fontSize: 13.5, boxSizing: "border-box" }}
        />
        <button onClick={handleCreate} aria-label="Criar matéria"
          style={{ width: 44, height: 44, borderRadius: 12, background: "#2563EB", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Plus size={18} color="white" />
        </button>
      </div>
      {error && <p style={{ fontSize: 12, color: "#DC2626", margin: "0 0 12px" }}>{error}</p>}

      {/* Lista de matérias */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "50vh", overflowY: "auto" }}>
        {subjects.length === 0 && <p style={{ fontSize: 13, color: "#94A3B8", textAlign: "center", padding: "16px 0" }}>Nenhuma matéria criada ainda.</p>}
        {subjects.map((subject) => {
          const visual = getSubjectVisual(subject.name);
          const count = countFor(subject.id);
          const isEditing = editingId === subject.id;
          const isDeleting = deletingId === subject.id;
          return (
            <div key={subject.id} style={{ border: "1px solid #E2E8F0", borderRadius: 14, padding: "10px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 32, height: 32, borderRadius: 10, background: visual.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{visual.emoji}</span>
                {isEditing ? (
                  <input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && confirmRename(subject)}
                    autoFocus
                    style={{ flex: 1, minWidth: 0, height: 34, borderRadius: 8, border: "1.5px solid #2563EB", padding: "0 8px", fontFamily: "Inter,sans-serif", fontSize: 13.5, boxSizing: "border-box" }}
                  />
                ) : (
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13.5, fontWeight: 700, color: "#111827", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{subject.name}</p>
                    <p style={{ fontSize: 11, color: "#94A3B8", margin: "1px 0 0" }}>{count} conteúdo{count !== 1 ? "s" : ""}</p>
                  </div>
                )}
                {isEditing ? (
                  <button onClick={() => confirmRename(subject)} aria-label="Confirmar novo nome" style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                    <Check size={17} color="#16A34A" />
                  </button>
                ) : (
                  <>
                    <button onClick={() => startRename(subject)} aria-label={`Renomear ${subject.name}`} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                      <Pencil size={15} color="#64748B" />
                    </button>
                    <button onClick={() => startDelete(subject)} aria-label={`Excluir ${subject.name}`} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                      <Trash2 size={15} color="#DC2626" />
                    </button>
                  </>
                )}
              </div>

              {isDeleting && (
                <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: "#FEF2F2", border: "1px solid #FECACA" }}>
                  <p style={{ fontSize: 12, color: "#7F1D1D", margin: "0 0 8px" }}>
                    {count} conteúdo{count !== 1 ? "s" : ""} vinculado{count !== 1 ? "s" : ""}. Para onde eles vão?
                  </p>
                  <select value={reassignTo} onChange={(e) => setReassignTo(e.target.value)}
                    style={{ width: "100%", height: 36, borderRadius: 8, border: "1.5px solid #E2E8F0", padding: "0 8px", fontFamily: "Inter,sans-serif", fontSize: 12.5, marginBottom: 8, boxSizing: "border-box" }}>
                    <option value="">Deixar sem matéria</option>
                    {subjects.filter((s) => s.id !== subject.id).map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setDeletingId(null)} style={{ flex: 1, height: 34, borderRadius: 8, border: "1.5px solid #E2E8F0", background: "white", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "#64748B" }}>Cancelar</button>
                    <button onClick={() => confirmDelete(subject)} style={{ flex: 1, height: 34, borderRadius: 8, border: "none", background: "#DC2626", color: "white", cursor: "pointer", fontSize: 12.5, fontWeight: 700 }}>Excluir mesmo assim</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
