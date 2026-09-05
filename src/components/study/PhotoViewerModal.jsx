import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Modal from "../ui/Modal";

// Visualização ampliada de uma foto do Content, com navegação entre páginas
// quando houver mais de uma. Portalizado pelo próprio Modal dentro da moldura.
export default function PhotoViewerModal({ images, initialIndex = 0, onClose }) {
  const [index, setIndex] = useState(Math.min(initialIndex, images.length - 1));
  const image = images[index];
  if (!image) return null;

  const hasMultiple = images.length > 1;
  const goPrev = () => setIndex((i) => (i - 1 + images.length) % images.length);
  const goNext = () => setIndex((i) => (i + 1) % images.length);

  return (
    <Modal center onClose={onClose} label={`Foto ${index + 1} de ${images.length}`}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <button onClick={onClose} aria-label="Fechar foto"
          style={{ width: 44, height: 44, borderRadius: "50%", background: "#F1F5F9", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <X size={20} color="#111827" />
        </button>
      </div>

      <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", background: "#0B1120" }}>
        <img src={image.dataUrl} alt={`Foto ${index + 1} de ${images.length}`}
          style={{ display: "block", width: "100%", maxHeight: "60vh", objectFit: "contain" }} />

        {hasMultiple && (
          <>
            <button onClick={goPrev} aria-label="Foto anterior"
              style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, borderRadius: "50%", background: "rgba(15,23,42,0.55)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ChevronLeft size={22} color="white" />
            </button>
            <button onClick={goNext} aria-label="Próxima foto"
              style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, borderRadius: "50%", background: "rgba(15,23,42,0.55)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ChevronRight size={22} color="white" />
            </button>
          </>
        )}
      </div>

      {hasMultiple && (
        <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12.5, color: "#64748B", textAlign: "center", margin: "10px 0 0" }}>
          {index + 1} de {images.length}
        </p>
      )}
    </Modal>
  );
}
