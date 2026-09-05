import { useState } from "react";
import { Plus, X } from "lucide-react";
import Card from "../ui/Card";
import SectionLabel from "../ui/SectionLabel";
import ConfirmDialog from "../ui/ConfirmDialog";

// Um Content pode ter várias fotos (páginas). Todas ficam ancoradas no mesmo
// contentId — nunca criam Contents novos. A primeira foto (order 0) também
// aparece como capa em CapturedPageVisual.
export default function PhotosSection({ content, onAddPhoto, onRemovePhoto, onSelectPhoto }) {
  const [pendingRemove, setPendingRemove] = useState(null);
  const images = [...content.images].sort((a, b) => a.order - b.order);

  const handleConfirmRemove = () => {
    onRemovePhoto(pendingRemove.id);
    setPendingRemove(null);
  };

  return (
    <>
      <Card style={{ marginBottom: 10 }}>
        <SectionLabel>FOTOS · {images.length}</SectionLabel>
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 2 }}>
          {images.map((img, i) => (
            <div key={img.id} style={{ position: "relative", flexShrink: 0 }}>
              <button onClick={() => onSelectPhoto?.(i)} aria-label={`Ver foto ${i + 1} de ${images.length}`}
                style={{ width: 64, height: 64, borderRadius: 12, overflow: "hidden", border: "1.5px solid #E2E8F0", padding: 0, cursor: "pointer", background: "#F1F5F9" }}>
                <img src={img.dataUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </button>
              <button onClick={() => setPendingRemove(img)} aria-label={`Remover foto ${i + 1}`}
                style={{ position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: "50%", background: "#DC2626", border: "2px solid white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={11} color="white" />
              </button>
            </div>
          ))}
          <button onClick={onAddPhoto} aria-label="Adicionar foto"
            style={{ width: 64, height: 64, borderRadius: 12, flexShrink: 0, border: "1.5px dashed #CBD5E1", background: "#F8FAFC", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Plus size={22} color="#94A3B8" />
          </button>
        </div>
      </Card>

      {pendingRemove && (
        <ConfirmDialog
          title="Remover esta foto?"
          description="A foto será apagada deste conteúdo. As demais páginas continuam disponíveis."
          confirmLabel="Remover foto"
          onConfirm={handleConfirmRemove}
          onCancel={() => setPendingRemove(null)}
        />
      )}
    </>
  );
}
