import { createPortal } from "react-dom";
import { motion } from "framer-motion";

// Bottom-sheet (default) or centered modal, portaled into .sv-frame so it
// stays clipped to the phone shell instead of escaping to the real viewport.
export default function Modal({ children, center = false }) {
  const modal = (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "absolute", inset: 0, zIndex: 400, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: center ? "center" : "flex-end", justifyContent: center ? "center" : "stretch", padding: center ? "0 20px" : 0, boxSizing: "border-box" }}>
      <motion.div initial={center ? { opacity: 0, scale: 0.94 } : { y: 40 }} animate={center ? { opacity: 1, scale: 1 } : { y: 0 }} exit={center ? { opacity: 0, scale: 0.94 } : { y: 40 }} transition={{ type: "spring", stiffness: 340, damping: 32 }}
        style={{ width: "100%", maxHeight: "88%", overflowY: "auto", background: "white", borderRadius: center ? 24 : "24px 24px 0 0", padding: "20px 20px 28px", fontFamily: "Inter,sans-serif", boxSizing: "border-box" }}>
        {children}
      </motion.div>
    </motion.div>
  );

  const portalTarget = typeof document !== "undefined" ? document.querySelector(".sv-frame") : null;
  return portalTarget ? createPortal(modal, portalTarget) : modal;
}
