import { Plus } from "lucide-react";
import Card from "../ui/Card";
import SectionLabel from "../ui/SectionLabel";

// Um Content pode ter várias fotos (páginas). Todas ficam ancoradas no mesmo
// contentId — nunca criam Contents novos. A primeira foto (order 0) também
// aparece como capa em CapturedPageVisual. A exclusão de foto vive no
// visualizador ampliado (PhotoViewerModal), não na miniatura.
export default function PhotosSection({ content, onAddPhoto, onSelectPhoto }) {
  const images = [...content.images].sort((a, b) => a.order - b.order);

  return (
    <Card style={{ marginBottom: 10 }}>
      <SectionLabel>FOTOS · {images.length}</SectionLabel>
      <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 2 }}>
        {images.map((img, i) => (
          <button key={img.id} onClick={() => onSelectPhoto?.(i)} aria-label={`Ver foto ${i + 1} de ${images.length}`}
            style={{ width: 64, height: 64, borderRadius: 12, overflow: "hidden", border: "1.5px solid #E2E8F0", padding: 0, cursor: "pointer", background: "#F1F5F9", flexShrink: 0 }}>
            <img src={img.dataUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </button>
        ))}
        <button onClick={onAddPhoto} aria-label="Adicionar foto"
          style={{ width: 64, height: 64, borderRadius: 12, flexShrink: 0, border: "1.5px dashed #CBD5E1", background: "#F8FAFC", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Plus size={22} color="#94A3B8" />
        </button>
      </div>
    </Card>
  );
}
