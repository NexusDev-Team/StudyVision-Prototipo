import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

// Bottom-sheet (default) or centered modal, portaled into .sv-frame so it
// stays clipped to the phone shell instead of escaping to the real viewport.
// role="dialog" + Esc + clique no backdrop fecham; foco vai para o primeiro
// controle ao abrir e volta para quem abriu o modal ao fechar.
export default function Modal({ children, center = false, onClose, label = "Diálogo" }) {
  const panelRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    previouslyFocused.current = document.activeElement;
    const panel = panelRef.current;
    const first = panel?.querySelector(FOCUSABLE);
    first?.focus();

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && onClose) {
        e.stopPropagation();
        onClose();
        return;
      }
      // Trap simples: Tab no último elemento volta ao primeiro, e vice-versa.
      if (e.key === "Tab" && panel) {
        const focusables = panel.querySelectorAll(FOCUSABLE);
        if (focusables.length === 0) return;
        const firstEl = focusables[0];
        const lastEl = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      previouslyFocused.current?.focus?.();
    };
  }, [onClose]);

  const modal = (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}
      style={{ position: "absolute", inset: 0, zIndex: 400, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: center ? "center" : "flex-end", justifyContent: center ? "center" : "stretch", padding: center ? "0 20px" : 0, boxSizing: "border-box" }}>
      <motion.div ref={panelRef} role="dialog" aria-modal="true" aria-label={label}
        initial={center ? { opacity: 0, scale: 0.94 } : { y: 40 }} animate={center ? { opacity: 1, scale: 1 } : { y: 0 }} exit={center ? { opacity: 0, scale: 0.94 } : { y: 40 }} transition={{ type: "spring", stiffness: 340, damping: 32 }}
        style={{ width: "100%", maxHeight: "88%", overflowY: "auto", background: "white", borderRadius: center ? 24 : "24px 24px 0 0", padding: "20px 20px 28px", fontFamily: "Inter,sans-serif", boxSizing: "border-box" }}>
        {children}
      </motion.div>
    </motion.div>
  );

  const portalTarget = typeof document !== "undefined" ? document.querySelector(".sv-frame") : null;
  return portalTarget ? createPortal(modal, portalTarget) : modal;
}
