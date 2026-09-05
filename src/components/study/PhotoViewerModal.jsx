import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, X, Trash2 } from "lucide-react";
import Modal from "../ui/Modal";
import ConfirmDialog from "../ui/ConfirmDialog";

// Visualização ampliada de uma foto do Content, com navegação entre páginas
// quando houver mais de uma. Portalizado pelo próprio Modal dentro da moldura.
// A exclusão da foto acontece aqui (ícone de lixeira no topo), não na
// miniatura da lista.
export default function PhotoViewerModal({ images, initialIndex = 0, onClose, onRemoveImage }) {
  const [index, setIndex] = useState(Math.min(initialIndex, Math.max(images.length - 1, 0)));
  const [confirmRemove, setConfirmRemove] = useState(false);

  // `images` vem derivado do store: ao remover, o array encolhe. Fecha quando
  // não sobra nenhuma; senão, mantém o índice dentro do intervalo.
  useEffect(() => {
    if (images.length === 0) {
      onClose();
      return;
    }
    setIndex((i) => Math.min(i, images.length - 1));
  }, [images.length, onClose]);

  const image = images[index];
  if (!image) return null;

  const hasMultiple = images.length > 1;
  const goPrev = () => setIndex((i) => (i - 1 + images.length) % images.length);
  const goNext = () => setIndex((i) => (i + 1) % images.length);

  const handleConfirmRemove = () => {
    setConfirmRemove(false);
    onRemoveImage?.(image.id);
  };

  return (
    <>
    <Modal center onClose={onClose} label={`Foto ${index + 1} de ${images.length}`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        {onRemoveImage ? (
          <button onClick={() => setConfirmRemove(true)} aria-label="Excluir foto"
            style={{ width: 44, height: 44, borderRadius: "50%", background: "#FEF2F2", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Trash2 size={19} color="#DC2626" />
          </button>
        ) : <span style={{ width: 44, height: 44 }} />}
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

    {confirmRemove && (
      <ConfirmDialog
        title="Remover esta foto?"
        description="A foto será apagada deste conteúdo. As demais páginas continuam disponíveis."
        confirmLabel="Remover foto"
        onConfirm={handleConfirmRemove}
        onCancel={() => setConfirmRemove(false)}
      />
    )}
    </>
  );
}
