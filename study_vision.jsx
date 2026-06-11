import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Settings, FlipHorizontal, BookOpen, Search, X,
  ChevronRight, Star, Brain, FileText, Bookmark, BookMarked,
  CheckCircle, Sparkles, Lock, HelpCircle, CreditCard,
  Clock, ChevronLeft, Eye, SlidersHorizontal, RotateCcw,
  Camera, ArrowRight, GraduationCap, Hash, Layers
} from "lucide-react";

// ─── BRAND SVG LOGO ─────────────────────────────────────────────────────────
function LogoSVG({ size = 32, glow = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={glow ? { filter: "drop-shadow(0 0 8px rgba(37,99,235,0.7))" } : {}}>
      <defs>
        <radialGradient id="eyeGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="60%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1E3A8A" />
        </radialGradient>
        <radialGradient id="irisGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0EA5E9" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </radialGradient>
      </defs>
      {/* Eye outline */}
      <path d="M4 32 C14 16, 50 16, 60 32 C50 48, 14 48, 4 32 Z"
        fill="none" stroke="url(#eyeGrad)" strokeWidth="3.5" strokeLinecap="round" />
      {/* Iris */}
      <circle cx="32" cy="32" r="10" fill="url(#irisGrad)" />
      {/* Network nodes */}
      <circle cx="32" cy="32" r="3" fill="white" />
      <circle cx="25" cy="28" r="2.2" fill="white" opacity="0.9" />
      <circle cx="39" cy="28" r="2.2" fill="white" opacity="0.9" />
      <circle cx="28" cy="37" r="1.8" fill="#7DD3FC" opacity="0.85" />
      <circle cx="36" cy="37" r="1.8" fill="#7DD3FC" opacity="0.85" />
      {/* Connections */}
      <line x1="32" y1="32" x2="25" y2="28" stroke="white" strokeWidth="1.2" opacity="0.7" />
      <line x1="32" y1="32" x2="39" y2="28" stroke="white" strokeWidth="1.2" opacity="0.7" />
      <line x1="32" y1="32" x2="28" y2="37" stroke="#7DD3FC" strokeWidth="1" opacity="0.6" />
      <line x1="32" y1="32" x2="36" y2="37" stroke="#7DD3FC" strokeWidth="1" opacity="0.6" />
      <line x1="25" y1="28" x2="39" y2="28" stroke="white" strokeWidth="0.8" opacity="0.4" />
      {/* Glint */}
      <circle cx="28" cy="27" r="1.5" fill="white" opacity="0.6" />
    </svg>
  );
}

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const SAMPLE_ITEMS = [
  {
    id: "s1",
    subject: "Matemática",
    subjectIcon: "📘",
    subjectColor: "#2563EB",
    subjectBg: "#EFF6FF",
    topic: "Cálculo Diferencial",
    concept: "Derivadas",
    time: "Agora",
    summary: "Uma derivada mede a taxa de variação instantânea de uma função em relação a uma de suas variáveis. É um conceito fundamental no cálculo diferencial, representado pela notação f\'(x) ou dy/dx. Geometricamente, representa a inclinação da reta tangente à curva no ponto.",
    concepts: ["Derivadas", "Limites", "Regra da Cadeia", "Cálculo Diferencial"],
    keywords: ["taxa de variação", "f\'(x)", "dy/dx", "tangente", "instantânea"],
    flashcards: [
      { front: "O que é uma derivada?", back: "A taxa de variação instantânea de uma função em relação a uma variável, representada por f\'(x) ou dy/dx." },
      { front: "O que é a Regra da Cadeia?", back: "Uma fórmula para calcular a derivada de uma função composta: (f∘g)\'(x) = f\'(g(x)) · g\'(x)." },
    ],
    questions: [
      "Qual é a definição formal de derivada de uma função?",
      "Como aplicar a Regra da Cadeia no cálculo de derivadas compostas?",
      "Qual a relação entre derivadas e taxas de variação instantânea?",
    ],
  },
  {
    id: "s2",
    subject: "História",
    subjectIcon: "📗",
    subjectColor: "#16A34A",
    subjectBg: "#F0FDF4",
    topic: "Século XX",
    concept: "Segunda Guerra Mundial",
    time: "Ontem",
    summary: "A Segunda Guerra Mundial foi o conflito armado mais destrutivo da história, envolvendo a maioria das nações do mundo entre 1939 e 1945. Dividiu o mundo em dois blocos: os Aliados e o Eixo. Resultou em mais de 70 milhões de mortes e remodelou completamente a geopolítica global.",
    concepts: ["Nazismo", "Holocausto", "Aliados", "Eixo", "Blitzkrieg"],
    keywords: ["1939-1945", "Hitler", "Segunda Guerra", "frentes de batalha", "rendição"],
    flashcards: [
      { front: "Quando ocorreu a Segunda Guerra Mundial?", back: "Entre 1939 e 1945, envolvendo a maioria das nações do mundo divididas entre Aliados e Eixo." },
      { front: "O que foi o Blitzkrieg?", back: "Tática de guerra relâmpago alemã que combinava aviação, blindados e infantaria motorizada para ataques rápidos e devastadores." },
    ],
    questions: [
      "Quais foram as principais causas da Segunda Guerra Mundial?",
      "Como o Holocausto impactou a criação da ONU e os Direitos Humanos?",
      "Qual foi o papel do Brasil na Segunda Guerra Mundial?",
    ],
  },
];

