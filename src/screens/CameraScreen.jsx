import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Settings, FlipHorizontal, BookOpen, Eye } from "lucide-react";
import exemploFoto1 from "../assets/exemplo-foto1.png";
import LogoSVG from "../components/brand/LogoSVG";

const FOCUS_CORNERS = [
  { top: 0, left: 0 },
  { top: 0, right: 0 },
  { bottom: 0, left: 0 },
  { bottom: 0, right: 0 },
];

export default function CameraScreen({ onCapture, onVisionPlusNav, onLibraryNav }) {
  const [flash, setFlash] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [flashWhite, setFlashWhite] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setPanelOpen(true), 700);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (panelOpen) {
      const t = setTimeout(() => setPanelOpen(false), 3500);
      return () => clearTimeout(t);
    }
  }, [panelOpen]);

  const handleCapture = () => {
    if (capturing) return;
    setCapturing(true);
    setFlashWhite(true);
    setTimeout(() => setFlashWhite(false), 180);
    setTimeout(() => onCapture(), 350);
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "#000", overflow: "hidden" }}>
      {/* Viewfinder bg — simulates the camera pointed at a real page of notes */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${exemploFoto1})`, backgroundSize: "cover", backgroundPosition: "center" }}>
        {/* Dim overlay so the top/bottom controls stay legible over the photo */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(8,15,34,0.55) 0%, rgba(8,15,34,0.1) 22%, rgba(8,15,34,0.1) 65%, rgba(8,15,34,0.6) 100%)" }} />
        {/* Grid */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.08 }} viewBox="0 0 375 680">
          <line x1="125" y1="0" x2="125" y2="680" stroke="white" strokeWidth="0.6"/>
          <line x1="250" y1="0" x2="250" y2="680" stroke="white" strokeWidth="0.6"/>
          <line x1="0"   y1="226" x2="375" y2="226" stroke="white" strokeWidth="0.6"/>
          <line x1="0"   y1="453" x2="375" y2="453" stroke="white" strokeWidth="0.6"/>
        </svg>
        {/* Focus ring */}
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 90, height: 90, border: "1.5px solid rgba(255,255,255,0.45)", borderRadius: 4 }}>
          {FOCUS_CORNERS.map((pos, i) => (
            <div key={i} style={{ position: "absolute", width: 14, height: 14, ...pos, borderTop: i<2?"2px solid white":undefined, borderLeft: i===0||i===2?"2px solid white":undefined, borderBottom: i>=2?"2px solid white":undefined, borderRight: i===1||i===3?"2px solid white":undefined }} />
          ))}
        </div>
      </div>

      {/* Flash white overlay */}
      <AnimatePresence>
        {flashWhite && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            style={{ position: "absolute", inset: 0, background: "white", zIndex: 50 }} />
        )}
      </AnimatePresence>

      {/* TOP BAR */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 20, padding: "50px 12px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
        {/* Flash */}
        <button onClick={() => setFlash(v => !v)} style={{ width: 34, height: 34, flexShrink: 0, borderRadius: "50%", background: flash ? "rgba(252,211,77,0.2)" : "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)" }}>
          <Zap size={18} fill={flash ? "#FCD34D" : "none"} color={flash ? "#FCD34D" : "white"} />
        </button>

        {/* HDR + Eye (Study Vision) + Settings — center cluster */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <button style={{ background: "rgba(255,255,255,0.1)", border: "1.5px solid rgba(255,255,255,0.25)", borderRadius: 8, padding: "3px 6px", cursor: "pointer", backdropFilter: "blur(8px)" }}>
            <span style={{ fontFamily: "Inter,sans-serif", fontSize: 10, fontWeight: 700, color: "white", letterSpacing: 0.5, whiteSpace: "nowrap" }}>HDR</span>
          </button>

          {/* 👁 Study Vision toggle */}
          <button onClick={() => setPanelOpen(v => !v)}
            style={{ width: 34, height: 34, flexShrink: 0, borderRadius: "50%", background: panelOpen ? "rgba(37,99,235,0.5)" : "rgba(255,255,255,0.1)", border: panelOpen ? "1.5px solid rgba(37,99,235,0.8)" : "1.5px solid rgba(255,255,255,0.25)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)", transition: "all 0.25s" }}>
            <Eye size={16} color="white" />
          </button>

          <button style={{ width: 34, height: 34, flexShrink: 0, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)" }}>
            <Settings size={16} color="white" />
          </button>
        </div>

        {/* Ratio */}
        <button style={{ flexShrink: 0, background: "rgba(255,255,255,0.1)", border: "1.5px solid rgba(255,255,255,0.25)", borderRadius: 8, padding: "3px 6px", cursor: "pointer", backdropFilter: "blur(8px)" }}>
          <span style={{ fontFamily: "Inter,sans-serif", fontSize: 10, fontWeight: 700, color: "white", letterSpacing: 0.5, whiteSpace: "nowrap" }}>4:3</span>
        </button>
      </div>

      {/* Study Vision Panel */}
      <AnimatePresence>
        {panelOpen && (
          <div style={{ position: "absolute", top: 104, left: "50%", transform: "translateX(-50%)", zIndex: 30, width: "calc(100% - 32px)", maxWidth: 180 }}>
            <motion.div initial={{ opacity: 0, y: -10, scale: 0.93 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 360, damping: 28 }}
              style={{ borderRadius: 16, overflow: "hidden", background: "rgba(10,16,35,0.55)", backdropFilter: "blur(14px)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }}>
              <div style={{ padding: "9px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                <LogoSVG size={20} glow />
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, fontWeight: 800, color: "white", margin: 0 }}>Study Vision</p>
                  <p style={{ fontFamily: "Inter,sans-serif", fontSize: 9, color: "rgba(255,255,255,0.55)", margin: 0 }}>JOVI · Modo ativo</p>
                </div>
                <div style={{ marginLeft: "auto", background: "rgba(20,184,166,0.15)", borderRadius: 20, padding: "2px 7px", border: "1px solid rgba(20,184,166,0.3)", flexShrink: 0 }}>
                  <span style={{ fontFamily: "Inter,sans-serif", fontSize: 9, fontWeight: 700, color: "#14B8A6" }}>ON</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hint label */}
      <div style={{ position: "absolute", bottom: 145, left: 0, right: 0, display: "flex", justifyContent: "center", zIndex: 10 }}>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          style={{ background: "rgba(37,99,235,0.82)", borderRadius: 30, padding: "6px 18px", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", gap: 6 }}>
          <Eye size={13} color="white" />
          <span style={{ fontFamily: "Inter,sans-serif", fontSize: 12, fontWeight: 600, color: "white" }}>Aponte para um conteúdo e capture</span>
        </motion.div>
      </div>

      {/* BOTTOM CONTROLS */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 20, paddingBottom: 36, paddingTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", paddingLeft: 20, paddingRight: 20 }}>
          {/* Gallery */}
          <button onClick={onLibraryNav} style={{ width: 52, height: 52, borderRadius: 14, overflow: "hidden", border: "2.5px solid rgba(255,255,255,0.4)", cursor: "pointer", background: "linear-gradient(135deg,#1e3a8a,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <BookOpen size={22} color="rgba(255,255,255,0.8)" />
          </button>

          {/* Shutter */}
          <motion.button whileTap={{ scale: 0.9 }} onClick={handleCapture} disabled={capturing}
            style={{ width: 76, height: 76, borderRadius: "50%", background: capturing ? "#14B8A6" : "#FFFFFF", border: "4px solid rgba(255,255,255,0.85)", cursor: "pointer", boxShadow: "0 0 0 2px rgba(255,255,255,0.15)", transition: "background 0.2s" }} />

          {/* Flip */}
          <button style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(255,255,255,0.12)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)" }}>
            <FlipHorizontal size={22} color="white" />
          </button>
        </div>
      </div>
    </div>
  );
}