function getStoredItems() {
  try {
    const stored = JSON.parse(localStorage.getItem("sv_items") || "[]");
    const sampleIds = SAMPLE_ITEMS.map(s => s.id);
    const extras = stored.filter(s => !sampleIds.includes(s.id));
    return [...extras, ...SAMPLE_ITEMS];
  } catch { return SAMPLE_ITEMS; }
}

function saveItem(item) {
  try {
    const stored = JSON.parse(localStorage.getItem("sv_items") || "[]");
    const filtered = stored.filter(s => s.id !== item.id);
    localStorage.setItem("sv_items", JSON.stringify([item, ...filtered]));
  } catch {}
}

// ─── PAGE TRANSITIONS ────────────────────────────────────────────────────────
const slideIn = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 380, damping: 32 } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.18 } },
};
const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 340, damping: 28 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.15 } },
};

// ─── STATUS BAR ──────────────────────────────────────────────────────────────
function StatusBar({ light = false }) {
  const c = light ? "white" : "#111827";
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 48, zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "0 22px 8px", pointerEvents: "none" }}>
      <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 700, color: c, letterSpacing: -0.3 }}>9:41</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 1.5 }}>
          {[4, 6, 8, 10].map((h, i) => (
            <div key={i} style={{ width: 3, height: h, background: c, borderRadius: 2, opacity: i < 3 ? 1 : 0.35 }} />
          ))}
        </div>
        <svg width="16" height="12" viewBox="0 0 16 12" fill={c} opacity="0.9">
          <rect x="0.5" y="0.5" width="13" height="10" rx="1.5" fill="none" stroke={c} strokeWidth="1.2"/>
          <rect x="14" y="3.5" width="1.5" height="4" rx="0.75" fill={c}/>
          <rect x="1.8" y="1.8" width="9" height="7.4" rx="0.8" fill={c} opacity="0.7"/>
        </svg>
      </div>
    </div>
  );
}

// ─── TOAST ───────────────────────────────────────────────────────────────────
function Toast({ message, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2400); return () => clearTimeout(t); }, []);
  return (
    <motion.div initial={{ y: 100, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 80, opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      style={{ position: "absolute", bottom: 90, left: 20, right: 20, zIndex: 999, background: "#111827", borderRadius: 16, padding: "14px 18px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
      <CheckCircle size={20} color="#14B8A6" />
      <span style={{ fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 600, color: "white" }}>{message}</span>
    </motion.div>
  );
}

// ─── BOTTOM NAV ───────────────────────────────────────────────────────────────
function BottomNav({ active, onGo }) {
  const items = [
    { id: "camera", icon: <Camera size={22} />, label: "Câmera" },
    { id: "library", icon: <BookMarked size={22} />, label: "Biblioteca" },
    { id: "visionplus", icon: <Star size={22} />, label: "Vision+" },
  ];
  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(255,255,255,0.97)", backdropFilter: "blur(24px)", borderTop: "1px solid #F1F5F9", display: "flex", zIndex: 150, paddingBottom: 20, paddingTop: 2 }}>
      {items.map(item => {
        const isActive = active === item.id;
        return (
          <button key={item.id} onClick={() => onGo(item.id)}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, paddingTop: 8, background: "none", border: "none", cursor: "pointer" }}>
            <motion.span animate={{ color: isActive ? "#2563EB" : "#94A3B8" }} transition={{ duration: 0.2 }}>
              {item.icon}
            </motion.span>
            <span style={{ fontFamily: "Inter,sans-serif", fontSize: 10, fontWeight: 600, color: isActive ? "#2563EB" : "#94A3B8" }}>{item.label}</span>
            {isActive && <motion.div layoutId="navdot" style={{ width: 4, height: 4, borderRadius: "50%", background: "#2563EB" }} />}
          </button>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCREEN 1 — CAMERA
// ══════════════════════════════════════════════════════════════════════════════
function CameraScreen({ onCapture, onVisionPlusNav }) {
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
      {/* Viewfinder bg */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg,#0a1628 0%,#0d1f3c 45%,#080f22 100%)" }}>
        {/* Bokeh blobs */}
        {[
          { w: 100, h: 100, t: "8%", l: "10%", c: "#4f8ef7" },
          { w: 160, h: 160, t: "30%", l: "55%", c: "#7c5cdb" },
          { w: 80,  h: 80,  t: "65%", l: "20%", c: "#2dd4bf" },
          { w: 120, h: 120, t: "50%", l: "70%", c: "#f59e0b" },
          { w: 60,  h: 60,  t: "80%", l: "60%", c: "#4f8ef7" },
        ].map((b, i) => (
          <div key={i} style={{ position: "absolute", width: b.w, height: b.h, borderRadius: "50%", background: `radial-gradient(circle,${b.c}55,transparent)`, top: b.t, left: b.l, filter: "blur(22px)", opacity: 0.35 }} />
        ))}
        {/* Grid */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.08 }} viewBox="0 0 375 680">
          <line x1="125" y1="0" x2="125" y2="680" stroke="white" strokeWidth="0.6"/>
          <line x1="250" y1="0" x2="250" y2="680" stroke="white" strokeWidth="0.6"/>
          <line x1="0"   y1="226" x2="375" y2="226" stroke="white" strokeWidth="0.6"/>
          <line x1="0"   y1="453" x2="375" y2="453" stroke="white" strokeWidth="0.6"/>
        </svg>
        {/* Focus ring */}
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-60%)", width: 90, height: 90, border: "1.5px solid rgba(255,255,255,0.45)", borderRadius: 4 }}>
          {[["0 0","0 0"],["0 0","100% 0"],["0 100%","0 100%"],["100% 100%","100% 100%"]].map(([tl,br],i) => (
            <div key={i} style={{ position: "absolute", width: 14, height: 14, top: tl.split(" ")[0], left: tl.split(" ")[1], borderTop: i<2?"2px solid white":undefined, borderLeft: i===0||i===2?"2px solid white":undefined, borderBottom: i>=2?"2px solid white":undefined, borderRight: i===1||i===3?"2px solid white":undefined }} />
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
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 20, padding: "50px 18px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {/* Flash */}
        <button onClick={() => setFlash(v => !v)} style={{ width: 38, height: 38, borderRadius: "50%", background: flash ? "rgba(252,211,77,0.2)" : "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)" }}>
          <Zap size={20} fill={flash ? "#FCD34D" : "none"} color={flash ? "#FCD34D" : "white"} />
        </button>

        {/* HDR + Eye (Study Vision) + Settings — center cluster */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button style={{ background: "rgba(255,255,255,0.1)", border: "1.5px solid rgba(255,255,255,0.25)", borderRadius: 8, padding: "3px 8px", cursor: "pointer", backdropFilter: "blur(8px)" }}>
            <span style={{ fontFamily: "Inter,sans-serif", fontSize: 11, fontWeight: 700, color: "white", letterSpacing: 1 }}>HDR</span>
          </button>

          {/* 👁 Study Vision toggle */}
          <button onClick={() => setPanelOpen(v => !v)}
            style={{ width: 38, height: 38, borderRadius: "50%", background: panelOpen ? "rgba(37,99,235,0.5)" : "rgba(255,255,255,0.1)", border: panelOpen ? "1.5px solid rgba(37,99,235,0.8)" : "1.5px solid rgba(255,255,255,0.25)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)", transition: "all 0.25s" }}>
            <Eye size={18} color="white" />
          </button>

          <button style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)" }}>
            <Settings size={18} color="white" />
          </button>
        </div>

        {/* Ratio */}
        <button style={{ background: "rgba(255,255,255,0.1)", border: "1.5px solid rgba(255,255,255,0.25)", borderRadius: 8, padding: "3px 8px", cursor: "pointer", backdropFilter: "blur(8px)" }}>
          <span style={{ fontFamily: "Inter,sans-serif", fontSize: 11, fontWeight: 700, color: "white", letterSpacing: 0.5 }}>4:3</span>
        </button>
      </div>

      {/* Study Vision Panel */}
      <AnimatePresence>
        {panelOpen && (
          <motion.div initial={{ opacity: 0, y: -10, scale: 0.93 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            style={{ position: "absolute", top: 104, left: "50%", transform: "translateX(-50%)", zIndex: 30, width: 240, borderRadius: 20, overflow: "hidden", background: "rgba(10,16,35,0.92)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 16px 48px rgba(0,0,0,0.4)" }}>
            <div style={{ padding: "14px 16px 10px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <LogoSVG size={28} glow />
              <div>
                <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 800, color: "white", margin: 0 }}>Study Vision</p>
                <p style={{ fontFamily: "Inter,sans-serif", fontSize: 10, color: "rgba(255,255,255,0.45)", margin: 0 }}>JOVI · Modo ativo</p>
              </div>
              <div style={{ marginLeft: "auto", background: "rgba(20,184,166,0.15)", borderRadius: 20, padding: "2px 8px", border: "1px solid rgba(20,184,166,0.3)" }}>
                <span style={{ fontFamily: "Inter,sans-serif", fontSize: 10, fontWeight: 700, color: "#14B8A6" }}>ON</span>
              </div>
            </div>
            <div style={{ padding: "12px 16px 14px", display: "flex", flexDirection: "column", gap: 9 }}>
              {["OCR Avançado", "Resumo Inteligente", "Organização Automática", "Biblioteca Inteligente"].map((f, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i + 0.08 }}
                  style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CheckCircle size={13} color="#14B8A6" />
                  <span style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>{f}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
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
          <button style={{ width: 52, height: 52, borderRadius: 14, overflow: "hidden", border: "2.5px solid rgba(255,255,255,0.4)", cursor: "pointer", background: "linear-gradient(135deg,#1e3a8a,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <BookOpen size={22} color="rgba(255,255,255,0.8)" />
          </button>

          {/* Shutter */}
          <motion.button whileTap={{ scale: 0.9 }} onClick={handleCapture} disabled={capturing}
            style={{ width: 76, height: 76, borderRadius: "50%", background: "transparent", border: "4px solid rgba(255,255,255,0.6)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 2px rgba(255,255,255,0.15)" }}>
            <motion.div animate={{ background: capturing ? "#14B8A6" : "white" }} transition={{ duration: 0.2 }}
              style={{ width: 60, height: 60, borderRadius: "50%" }} />
          </motion.button>

          {/* Flip */}
          <button style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(255,255,255,0.12)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)" }}>
            <FlipHorizontal size={22} color="white" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCREEN 2 — ANALYSIS
// ══════════════════════════════════════════════════════════════════════════════
function AnalysisScreen({ onDone }) {
  const steps = [
    { text: "Texto identificado", delay: 0.9 },
    { text: "Legibilidade 96%", delay: 1.6 },
    { text: "Qualidade excelente", delay: 2.3 },
    { text: "Conteúdo pronto para estudo", delay: 2.9 },
  ];

  useEffect(() => { const t = setTimeout(onDone, 4600); return () => clearTimeout(t); }, []);

  return (
    <div style={{ width: "100%", height: "100%", background: "linear-gradient(160deg,#030712 0%,#0f172a 55%,#1e1b4b 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
      {/* Rings */}
      {[100, 160, 220].map((s, i) => (
        <motion.div key={i} animate={{ scale: [1, 1.12 + i * 0.05, 1], opacity: [0.25, 0.06, 0.25] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.4, ease: "easeInOut" }}
          style={{ position: "absolute", width: s, height: s, borderRadius: "50%", border: "1.5px solid rgba(37,99,235,0.55)" }} />
      ))}

      {/* Logo pulse */}
      <motion.div animate={{ scale: [0.96, 1.04, 0.96] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        style={{ position: "relative", zIndex: 10, marginBottom: 32, width: 80, height: 80, borderRadius: "50%", background: "rgba(37,99,235,0.12)", border: "2px solid rgba(37,99,235,0.4)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 40px rgba(37,99,235,0.35)" }}>
        <LogoSVG size={48} glow />
      </motion.div>

      <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        style={{ fontFamily: "Inter,sans-serif", fontSize: 22, fontWeight: 800, color: "white", marginBottom: 8, zIndex: 10, textAlign: "center" }}>
        Analisando conteúdo
      </motion.p>

      {/* Dots */}
      <div style={{ display: "flex", gap: 5, marginBottom: 36, zIndex: 10 }}>
        {[0, 1, 2].map(i => (
          <motion.div key={i} animate={{ scale: [1, 1.6, 1], opacity: [0.35, 1, 0.35] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.22 }}
            style={{ width: 6, height: 6, borderRadius: "50%", background: "#2563EB" }} />
        ))}
      </div>

      {/* Steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, zIndex: 10, width: 260 }}>
        {steps.map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: s.delay, type: "spring", stiffness: 300, damping: 22 }}
            style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(20,184,166,0.15)", border: "1.5px solid #14B8A6", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCircle size={13} color="#14B8A6" />
            </div>
            <span style={{ fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.88)" }}>{s.text}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCREEN 3 — SUMMARY
// ══════════════════════════════════════════════════════════════════════════════
function SummaryScreen({ onSave, onLibrary }) {
  const [saving, setSaving] = useState(false);
  const item = { ...SAMPLE_ITEMS[0], id: `u_${Date.now()}`, time: "Agora" };

  const handleSave = () => {
    if (saving) return;
    setSaving(true);
    setTimeout(() => { saveItem(item); onSave(); }, 900);
  };

  const blocks = [
    {
      label: "RESUMO INTELIGENTE", delay: 0.25,
      content: <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, lineHeight: 1.75, color: "#374151", margin: 0 }}>{item.summary}</p>,
    },
    {
      label: "CONCEITOS ENCONTRADOS", delay: 0.35,
      content: (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {item.concepts.map((c, i) => (
            <span key={i} style={{ fontFamily: "Inter,sans-serif", fontSize: 12, fontWeight: 600, color: "#2563EB", background: "#EFF6FF", borderRadius: 20, padding: "5px 14px" }}>{c}</span>
          ))}
        </div>
      ),
    },
    {
      label: "PALAVRAS-CHAVE", delay: 0.45,
      content: (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {item.keywords.map((k, i) => (
            <span key={i} style={{ fontFamily: "Inter,sans-serif", fontSize: 12, fontWeight: 500, color: "#64748B", background: "#F1F5F9", borderRadius: 20, padding: "4px 12px" }}>#{k}</span>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#F8FAFC", fontFamily: "Inter,sans-serif", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ background: "white", padding: "52px 20px 16px", borderBottom: "1px solid #F1F5F9", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <LogoSVG size={24} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#2563EB", letterSpacing: 1 }}>STUDY VISION</span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: 0, lineHeight: 1.2 }}>Resumo Inteligente</h1>
      </div>

      {/* Scroll area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 20px" }}>
        {/* Identified content */}
        <motion.div {...fadeUp} transition={{ delay: 0.1 }}
          style={{ background: "white", borderRadius: 20, padding: "16px 18px", marginBottom: 12, boxShadow: "0 1px 8px rgba(0,0,0,0.05)", border: "1px solid #E2E8F0" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", letterSpacing: 1.2, marginBottom: 12 }}>CONTEÚDO IDENTIFICADO</p>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 36, lineHeight: 1 }}>📘</span>
            <div>
              <p style={{ fontSize: 18, fontWeight: 800, color: "#111827", margin: 0 }}>{item.subject}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                <span style={{ fontSize: 11, color: "#64748B" }}>📍 {item.topic}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                <GraduationCap size={12} color="#2563EB" />
                <span style={{ fontSize: 12, color: "#2563EB", fontWeight: 700 }}>{item.concept}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Captured image placeholder */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
          style={{ borderRadius: 20, marginBottom: 12, height: 140, background: "linear-gradient(135deg,#1e3a8a 0%,#312e81 50%,#581c87 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 20px rgba(37,99,235,0.2)" }}>
          <FileText size={32} color="rgba(255,255,255,0.55)" />
          <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.6)", fontFamily: "Inter,sans-serif" }}>Imagem capturada</span>
        </motion.div>

        {/* Content blocks */}
        {blocks.map((b, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: b.delay }}
            style={{ background: "white", borderRadius: 20, padding: "16px 18px", marginBottom: 12, boxShadow: "0 1px 8px rgba(0,0,0,0.05)", border: "1px solid #E2E8F0" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", letterSpacing: 1.2, marginBottom: 10 }}>{b.label}</p>
            {b.content}
          </motion.div>
        ))}

        {/* Action buttons */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
          style={{ display: "flex", gap: 10, paddingBottom: 8 }}>
          <motion.button whileTap={{ scale: 0.95 }} onClick={handleSave} disabled={saving}
            style={{ flex: 1, height: 54, borderRadius: 16, background: saving ? "#14B8A6" : "linear-gradient(135deg,#2563EB,#7C3AED)", color: "white", fontFamily: "Inter,sans-serif", fontSize: 15, fontWeight: 700, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 18px rgba(37,99,235,0.3)", transition: "background 0.35s" }}>
            {saving ? <><CheckCircle size={18} /> Salvando...</> : <><Bookmark size={18} /> Salvar</>}
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={onLibrary}
            style={{ width: 54, height: 54, borderRadius: 16, background: "white", border: "1.5px solid #E2E8F0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <BookMarked size={20} color="#2563EB" />
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCREEN 4 — LIBRARY
// ══════════════════════════════════════════════════════════════════════════════
function LibraryScreen({ onOpenItem, onVisionPlus }) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("Todos");
  const [items, setItems] = useState([]);

  useEffect(() => { setItems(getStoredItems()); }, []);

  const filters = ["Todos", "Matemática", "História", "Química"];
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
        <div style={{ display: "flex", gap: 8, marginTop: 10, overflowX: "auto", paddingBottom: 2 }}>
          {filters.map(f => (
            <button key={f} onClick={() => setActiveFilter(f)}
              style={{ flexShrink: 0, padding: "5px 14px", borderRadius: 20, background: activeFilter === f ? "#2563EB" : "white", color: activeFilter === f ? "white" : "#64748B", fontFamily: "Inter,sans-serif", fontSize: 12, fontWeight: 600, border: activeFilter === f ? "none" : "1.5px solid #E2E8F0", cursor: "pointer" }}>
              {f}
            </button>
          ))}
        </div>
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
              <motion.button key={item.id}
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onOpenItem(item)}
                style={{ background: "white", borderRadius: 20, padding: "16px 16px", boxShadow: "0 1px 8px rgba(0,0,0,0.05)", border: "1px solid #E2E8F0", cursor: "pointer", textAlign: "left", width: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 46, height: 46, borderRadius: 14, background: item.subjectBg || "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>
                      {item.subjectIcon}
                    </div>
                    <div>
                      <p style={{ fontFamily: "Inter,sans-serif", fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>{item.concept}</p>
                      <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "#64748B", margin: "2px 0 0" }}>{item.subject} · {item.topic}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} color="#CBD5E1" />
                </div>
                <div style={{ marginTop: 10, display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#14B8A6", background: "rgba(20,184,166,0.1)", borderRadius: 6, padding: "3px 10px", fontFamily: "Inter,sans-serif" }}>Resumo</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#7C3AED", background: "rgba(124,58,237,0.1)", borderRadius: 6, padding: "3px 10px", fontFamily: "Inter,sans-serif" }}>Flashcards</span>
                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, color: "#94A3B8" }}>
                    <Clock size={11} />
                    <span style={{ fontSize: 11, fontFamily: "Inter,sans-serif" }}>{item.time}</span>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCREEN 5 — CONTENT DETAIL
// ══════════════════════════════════════════════════════════════════════════════
function ContentDetailScreen({ item, onBack, onFlashcards, onQuestions, onVisionPlus }) {
  const blocks = [
    {
      label: "RESUMO INTELIGENTE",
      content: <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, lineHeight: 1.75, color: "#374151", margin: 0 }}>{item.summary}</p>,
    },
    {
      label: "CONCEITOS",
      content: (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {item.concepts.map((c, i) => (
            <span key={i} style={{ fontSize: 12, fontWeight: 600, color: item.subjectColor, background: item.subjectBg, borderRadius: 20, padding: "5px 14px", fontFamily: "Inter,sans-serif" }}>{c}</span>
          ))}
        </div>
      ),
    },
    {
      label: "PALAVRAS-CHAVE",
      content: (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {item.keywords.map((k, i) => (
            <span key={i} style={{ fontSize: 12, fontWeight: 500, color: "#64748B", background: "#F1F5F9", borderRadius: 20, padding: "4px 12px", fontFamily: "Inter,sans-serif" }}>#{k}</span>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#F8FAFC", fontFamily: "Inter,sans-serif", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ background: "white", padding: "52px 20px 14px", borderBottom: "1px solid #F1F5F9", flexShrink: 0 }}>
        <button onClick={onBack}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 12 }}>
          <ChevronLeft size={20} color="#2563EB" />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#2563EB", fontFamily: "Inter,sans-serif" }}>Biblioteca</span>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: item.subjectBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 }}>
            {item.subjectIcon}
          </div>
          <div>
            <p style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: 0 }}>{item.concept}</p>
            <p style={{ fontSize: 13, color: "#64748B", margin: "2px 0 0" }}>{item.subject} · {item.topic}</p>
          </div>
        </div>
      </div>

      {/* Scroll */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px 20px" }}>
        {/* Image placeholder */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          style={{ borderRadius: 20, marginBottom: 12, height: 120, background: `linear-gradient(135deg,${item.subjectColor}22,${item.subjectColor}44)`, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${item.subjectColor}22` }}>
          <FileText size={30} color={item.subjectColor} />
        </motion.div>

        {blocks.map((b, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * (i + 1) }}
            style={{ background: "white", borderRadius: 20, padding: "16px 18px", marginBottom: 10, boxShadow: "0 1px 8px rgba(0,0,0,0.05)", border: "1px solid #E2E8F0" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", letterSpacing: 1.2, marginBottom: 10 }}>{b.label}</p>
            {b.content}
          </motion.div>
        ))}

        {/* Action buttons */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
          style={{ display: "flex", gap: 10, marginTop: 4, paddingBottom: 8 }}>
          <motion.button whileTap={{ scale: 0.95 }} onClick={onFlashcards}
            style={{ flex: 1, height: 52, borderRadius: 16, background: "white", border: "1.5px solid #E2E8F0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <CreditCard size={18} color="#7C3AED" />
            <span style={{ fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 700, color: "#7C3AED" }}>Flashcards</span>
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={onQuestions}
            style={{ flex: 1, height: 52, borderRadius: 16, background: "white", border: "1.5px solid #E2E8F0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <HelpCircle size={18} color="#2563EB" />
            <span style={{ fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 700, color: "#2563EB" }}>Perguntas</span>
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCREEN 6a — FLASHCARDS
// ══════════════════════════════════════════════════════════════════════════════
function FlashcardsScreen({ item, onBack, onVisionPlus }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#F8FAFC", fontFamily: "Inter,sans-serif", overflow: "hidden" }}>
      <div style={{ background: "white", padding: "52px 20px 14px", borderBottom: "1px solid #F1F5F9", flexShrink: 0 }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 12 }}>
          <ChevronLeft size={20} color="#7C3AED" />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#7C3AED" }}>Voltar</span>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CreditCard size={22} color="#7C3AED" />
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: 0 }}>Flashcards</h1>
        </div>
        <p style={{ fontSize: 13, color: "#64748B", margin: "4px 0 0" }}>Baseados em: {item?.concept}</p>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px 20px" }}>
        {(item?.flashcards || []).map((card, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            style={{ background: "white", borderRadius: 20, marginBottom: 12, overflow: "hidden", boxShadow: "0 1px 8px rgba(0,0,0,0.06)", border: "1px solid #E2E8F0" }}>
            <div style={{ padding: "16px 18px", borderBottom: "1px solid #F1F5F9" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#7C3AED", letterSpacing: 1.2, marginBottom: 6 }}>FRENTE</p>
              <p style={{ fontSize: 15, fontWeight: 600, color: "#111827", margin: 0 }}>{card.front}</p>
            </div>
            <div style={{ padding: "16px 18px", background: "#FAFAFA", position: "relative" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", letterSpacing: 1.2, marginBottom: 6 }}>VERSO</p>
              <p style={{ fontSize: 14, color: "#374151", margin: 0, filter: "blur(5px)", userSelect: "none" }}>{card.back}</p>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(250,250,250,0.75)", borderRadius: "0 0 20px 20px" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <Lock size={16} color="#94A3B8" />
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", fontFamily: "Inter,sans-serif" }}>Desbloqueie o Vision+</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {/* Unlock CTA */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          style={{ background: "linear-gradient(135deg,#EDE9FE,#DDD6FE)", borderRadius: 20, padding: "22px 20px", textAlign: "center", border: "1px solid #C4B5FD", marginTop: 4 }}>
          <Lock size={24} color="#7C3AED" style={{ margin: "0 auto 10px" }} />
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 16, fontWeight: 700, color: "#7C3AED", marginBottom: 6, margin: "0 0 6px" }}>Desbloqueie o Study Vision+</p>
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: "#6D28D9", marginBottom: 16, margin: "0 0 16px" }}>Acesse todos os flashcards e revise de forma inteligente</p>
          <motion.button whileTap={{ scale: 0.96 }} onClick={onVisionPlus}
            style={{ padding: "11px 28px", borderRadius: 14, background: "linear-gradient(135deg,#7C3AED,#2563EB)", color: "white", fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer", boxShadow: "0 4px 14px rgba(124,58,237,0.35)" }}>
            Ver Vision+
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCREEN 6b — QUESTIONS
// ══════════════════════════════════════════════════════════════════════════════
function QuestionsScreen({ item, onBack, onVisionPlus }) {
  const qs = item?.questions || [];
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#F8FAFC", fontFamily: "Inter,sans-serif", overflow: "hidden" }}>
      <div style={{ background: "white", padding: "52px 20px 14px", borderBottom: "1px solid #F1F5F9", flexShrink: 0 }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 12 }}>
          <ChevronLeft size={20} color="#2563EB" />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#2563EB" }}>Voltar</span>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <HelpCircle size={22} color="#2563EB" />
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: 0 }}>Perguntas</h1>
        </div>
        <p style={{ fontSize: 13, color: "#64748B", margin: "4px 0 0" }}>Baseadas em: {item?.concept}</p>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px 20px" }}>
        {qs.map((q, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            style={{ background: "white", borderRadius: 20, padding: "16px 18px", marginBottom: 10, boxShadow: "0 1px 8px rgba(0,0,0,0.06)", border: "1px solid #E2E8F0", position: "relative", overflow: "hidden" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#2563EB", letterSpacing: 1.2, marginBottom: 6 }}>PERGUNTA {i + 1}</p>
            <p style={{ fontSize: 14, color: i > 0 ? "#CBD5E1" : "#374151", lineHeight: 1.55, margin: 0, filter: i > 0 ? "blur(3.5px)" : "none", userSelect: i > 0 ? "none" : "auto" }}>{q}</p>
            {i > 0 && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.55)" }}>
                <Lock size={15} color="#94A3B8" />
              </div>
            )}
          </motion.div>
        ))}

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
          style={{ background: "linear-gradient(135deg,#EFF6FF,#DBEAFE)", borderRadius: 20, padding: "22px 20px", textAlign: "center", border: "1px solid #BFDBFE", marginTop: 4 }}>
          <Star size={24} color="#2563EB" fill="#2563EB" style={{ margin: "0 auto 10px" }} />
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 16, fontWeight: 700, color: "#1E40AF", margin: "0 0 6px" }}>Disponível no Vision+</p>
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: "#1D4ED8", margin: "0 0 16px" }}>Gere perguntas ilimitadas com IA e teste seus conhecimentos</p>
          <motion.button whileTap={{ scale: 0.96 }} onClick={onVisionPlus}
            style={{ padding: "11px 28px", borderRadius: 14, background: "linear-gradient(135deg,#2563EB,#7C3AED)", color: "white", fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer", boxShadow: "0 4px 14px rgba(37,99,235,0.3)" }}>
            Ver Vision+
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCREEN 7 — VISION+
// ══════════════════════════════════════════════════════════════════════════════
function VisionPlusScreen({ onBack }) {
  const features = [
    {
      icon: <CreditCard size={26} />,
      title: "Flashcards Inteligentes",
      desc: "Transforme automaticamente qualquer conteúdo em flashcards com revisão espaçada baseada em IA. Nunca mais esqueça o que estudou.",
      grad: "linear-gradient(135deg,#7C3AED,#4F46E5)",
      glow: "rgba(124,58,237,0.28)",
    },
    {
      icon: <Brain size={26} />,
      title: "Perguntas Inteligentes",
      desc: "Gere perguntas personalizadas com IA para testar seu conhecimento e identificar lacunas no aprendizado de forma eficiente.",
      grad: "linear-gradient(135deg,#2563EB,#0EA5E9)",
      glow: "rgba(37,99,235,0.28)",
    },
  ];

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#030712", fontFamily: "Inter,sans-serif", overflow: "hidden" }}>
      <div style={{ padding: "52px 20px 0", flexShrink: 0 }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <ChevronLeft size={20} color="rgba(255,255,255,0.5)" />
          <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>Voltar</span>
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px 30px" }}>
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(37,99,235,0.12)", border: "2px solid rgba(37,99,235,0.35)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 30px rgba(37,99,235,0.3)" }}>
              <LogoSVG size={34} glow />
            </div>
            <div style={{ textAlign: "left" }}>
              <p style={{ fontFamily: "Inter,sans-serif", fontSize: 26, fontWeight: 900, color: "white", margin: 0, lineHeight: 1.1 }}>Study</p>
              <p style={{ fontFamily: "Inter,sans-serif", fontSize: 26, fontWeight: 900, margin: 0, lineHeight: 1.1, background: "linear-gradient(90deg,#60A5FA,#A78BFA)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Vision+</p>
            </div>
          </div>
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.65, maxWidth: 260, margin: "0 auto" }}>
            Eleve seu aprendizado com IA generativa. Funcionalidades exclusivas para quem leva os estudos a sério.
          </p>
        </motion.div>

        {/* Feature cards */}
        {features.map((f, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.13, type: "spring", stiffness: 280, damping: 24 }}
            style={{ borderRadius: 24, overflow: "hidden", marginBottom: 14, boxShadow: `0 8px 32px ${f.glow}` }}>
            <div style={{ background: f.grad, padding: "22px 22px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ color: "white", opacity: 0.9 }}>{f.icon}</span>
                <span style={{ fontFamily: "Inter,sans-serif", fontSize: 17, fontWeight: 800, color: "white" }}>{f.title}</span>
                <div style={{ marginLeft: "auto", background: "rgba(255,255,255,0.2)", borderRadius: 20, padding: "3px 10px" }}>
                  <Star size={11} fill="white" color="white" />
                </div>
              </div>
              <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: "rgba(255,255,255,0.82)", lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
            </div>
            <div style={{ background: "rgba(255,255,255,0.04)", padding: "12px 22px", display: "flex", alignItems: "center", gap: 6, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <Lock size={13} color="rgba(255,255,255,0.4)" />
              <span style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>Disponível com Vision+</span>
            </div>
          </motion.div>
        ))}

        {/* CTA */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }} style={{ marginTop: 8 }}>
          <motion.button whileTap={{ scale: 0.97 }}
            style={{ width: "100%", height: 56, borderRadius: 18, background: "linear-gradient(135deg,#2563EB,#7C3AED)", border: "none", cursor: "pointer", fontFamily: "Inter,sans-serif", fontSize: 16, fontWeight: 800, color: "white", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 8px 32px rgba(124,58,237,0.4)" }}>
            <Sparkles size={18} />
            Ativar Study Vision+
          </motion.button>
          <p style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.2)", marginTop: 12, fontFamily: "Inter,sans-serif" }}>
            JOVI Smartphones · "A câmera que captura conhecimento."
          </p>
        </motion.div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ══════════════════════════════════════════════════════════════════════════════
export default function StudyVision() {
  const [screen, setScreen] = useState("camera");
  const [selectedItem, setSelectedItem] = useState(null);
  const [toast, setToast] = useState(null);
  const [prevScreens, setPrevScreens] = useState([]);

  const go = useCallback((to) => {
    setPrevScreens(p => [...p, screen]);
    setScreen(to);
  }, [screen]);

  const goBack = useCallback(() => {
    const prev = [...prevScreens];
    const last = prev.pop() || "camera";
    setPrevScreens(prev);
    setScreen(last);
  }, [prevScreens]);

  const goTo = useCallback((to) => {
    setPrevScreens([]);
    setScreen(to);
  }, []);

  const showToast = (msg) => setToast(msg);

  // Bottom nav active
  const navActive = ["library", "detail", "flashcards", "questions"].includes(screen) ? "library"
    : screen === "visionplus" ? "visionplus" : "camera";

  const isLight = !["camera", "analysis", "visionplus"].includes(screen);
  const showNav = !["camera", "analysis"].includes(screen);

  const transitions = ["visionplus", "library"].includes(screen) ? fadeUp : slideIn;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#0B1120", fontFamily: "Inter,sans-serif" }}>
      {/* Phone frame */}
      <div style={{ width: 375, height: 812, position: "relative", borderRadius: 52, overflow: "hidden", boxShadow: "0 0 0 11px #1a2640, 0 0 0 13px #243352, 0 48px 96px rgba(0,0,0,0.75)", background: "#000", flexShrink: 0 }}>
        {/* Notch */}
        <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 126, height: 34, background: "#000", borderRadius: "0 0 22px 22px", zIndex: 300 }} />

        <StatusBar light={!isLight} />

        {/* Screen transitions */}
        <AnimatePresence mode="wait">
          <motion.div key={screen} {...transitions}
            style={{ position: "absolute", inset: 0, paddingBottom: showNav ? 80 : 0 }}>
            {screen === "camera" && (
              <CameraScreen
                onCapture={() => go("analysis")}
                onVisionPlusNav={() => go("visionplus")}
              />
            )}
            {screen === "analysis" && (
              <AnalysisScreen onDone={() => { setPrevScreens([]); setScreen("summary"); }} />
            )}
            {screen === "summary" && (
              <SummaryScreen
                onSave={() => { showToast("✓ Conteúdo salvo com sucesso"); setTimeout(() => goTo("library"), 500); }}
                onLibrary={() => goTo("library")}
              />
            )}
            {screen === "library" && (
              <LibraryScreen
                onOpenItem={(item) => { setSelectedItem(item); go("detail"); }}
                onVisionPlus={() => go("visionplus")}
              />
            )}
            {screen === "detail" && selectedItem && (
              <ContentDetailScreen
                item={selectedItem}
                onBack={goBack}
                onFlashcards={() => go("flashcards")}
                onQuestions={() => go("questions")}
                onVisionPlus={() => go("visionplus")}
              />
            )}
            {screen === "flashcards" && (
              <FlashcardsScreen item={selectedItem} onBack={goBack} onVisionPlus={() => go("visionplus")} />
            )}
            {screen === "questions" && (
              <QuestionsScreen item={selectedItem} onBack={goBack} onVisionPlus={() => go("visionplus")} />
            )}
            {screen === "visionplus" && (
              <VisionPlusScreen onBack={goBack} />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Bottom nav */}
        {showNav && (
          <BottomNav active={navActive}
            onGo={(id) => {
              if (id === "camera") goTo("camera");
              else if (id === "library") goTo("library");
              else goTo("visionplus");
            }}
          />
        )}

        {/* Toast */}
        <AnimatePresence>
          {toast && <Toast message={toast} onDone={() => setToast(null)} />}
        </AnimatePresence>
      </div>

      {/* Desktop label */}
      <p style={{ position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)", color: "rgba(255,255,255,0.18)", fontSize: 11, fontFamily: "Inter,sans-serif", whiteSpace: "nowrap" }}>
        JOVI Smartphones · Study Vision Prototype · Pitch de Inovação
      </p>
    </div>
  );
}
