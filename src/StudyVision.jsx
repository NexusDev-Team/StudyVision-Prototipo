import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Settings, FlipHorizontal, BookOpen, Search, X,
  ChevronRight, Star, Brain, Bookmark, BookMarked,
  CheckCircle, Sparkles, Lock, HelpCircle, CreditCard,
  Clock, ChevronLeft, Eye, SlidersHorizontal, RotateCcw,
  Camera, ArrowRight, GraduationCap, Hash, Layers,
  ThumbsUp, ThumbsDown, XCircle, CalendarClock, ListChecks,
  Calendar, FileText, Copy, CalendarPlus
} from "lucide-react";
import exemploFoto1 from "./assets/exemplo-foto1.png";
import { exportToNotion } from "./services/notionService";
import { exportDocument, copyContent } from "./services/exportService";
import { createEvent, scheduleReviews } from "./services/calendarService";

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

// ─── CAPTURED CONTENT PREVIEW ──────────────────────────────────────────────────
// Simulates the photo taken by the camera: a page mockup shot at a slight angle,
// with a camera-style vignette, instead of a generic "file" placeholder.
function CapturedPageVisual({ item, height = 140 }) {
  const lineWidths = ["90%", "72%", "84%", "60%", "78%"];
  return (
    <div style={{ position: "relative", height, borderRadius: 20, overflow: "hidden", background: `linear-gradient(135deg, ${item.subjectColor} 0%, #1e1b4b 100%)`, boxShadow: `0 4px 20px ${item.subjectColor}33` }}>
      {/* Photographed page */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "70%", height: "82%", background: "#FAFAF7", borderRadius: 6, transform: "rotate(-4deg)", boxShadow: "0 14px 28px rgba(0,0,0,0.4)", padding: "10%", position: "relative" }}>
          <span style={{ position: "absolute", top: 8, right: 10, fontSize: 18, lineHeight: 1 }}>{item.subjectIcon}</span>
          {lineWidths.map((w, i) => (
            <div key={i} style={{ height: 3.5, width: w, borderRadius: 2, marginBottom: 9, background: i === 0 ? item.subjectColor : "#CBD5E1", opacity: i === 0 ? 0.85 : 0.55 }} />
          ))}
        </div>
      </div>
      {/* Camera vignette */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 42%, transparent 45%, rgba(0,0,0,0.4) 100%)", pointerEvents: "none" }} />
      {/* Capture frame corners */}
      {[
        { top: 8, left: 8, borderTop: "2px solid rgba(255,255,255,0.55)", borderLeft: "2px solid rgba(255,255,255,0.55)" },
        { top: 8, right: 8, borderTop: "2px solid rgba(255,255,255,0.55)", borderRight: "2px solid rgba(255,255,255,0.55)" },
        { bottom: 8, left: 8, borderBottom: "2px solid rgba(255,255,255,0.55)", borderLeft: "2px solid rgba(255,255,255,0.55)" },
        { bottom: 8, right: 8, borderBottom: "2px solid rgba(255,255,255,0.55)", borderRight: "2px solid rgba(255,255,255,0.55)" },
      ].map((pos, i) => (
        <div key={i} style={{ position: "absolute", width: 12, height: 12, ...pos }} />
      ))}
    </div>
  );
}

// ─── SPACED REPETITION ────────────────────────────────────────────────────────
const DAY_MS = 24 * 60 * 60 * 1000;
const REVIEW_OFFSETS = [
  { stage: 1, label: "D+1", days: 1 },
  { stage: 2, label: "D+3", days: 3 },
  { stage: 3, label: "D+7", days: 7 },
  { stage: 4, label: "D+15", days: 15 },
  { stage: 5, label: "D+30", days: 30 },
];

function buildReviewSchedule(fromMs) {
  return REVIEW_OFFSETS.map(o => ({
    stage: o.stage,
    label: o.label,
    dueAt: fromMs + o.days * DAY_MS,
    done: false,
  }));
}

function nextPendingReview(item) {
  return (item.reviewSchedule || []).find(r => !r.done) || null;
}

function isDueForReview(item) {
  const next = nextPendingReview(item);
  return !!next && next.dueAt <= Date.now();
}

function completedReviews(item) {
  return (item.reviewSchedule || []).filter(r => r.done).length;
}

function formatDue(dueAt) {
  const diffDays = Math.round((dueAt - Date.now()) / DAY_MS);
  if (diffDays <= 0) return "Hoje";
  if (diffDays === 1) return "Amanhã";
  return new Date(dueAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
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
    time: "Há 2 dias",
    summary: "Uma derivada mede a taxa de variação instantânea de uma função em relação a uma de suas variáveis. É um conceito fundamental no cálculo diferencial, representado pela notação f\'(x) ou dy/dx. Geometricamente, representa a inclinação da reta tangente à curva no ponto.",
    concepts: ["Derivadas", "Limites", "Regra da Cadeia", "Cálculo Diferencial"],
    keywords: ["taxa de variação", "f\'(x)", "dy/dx", "tangente", "instantânea"],
    flashcards: [
      { front: "O que é uma derivada?", back: "A taxa de variação instantânea de uma função em relação a uma variável, representada por f\'(x) ou dy/dx." },
      { front: "O que é a Regra da Cadeia?", back: "Uma fórmula para calcular a derivada de uma função composta: (f∘g)\'(x) = f\'(g(x)) · g\'(x)." },
      { front: "O que representa a derivada geometricamente?", back: "A inclinação (coeficiente angular) da reta tangente ao gráfico da função no ponto considerado." },
      { front: "Qual a notação de Leibniz para derivada?", back: "dy/dx, que representa a variação infinitesimal de y em relação a x." },
      { front: "Quando uma função é dita derivável em um ponto?", back: "Quando o limite que define a derivada existe e é finito naquele ponto." },
    ],
    questions: [
      "Qual é a definição formal de derivada de uma função?",
      "Como aplicar a Regra da Cadeia no cálculo de derivadas compostas?",
      "Qual a relação entre derivadas e taxas de variação instantânea?",
    ],
    quiz: [
      { type: "mc", question: "A derivada de uma função representa geometricamente:", options: ["A área sob a curva", "A inclinação da reta tangente", "O valor máximo da função", "O ponto de interseção com o eixo Y"], answer: 1 },
      { type: "vf", question: "A Regra da Cadeia é usada para derivar funções compostas.", answer: true },
      { type: "mc", question: "A notação dy/dx foi introduzida por:", options: ["Newton", "Leibniz", "Euler", "Gauss"], answer: 1 },
      { type: "vf", question: "Toda função contínua é derivável em todos os pontos.", answer: false },
    ],
    reviewSchedule: buildReviewSchedule(Date.now() - 2 * DAY_MS).map((r, i) => i === 0 ? { ...r, done: true } : r),
  },
  {
    id: "s2",
    subject: "História",
    subjectIcon: "📗",
    subjectColor: "#16A34A",
    subjectBg: "#F0FDF4",
    topic: "Século XX",
    concept: "Segunda Guerra Mundial",
    time: "Há 6 dias",
    summary: "A Segunda Guerra Mundial foi o conflito armado mais destrutivo da história, envolvendo a maioria das nações do mundo entre 1939 e 1945. Dividiu o mundo em dois blocos: os Aliados e o Eixo. Resultou em mais de 70 milhões de mortes e remodelou completamente a geopolítica global.",
    concepts: ["Nazismo", "Holocausto", "Aliados", "Eixo", "Blitzkrieg"],
    keywords: ["1939-1945", "Hitler", "Segunda Guerra", "frentes de batalha", "rendição"],
    flashcards: [
      { front: "Quando ocorreu a Segunda Guerra Mundial?", back: "Entre 1939 e 1945, envolvendo a maioria das nações do mundo divididas entre Aliados e Eixo." },
      { front: "O que foi o Blitzkrieg?", back: "Tática de guerra relâmpago alemã que combinava aviação, blindados e infantaria motorizada para ataques rápidos e devastadores." },
      { front: "Quais formavam os países do Eixo?", back: "Principalmente Alemanha, Itália e Japão." },
      { front: "O que foi o Holocausto?", back: "O extermínio sistemático de cerca de 6 milhões de judeus e outras minorias pelo regime nazista." },
    ],
    questions: [
      "Quais foram as principais causas da Segunda Guerra Mundial?",
      "Como o Holocausto impactou a criação da ONU e os Direitos Humanos?",
      "Qual foi o papel do Brasil na Segunda Guerra Mundial?",
    ],
    quiz: [
      { type: "mc", question: "A Segunda Guerra Mundial ocorreu entre:", options: ["1914-1918", "1939-1945", "1945-1950", "1929-1939"], answer: 1 },
      { type: "vf", question: "O Brasil enviou tropas para lutar na Itália durante a guerra.", answer: true },
      { type: "mc", question: "O Blitzkrieg é uma tática caracterizada por:", options: ["Guerra de trincheiras", "Ataques navais isolados", "Ofensivas rápidas e coordenadas", "Bloqueio econômico"], answer: 2 },
    ],
    reviewSchedule: buildReviewSchedule(Date.now() - 6 * DAY_MS).map((r, i) => i <= 1 ? { ...r, done: true } : r),
  },
  {
    id: "s3",
    subject: "Química",
    subjectIcon: "🧪",
    subjectColor: "#EA580C",
    subjectBg: "#FFF7ED",
    topic: "Físico-Química",
    concept: "Ligações Químicas",
    time: "Há 15 dias",
    summary: "Ligações químicas são forças de atração que unem átomos formando moléculas ou compostos. Os três tipos principais são: iônica (transferência de elétrons entre metal e não metal), covalente (compartilhamento de elétrons entre não metais) e metálica (nuvem de elétrons livres entre átomos de metais).",
    concepts: ["Ligação Iônica", "Ligação Covalente", "Ligação Metálica", "Eletronegatividade"],
    keywords: ["elétrons de valência", "octeto", "compartilhamento", "transferência", "metais"],
    flashcards: [
      { front: "O que é uma ligação iônica?", back: "Transferência de elétrons entre um átomo metálico e um não metálico, formando íons de cargas opostas que se atraem." },
      { front: "O que é uma ligação covalente?", back: "Compartilhamento de pares de elétrons entre átomos, geralmente entre não metais." },
      { front: "O que é a regra do octeto?", back: "Tendência dos átomos de ganhar, perder ou compartilhar elétrons para atingir 8 elétrons na camada de valência." },
    ],
    questions: [
      "Qual a diferença entre ligação iônica e covalente?",
      "Por que os metais formam ligações metálicas e não covalentes?",
      "Como a eletronegatividade influencia o tipo de ligação formada?",
    ],
    quiz: [
      { type: "mc", question: "Uma ligação formada por transferência de elétrons é chamada de:", options: ["Covalente", "Metálica", "Iônica", "Dativa"], answer: 2 },
      { type: "vf", question: "Ligações covalentes envolvem compartilhamento de elétrons.", answer: true },
    ],
    reviewSchedule: buildReviewSchedule(Date.now() - 15 * DAY_MS).map((r, i) => i <= 2 ? { ...r, done: true } : r),
  },
];

// Pool of possible "captures" — the demo camera cycles through these to
// simulate different content being recognized, instead of always the same one.
const CAPTURE_POOL = [SAMPLE_ITEMS[0], SAMPLE_ITEMS[1], SAMPLE_ITEMS[2]];
let captureIndex = 0;
function nextCaptureTemplate() {
  const template = CAPTURE_POOL[captureIndex % CAPTURE_POOL.length];
  captureIndex += 1;
  return template;
}

function getStoredItems() {
  try {
    const stored = JSON.parse(localStorage.getItem("sv_items") || "[]");
    const storedIds = new Set(stored.map(s => s.id));
    // Stored (possibly updated) items win over the hardcoded seed data for the same id.
    return [...stored, ...SAMPLE_ITEMS.filter(s => !storedIds.has(s.id))];
  } catch { return SAMPLE_ITEMS; }
}

function saveItem(item) {
  try {
    const stored = JSON.parse(localStorage.getItem("sv_items") || "[]");
    const filtered = stored.filter(s => s.id !== item.id);
    localStorage.setItem("sv_items", JSON.stringify([item, ...filtered]));
  } catch {}
}

function getDueItems() {
  return getStoredItems().filter(isDueForReview);
}

// Advances the item's earliest pending review stage to "done" and persists it.
function markReviewDone(item) {
  const schedule = item.reviewSchedule || [];
  const idx = schedule.findIndex(r => !r.done);
  if (idx === -1) return item;
  const updated = { ...item, reviewSchedule: schedule.map((r, i) => i === idx ? { ...r, done: true } : r) };
  saveItem(updated);
  return updated;
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
function BottomNav({ active, onGo, dueCount = 0 }) {
  const items = [
    { id: "camera", icon: <Camera size={22} />, label: "Câmera" },
    { id: "library", icon: <BookMarked size={22} />, label: "Biblioteca" },
    { id: "review", icon: <CalendarClock size={22} />, label: "Revisão" },
    { id: "visionplus", icon: <Star size={22} />, label: "Vision+" },
  ];
  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(255,255,255,0.97)", backdropFilter: "blur(24px)", borderTop: "1px solid #F1F5F9", display: "flex", zIndex: 150, paddingBottom: 20, paddingTop: 2 }}>
      {items.map(item => {
        const isActive = active === item.id;
        return (
          <button key={item.id} onClick={() => onGo(item.id)}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, paddingTop: 8, background: "none", border: "none", cursor: "pointer", position: "relative" }}>
            <div style={{ position: "relative" }}>
              <motion.span animate={{ color: isActive ? "#2563EB" : "#94A3B8" }} transition={{ duration: 0.2 }}>
                {item.icon}
              </motion.span>
              {item.id === "review" && dueCount > 0 && (
                <span style={{ position: "absolute", top: -4, right: -8, minWidth: 15, height: 15, borderRadius: 8, background: "#EF4444", color: "white", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", fontFamily: "Inter,sans-serif" }}>
                  {dueCount}
                </span>
              )}
            </div>
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
          {[
            { top: 0, left: 0 },
            { top: 0, right: 0 },
            { bottom: 0, left: 0 },
            { bottom: 0, right: 0 },
          ].map((pos, i) => (
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
          <button style={{ width: 52, height: 52, borderRadius: 14, overflow: "hidden", border: "2.5px solid rgba(255,255,255,0.4)", cursor: "pointer", background: "linear-gradient(135deg,#1e3a8a,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center" }}>
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

// ─── EXPORT CONTENT SECTION ─────────────────────────────────────────────────
function ExportSection({ item, onToast }) {
  const [busy, setBusy] = useState(null); // "notion" | "doc" | "copy" | null

  const run = async (key, fn, successMsg) => {
    if (busy) return;
    setBusy(key);
    await fn(item);
    setBusy(null);
    onToast(successMsg);
  };

  const options = [
    { key: "notion", label: "Notion", icon: <BookOpen size={18} color="#111827" />, action: () => run("notion", exportToNotion, "✓ Conteúdo enviado ao Notion com sucesso") },
    { key: "doc", label: "Documento PDF/DOCX", icon: <FileText size={18} color="#DC2626" />, action: () => run("doc", exportDocument, "✓ Documento gerado com sucesso") },
    { key: "copy", label: "Copiar Conteúdo", icon: <Copy size={18} color="#2563EB" />, action: () => run("copy", copyContent, "✓ Conteúdo copiado") },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
      style={{ background: "white", borderRadius: 20, padding: "16px 18px", marginBottom: 12, boxShadow: "0 1px 8px rgba(0,0,0,0.05)", border: "1px solid #E2E8F0" }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", letterSpacing: 1.2, marginBottom: 10 }}>EXPORTAR CONTEÚDO</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {options.map(o => (
          <button key={o.key} onClick={o.action} disabled={!!busy}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", borderRadius: 12, background: "#F8FAFC", border: "1px solid #E2E8F0", cursor: busy ? "default" : "pointer", fontFamily: "Inter,sans-serif" }}>
            {o.icon}
            <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{o.label}</span>
            {busy === o.key && <span style={{ marginLeft: "auto", fontSize: 11, color: "#94A3B8" }}>Enviando...</span>}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ─── PLANNING SECTION (Calendário) ──────────────────────────────────────────
const PLANNING_TYPES = ["Prova", "Trabalho", "Apresentação", "Revisão"];
const REMINDER_OPTIONS = [
  { days: 7, label: "7 dias antes" },
  { days: 3, label: "3 dias antes" },
  { days: 1, label: "1 dia antes" },
  { days: 0, label: "No dia" },
];

function PlanningModal({ onClose, onConfirm }) {
  const [type, setType] = useState(PLANNING_TYPES[0]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [reminders, setReminders] = useState([7, 3, 1, 0]);
  const [saving, setSaving] = useState(false);

  const toggleReminder = (days) => {
    setReminders(r => r.includes(days) ? r.filter(d => d !== days) : [...r, days]);
  };

  const handleConfirm = async () => {
    if (saving || !date || !time) return;
    setSaving(true);
    try {
      await onConfirm({ type, date, time, reminders });
    } finally {
      setSaving(false);
    }
  };

  const modal = (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "absolute", inset: 0, zIndex: 400, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "flex-end" }}>
      <motion.div initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }} transition={{ type: "spring", stiffness: 340, damping: 32 }}
        style={{ width: "100%", maxHeight: "88%", overflowY: "auto", background: "white", borderRadius: "24px 24px 0 0", padding: "20px 20px 28px", fontFamily: "Inter,sans-serif", boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <p style={{ fontSize: 17, fontWeight: 800, color: "#111827", margin: 0 }}>Novo Compromisso</p>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <X size={20} color="#94A3B8" />
          </button>
        </div>

        <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: 1, marginBottom: 8 }}>TIPO</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {PLANNING_TYPES.map(t => (
            <button key={t} onClick={() => setType(t)}
              style={{ padding: "7px 14px", borderRadius: 20, background: type === t ? "#2563EB" : "#F1F5F9", color: type === t ? "white" : "#64748B", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer" }}>
              {t}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: 1, marginBottom: 6 }}>DATA</p>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ width: "100%", minWidth: 0, height: 42, borderRadius: 12, border: "1.5px solid #E2E8F0", padding: "0 8px", fontFamily: "Inter,sans-serif", fontSize: 12.5, boxSizing: "border-box", colorScheme: "light" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: 1, marginBottom: 6 }}>HORÁRIO</p>
            <input type="time" value={time} onChange={e => setTime(e.target.value)}
              style={{ width: "100%", minWidth: 0, height: 42, borderRadius: 12, border: "1.5px solid #E2E8F0", padding: "0 8px", fontFamily: "Inter,sans-serif", fontSize: 12.5, boxSizing: "border-box", colorScheme: "light" }} />
          </div>
        </div>

        <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: 1, marginBottom: 8 }}>REVISÕES AUTOMÁTICAS</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
          {REMINDER_OPTIONS.map(o => (
            <label key={o.days} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={reminders.includes(o.days)} onChange={() => toggleReminder(o.days)} />
              <span style={{ fontSize: 13, color: "#374151" }}>{o.label}</span>
            </label>
          ))}
        </div>

        <motion.button whileTap={{ scale: 0.97 }} onClick={handleConfirm} disabled={saving || !date || !time}
          style={{ width: "100%", height: 52, borderRadius: 16, background: (!date || !time) ? "#CBD5E1" : "linear-gradient(135deg,#2563EB,#7C3AED)", color: "white", fontSize: 14, fontWeight: 700, border: "none", cursor: (!date || !time) ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Calendar size={17} /> {saving ? "Salvando..." : "Salvar no Calendário"}
        </motion.button>
      </motion.div>
    </motion.div>
  );

  const portalTarget = typeof document !== "undefined" ? document.querySelector(".sv-frame") : null;
  return portalTarget ? createPortal(modal, portalTarget) : modal;
}

function PlanningSection({ calendarEvent, onPlanned, onToast }) {
  const [open, setOpen] = useState(false);

  const handleConfirm = async ({ type, date, time, reminders }) => {
    const event = await createEvent({ type, date, time });
    await scheduleReviews({ event, reminders });
    onPlanned({ ...event, reminders });
    setOpen(false);
    onToast("✓ Evento criado com sucesso");
    setTimeout(() => onToast("✓ Revisões adicionadas automaticamente"), 1200);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.58 }}
      style={{ background: "white", borderRadius: 20, padding: "16px 18px", marginBottom: 12, boxShadow: "0 1px 8px rgba(0,0,0,0.05)", border: "1px solid #E2E8F0" }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", letterSpacing: 1.2, marginBottom: 10 }}>PLANEJAMENTO</p>
      {calendarEvent ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
          <CheckCircle size={18} color="#16A34A" style={{ flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{calendarEvent.type} agendado</p>
            <p style={{ fontSize: 11, color: "#64748B", margin: "2px 0 0" }}>{calendarEvent.date} · {calendarEvent.time}</p>
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", borderRadius: 12, background: "#F8FAFC", border: "1px solid #E2E8F0", cursor: "pointer", width: "100%", fontFamily: "Inter,sans-serif" }}>
          <Calendar size={18} color="#2563EB" />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Salvar Compromisso</span>
        </button>
      )}
      <AnimatePresence>
        {open && <PlanningModal onClose={() => setOpen(false)} onConfirm={handleConfirm} />}
      </AnimatePresence>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCREEN 3 — SUMMARY
// ══════════════════════════════════════════════════════════════════════════════
function SummaryScreen({ capturedItem, onSave, onLibrary, onToast }) {
  const [saving, setSaving] = useState(false);
  const [calendarEvent, setCalendarEvent] = useState(null);
  const template = capturedItem || SAMPLE_ITEMS[0];
  const item = { ...template, id: `u_${Date.now()}`, time: "Agora", reviewSchedule: buildReviewSchedule(Date.now()) };

  const handleSave = () => {
    if (saving) return;
    setSaving(true);
    const toSave = calendarEvent ? { ...item, calendarEvent } : item;
    setTimeout(() => { saveItem(toSave); onSave(); }, 900);
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
            <span style={{ fontSize: 36, lineHeight: 1 }}>{item.subjectIcon}</span>
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

        {/* Captured image */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} style={{ marginBottom: 12 }}>
          <CapturedPageVisual item={item} />
        </motion.div>

        {/* Content blocks */}
        {blocks.map((b, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: b.delay }}
            style={{ background: "white", borderRadius: 20, padding: "16px 18px", marginBottom: 12, boxShadow: "0 1px 8px rgba(0,0,0,0.05)", border: "1px solid #E2E8F0" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", letterSpacing: 1.2, marginBottom: 10 }}>{b.label}</p>
            {b.content}
          </motion.div>
        ))}

        {/* Export content */}
        <ExportSection item={item} onToast={onToast} />

        {/* Planning */}
        <PlanningSection calendarEvent={calendarEvent} onPlanned={setCalendarEvent} onToast={onToast} />

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
                  {isDueForReview(item) ? (
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#DC2626", background: "rgba(220,38,38,0.1)", borderRadius: 6, padding: "3px 10px", fontFamily: "Inter,sans-serif", display: "flex", alignItems: "center", gap: 4 }}>
                      <CalendarClock size={11} /> Revisar hoje
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#14B8A6", background: "rgba(20,184,166,0.1)", borderRadius: 6, padding: "3px 10px", fontFamily: "Inter,sans-serif" }}>Resumo</span>
                  )}
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#7C3AED", background: "rgba(124,58,237,0.1)", borderRadius: 6, padding: "3px 10px", fontFamily: "Inter,sans-serif" }}>Flashcards</span>
                  {item.calendarEvent && (
                    <span title={`${item.calendarEvent.type} · ${item.calendarEvent.date}`} style={{ fontSize: 11, fontWeight: 600, color: "#0F766E", background: "rgba(20,184,166,0.12)", borderRadius: 6, padding: "3px 8px", fontFamily: "Inter,sans-serif", display: "flex", alignItems: "center", gap: 3 }}>
                      <Calendar size={11} />
                    </span>
                  )}
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
function ContentDetailScreen({ item, onBack, onFlashcards, onQuestions, onQuiz, onVisionPlus, onToast }) {
  const next = nextPendingReview(item);
  const due = isDueForReview(item);
  const [calendarEvent, setCalendarEvent] = useState(item.calendarEvent || null);
  const handlePlanned = (event) => {
    setCalendarEvent(event);
    saveItem({ ...item, calendarEvent: event });
  };
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
        {/* Captured image */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 12 }}>
          <CapturedPageVisual item={item} height={120} />
        </motion.div>

        {/* Review status */}
        {next && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: due ? "#FEF2F2" : "white", borderRadius: 20, padding: "14px 18px", marginBottom: 12, boxShadow: "0 1px 8px rgba(0,0,0,0.05)", border: `1px solid ${due ? "#FECACA" : "#E2E8F0"}`, display: "flex", alignItems: "center", gap: 10 }}>
            <CalendarClock size={18} color={due ? "#DC2626" : "#64748B"} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: due ? "#DC2626" : "#111827", margin: 0, fontFamily: "Inter,sans-serif" }}>
                {due ? "Revisão pendente hoje" : `Próxima revisão: ${next.label} · ${formatDue(next.dueAt)}`}
              </p>
              <p style={{ fontSize: 11, color: "#94A3B8", margin: "2px 0 0", fontFamily: "Inter,sans-serif" }}>{completedReviews(item)}/5 revisões concluídas</p>
            </div>
          </motion.div>
        )}

        {blocks.map((b, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * (i + 1) }}
            style={{ background: "white", borderRadius: 20, padding: "16px 18px", marginBottom: 10, boxShadow: "0 1px 8px rgba(0,0,0,0.05)", border: "1px solid #E2E8F0" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", letterSpacing: 1.2, marginBottom: 10 }}>{b.label}</p>
            {b.content}
          </motion.div>
        ))}

        <ExportSection item={item} onToast={onToast} />
        <PlanningSection calendarEvent={calendarEvent} onPlanned={handlePlanned} onToast={onToast} />

        {/* Action buttons */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
          style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 4, paddingBottom: 8 }}>
          <motion.button whileTap={{ scale: 0.95 }} onClick={onFlashcards}
            style={{ flex: "1 1 100px", height: 52, borderRadius: 16, background: "white", border: "1.5px solid #E2E8F0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <CreditCard size={17} color="#7C3AED" />
            <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 700, color: "#7C3AED" }}>Flashcards</span>
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={onQuiz}
            style={{ flex: "1 1 100px", height: 52, borderRadius: 16, background: "white", border: "1.5px solid #E2E8F0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <ListChecks size={17} color="#EA580C" />
            <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 700, color: "#EA580C" }}>Quiz</span>
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={onQuestions}
            style={{ flex: "1 1 100px", height: 52, borderRadius: 16, background: "white", border: "1.5px solid #E2E8F0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <HelpCircle size={17} color="#2563EB" />
            <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 700, color: "#2563EB" }}>Perguntas</span>
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCREEN 6a — FLASHCARDS
// ══════════════════════════════════════════════════════════════════════════════
const FREE_FLASHCARD_LIMIT = 5;

function FlashcardsScreen({ item, onBack, onVisionPlus, reviewMode = false, onReviewComplete }) {
  const allCards = item?.flashcards || [];
  const cards = allCards.slice(0, FREE_FLASHCARD_LIMIT);
  const lockedCount = Math.max(0, allCards.length - FREE_FLASHCARD_LIMIT);

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [grades, setGrades] = useState([]); // true = lembrei, false = não lembrei
  const done = index >= cards.length;

  const grade = (remembered) => {
    setGrades(g => [...g, remembered]);
    setFlipped(false);
    setIndex(i => i + 1);
  };

  const rememberedCount = grades.filter(Boolean).length;

  const handleFinishReview = () => {
    if (reviewMode && onReviewComplete) onReviewComplete();
    else onBack();
  };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#F8FAFC", fontFamily: "Inter,sans-serif", overflow: "hidden" }}>
      <div style={{ background: "white", padding: "52px 20px 14px", borderBottom: "1px solid #F1F5F9", flexShrink: 0 }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 12 }}>
          <ChevronLeft size={20} color="#7C3AED" />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#7C3AED" }}>Voltar</span>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CreditCard size={22} color="#7C3AED" />
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: 0 }}>{reviewMode ? "Revisão" : "Flashcards"}</h1>
        </div>
        <p style={{ fontSize: 13, color: "#64748B", margin: "4px 0 0" }}>Baseados em: {item?.concept}</p>
        {!done && cards.length > 0 && (
          <p style={{ fontSize: 12, color: "#94A3B8", margin: "6px 0 0", fontFamily: "Inter,sans-serif" }}>Carta {index + 1} de {cards.length}</p>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px 24px", display: "flex", flexDirection: "column" }}>
        {!done && cards.length > 0 && (
          <>
            <motion.div key={index} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
              onClick={() => setFlipped(f => !f)}
              style={{ perspective: 1000, cursor: "pointer", marginBottom: 18 }}>
              <motion.div animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.45 }}
                style={{ position: "relative", width: "100%", minHeight: 220, transformStyle: "preserve-3d" }}>
                {/* Front */}
                <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", background: "white", borderRadius: 20, padding: "22px 20px", boxShadow: "0 4px 20px rgba(124,58,237,0.12)", border: "1px solid #E2E8F0", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#7C3AED", letterSpacing: 1.2, marginBottom: 10 }}>FRENTE · toque para virar</p>
                  <p style={{ fontSize: 17, fontWeight: 700, color: "#111827", margin: 0, lineHeight: 1.4 }}>{cards[index].front}</p>
                </div>
                {/* Back */}
                <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", transform: "rotateY(180deg)", background: "#7C3AED", borderRadius: 20, padding: "22px 20px", boxShadow: "0 4px 20px rgba(124,58,237,0.3)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: 1.2, marginBottom: 10 }}>VERSO</p>
                  <p style={{ fontSize: 15, color: "white", margin: 0, lineHeight: 1.55 }}>{cards[index].back}</p>
                </div>
              </motion.div>
            </motion.div>

            {flipped ? (
              <div style={{ display: "flex", gap: 10 }}>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => grade(false)}
                  style={{ flex: 1, height: 50, borderRadius: 14, background: "#FEF2F2", border: "1.5px solid #FECACA", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <ThumbsDown size={17} color="#DC2626" />
                  <span style={{ fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 700, color: "#DC2626" }}>Não lembrei</span>
                </motion.button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => grade(true)}
                  style={{ flex: 1, height: 50, borderRadius: 14, background: "#F0FDF4", border: "1.5px solid #BBF7D0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <ThumbsUp size={17} color="#16A34A" />
                  <span style={{ fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 700, color: "#16A34A" }}>Lembrei</span>
                </motion.button>
              </div>
            ) : (
              <p style={{ textAlign: "center", fontSize: 12, color: "#94A3B8", fontFamily: "Inter,sans-serif" }}>Toque na carta para ver a resposta</p>
            )}
          </>
        )}

        {done && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: "white", borderRadius: 20, padding: "24px 20px", textAlign: "center", border: "1px solid #E2E8F0", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
            <CheckCircle size={30} color="#14B8A6" style={{ margin: "0 auto 12px" }} />
            <p style={{ fontFamily: "Inter,sans-serif", fontSize: 17, fontWeight: 800, color: "#111827", margin: "0 0 4px" }}>Sessão concluída</p>
            <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: "#64748B", margin: "0 0 18px" }}>Você lembrou {rememberedCount} de {cards.length} cartas</p>
            <motion.button whileTap={{ scale: 0.96 }} onClick={handleFinishReview}
              style={{ width: "100%", height: 50, borderRadius: 14, background: "linear-gradient(135deg,#2563EB,#7C3AED)", color: "white", fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer" }}>
              {reviewMode ? "Concluir revisão" : "Voltar"}
            </motion.button>
          </motion.div>
        )}

        {/* Unlock CTA for cards beyond the free limit */}
        {done && lockedCount > 0 && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            style={{ background: "linear-gradient(135deg,#EDE9FE,#DDD6FE)", borderRadius: 20, padding: "22px 20px", textAlign: "center", border: "1px solid #C4B5FD", marginTop: 14 }}>
            <Lock size={24} color="#7C3AED" style={{ margin: "0 auto 10px" }} />
            <p style={{ fontFamily: "Inter,sans-serif", fontSize: 15, fontWeight: 700, color: "#7C3AED", margin: "0 0 6px" }}>+{lockedCount} flashcards no Vision+</p>
            <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: "#6D28D9", margin: "0 0 16px" }}>No plano gratuito você tem até {FREE_FLASHCARD_LIMIT} flashcards por conteúdo</p>
            <motion.button whileTap={{ scale: 0.96 }} onClick={onVisionPlus}
              style={{ padding: "11px 28px", borderRadius: 14, background: "linear-gradient(135deg,#7C3AED,#2563EB)", color: "white", fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer", boxShadow: "0 4px 14px rgba(124,58,237,0.35)" }}>
              Ver Vision+
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCREEN 6b — QUESTIONS  (free tier: "perguntas inteligentes" ilimitadas)
// ══════════════════════════════════════════════════════════════════════════════
function QuestionsScreen({ item, onBack }) {
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
            style={{ background: "white", borderRadius: 20, padding: "16px 18px", marginBottom: 10, boxShadow: "0 1px 8px rgba(0,0,0,0.06)", border: "1px solid #E2E8F0" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#2563EB", letterSpacing: 1.2, marginBottom: 6 }}>PERGUNTA {i + 1}</p>
            <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.55, margin: 0 }}>{q}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCREEN 6c — QUIZ  (free tier: "mini quizzes")
// ══════════════════════════════════════════════════════════════════════════════
function QuizScreen({ item, onBack }) {
  const questions = item?.quiz || [];
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const done = index >= questions.length;
  const q = questions[index];

  const options = q?.type === "vf" ? [true, false] : q?.options || [];
  const optionLabel = (opt) => (q.type === "vf" ? (opt ? "Verdadeiro" : "Falso") : opt);
  const isCorrect = (opt) => opt === q.answer;

  const choose = (opt) => {
    if (selected !== null) return;
    setSelected(opt);
    if (isCorrect(opt)) setScore(s => s + 1);
  };

  const next = () => { setSelected(null); setIndex(i => i + 1); };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#F8FAFC", fontFamily: "Inter,sans-serif", overflow: "hidden" }}>
      <div style={{ background: "white", padding: "52px 20px 14px", borderBottom: "1px solid #F1F5F9", flexShrink: 0 }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 12 }}>
          <ChevronLeft size={20} color="#EA580C" />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#EA580C" }}>Voltar</span>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ListChecks size={22} color="#EA580C" />
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: 0 }}>Mini Quiz</h1>
        </div>
        <p style={{ fontSize: 13, color: "#64748B", margin: "4px 0 0" }}>Baseado em: {item?.concept}</p>
        {!done && questions.length > 0 && (
          <p style={{ fontSize: 12, color: "#94A3B8", margin: "6px 0 0" }}>Pergunta {index + 1} de {questions.length}</p>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px 24px" }}>
        {!done && q && (
          <motion.div key={index} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: "white", borderRadius: 20, padding: "18px", border: "1px solid #E2E8F0", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: "0 0 16px", lineHeight: 1.4 }}>{q.question}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {options.map((opt, i) => {
                const chosen = selected !== null;
                const isThisCorrect = isCorrect(opt);
                const isThisSelected = selected === opt;
                let bg = "white", border = "#E2E8F0", color = "#374151";
                if (chosen && isThisCorrect) { bg = "#F0FDF4"; border = "#86EFAC"; color = "#16A34A"; }
                else if (chosen && isThisSelected && !isThisCorrect) { bg = "#FEF2F2"; border = "#FCA5A5"; color = "#DC2626"; }
                return (
                  <button key={i} onClick={() => choose(opt)} disabled={chosen}
                    style={{ textAlign: "left", padding: "12px 14px", borderRadius: 12, background: bg, border: `1.5px solid ${border}`, color, fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 600, cursor: chosen ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    {optionLabel(opt)}
                    {chosen && isThisCorrect && <CheckCircle size={16} color="#16A34A" />}
                    {chosen && isThisSelected && !isThisCorrect && <XCircle size={16} color="#DC2626" />}
                  </button>
                );
              })}
            </div>
            {selected !== null && (
              <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} whileTap={{ scale: 0.96 }} onClick={next}
                style={{ marginTop: 16, width: "100%", height: 46, borderRadius: 12, background: "#111827", color: "white", fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer" }}>
                {index + 1 === questions.length ? "Ver resultado" : "Próxima"}
              </motion.button>
            )}
          </motion.div>
        )}

        {done && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: "white", borderRadius: 20, padding: "24px 20px", textAlign: "center", border: "1px solid #E2E8F0", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
            <Sparkles size={30} color="#EA580C" style={{ margin: "0 auto 12px" }} />
            <p style={{ fontFamily: "Inter,sans-serif", fontSize: 17, fontWeight: 800, color: "#111827", margin: "0 0 4px" }}>Você acertou {score} de {questions.length}</p>
            <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: "#64748B", margin: "0 0 18px" }}>Continue revisando para fixar o conteúdo</p>
            <motion.button whileTap={{ scale: 0.96 }} onClick={onBack}
              style={{ width: "100%", height: 50, borderRadius: 14, background: "linear-gradient(135deg,#EA580C,#F59E0B)", color: "white", fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer" }}>
              Voltar
            </motion.button>
          </motion.div>
        )}
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
// SCREEN 8 — REVISÃO INTELIGENTE (Spaced Repetition)
// ══════════════════════════════════════════════════════════════════════════════
function ReviewScreen({ onReview, onToast }) {
  const [items, setItems] = useState([]);
  const [scheduling, setScheduling] = useState(null);

  useEffect(() => { setItems(getStoredItems()); }, []);

  const handleScheduleReview = async (item, e) => {
    e.stopPropagation();
    if (scheduling) return;
    setScheduling(item.id);
    const next = nextPendingReview(item);
    const event = await createEvent({ type: "Revisão", date: next ? new Date(next.dueAt).toISOString().slice(0, 10) : "", time: "09:00" });
    await scheduleReviews({ event, reminders: [0] });
    const updated = { ...item, calendarEvent: event };
    saveItem(updated);
    setItems(getStoredItems());
    setScheduling(null);
    onToast("✓ Evento criado com sucesso");
    setTimeout(() => onToast("✓ Revisões adicionadas automaticamente"), 1200);
  };

  const due = items.filter(isDueForReview);
  const upcoming = items
    .filter(it => !isDueForReview(it) && nextPendingReview(it))
    .sort((a, b) => nextPendingReview(a).dueAt - nextPendingReview(b).dueAt)
    .slice(0, 5);
  const commitments = items
    .filter(it => it.calendarEvent)
    .sort((a, b) => new Date(`${a.calendarEvent.date}T${a.calendarEvent.time || "00:00"}`) - new Date(`${b.calendarEvent.date}T${b.calendarEvent.time || "00:00"}`));

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#F8FAFC", fontFamily: "Inter,sans-serif", overflow: "hidden" }}>
      <div style={{ background: "white", padding: "52px 20px 16px", borderBottom: "1px solid #F1F5F9", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <LogoSVG size={24} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#2563EB", letterSpacing: 1 }}>STUDY VISION</span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: 0 }}>Revisão Inteligente</h1>
        <p style={{ fontSize: 13, color: "#64748B", margin: "2px 0 0" }}>Repetição espaçada para combater o esquecimento</p>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 24px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: 1.2, marginBottom: 10 }}>PARA HOJE · {due.length}</p>
        {due.length === 0 ? (
          <div style={{ background: "white", borderRadius: 20, padding: "24px 18px", textAlign: "center", border: "1px solid #E2E8F0", marginBottom: 20 }}>
            <CheckCircle size={26} color="#14B8A6" style={{ margin: "0 auto 8px" }} />
            <p style={{ fontSize: 13, color: "#64748B", margin: 0, fontFamily: "Inter,sans-serif" }}>Nenhuma revisão pendente hoje. Continue assim!</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {due.map((item, i) => {
              const next = nextPendingReview(item);
              return (
                <motion.button key={item.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                  whileTap={{ scale: 0.98 }} onClick={() => onReview(item)}
                  style={{ background: "white", borderRadius: 20, padding: "14px 16px", border: "1px solid #FECACA", boxShadow: "0 1px 8px rgba(0,0,0,0.05)", cursor: "pointer", textAlign: "left", width: "100%", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: item.subjectBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                    {item.subjectIcon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.concept}</p>
                    <p style={{ fontSize: 12, color: "#64748B", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.subject} · {next?.label}</p>
                  </div>
                  {item.calendarEvent ? (
                    <Calendar size={16} color="#0F766E" style={{ flexShrink: 0 }} />
                  ) : (
                    <button onClick={(e) => handleScheduleReview(item, e)} disabled={scheduling === item.id}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 10, background: "#F1F5F9", border: "none", cursor: "pointer", flexShrink: 0 }}>
                      <CalendarPlus size={15} color="#2563EB" />
                    </button>
                  )}
                  <span style={{ fontSize: 11, fontWeight: 700, color: "white", background: "#DC2626", borderRadius: 10, padding: "5px 12px", fontFamily: "Inter,sans-serif", flexShrink: 0 }}>Revisar</span>
                </motion.button>
              );
            })}
          </div>
        )}

        <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: 1.2, marginBottom: 10 }}>PRÓXIMAS REVISÕES</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {upcoming.map(item => {
            const next = nextPendingReview(item);
            return (
              <div key={item.id} style={{ background: "white", borderRadius: 16, padding: "12px 14px", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{item.subjectIcon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.concept}</p>
                  <p style={{ fontSize: 11, color: "#94A3B8", margin: "1px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{next.label}</p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#64748B", flexShrink: 0 }}>{formatDue(next.dueAt)}</span>
                {item.calendarEvent ? (
                  <Calendar size={15} color="#0F766E" style={{ flexShrink: 0 }} />
                ) : (
                  <button onClick={(e) => handleScheduleReview(item, e)} disabled={scheduling === item.id}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 9, background: "#F1F5F9", border: "none", cursor: "pointer", flexShrink: 0 }}>
                    <CalendarPlus size={14} color="#2563EB" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: 1.2, marginTop: 24, marginBottom: 2 }}>COMPROMISSOS · CALENDÁRIO</p>
        <p style={{ fontSize: 11, color: "#94A3B8", margin: "0 0 10px" }}>Data de provas, listas...</p>
        {commitments.length === 0 ? (
          <div style={{ background: "white", borderRadius: 20, padding: "20px 18px", textAlign: "center", border: "1px solid #E2E8F0" }}>
            <p style={{ fontSize: 13, color: "#64748B", margin: 0, fontFamily: "Inter,sans-serif" }}>Nenhum compromisso salvo ainda.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {commitments.map(item => (
              <div key={`${item.id}_cal`} style={{ background: "white", borderRadius: 16, padding: "12px 14px", border: "1px solid #E2E8F0", display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Calendar size={16} color="#2563EB" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#2563EB", background: "#EFF6FF", borderRadius: 8, padding: "2px 8px" }}>{item.calendarEvent.type}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#64748B" }}>{item.calendarEvent.date} · {item.calendarEvent.time}</span>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: 0 }}>{item.concept}</p>
                  <p style={{ fontSize: 11, color: "#94A3B8", margin: "1px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.subject} · {item.summary}</p>
                </div>
              </div>
            ))}
          </div>
        )}
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
  const [capturedItem, setCapturedItem] = useState(null);
  const [reviewMode, setReviewMode] = useState(false);
  const [toast, setToast] = useState(null);
  const [prevScreens, setPrevScreens] = useState([]);
  const [dueCount, setDueCount] = useState(0);

  const refreshDueCount = useCallback(() => setDueCount(getDueItems().length), []);
  useEffect(() => { refreshDueCount(); }, [refreshDueCount]);

  const go = useCallback((to) => {
    setPrevScreens(p => [...p, screen]);
    setScreen(to);
  }, [screen]);

  const goBack = useCallback(() => {
    const prev = [...prevScreens];
    const last = prev.pop() || "camera";
    setPrevScreens(prev);
    setReviewMode(false);
    setScreen(last);
  }, [prevScreens]);

  const goTo = useCallback((to) => {
    setPrevScreens([]);
    setReviewMode(false);
    setScreen(to);
  }, []);

  const showToast = (msg) => setToast(msg);

  const handleReviewComplete = () => {
    const updated = markReviewDone(selectedItem);
    setSelectedItem(updated);
    setReviewMode(false);
    refreshDueCount();
    showToast("✓ Revisão registrada");
    setTimeout(() => goTo("review"), 400);
  };

  // Bottom nav active
  const navActive = (screen === "review" || (reviewMode && screen === "flashcards")) ? "review"
    : ["library", "detail", "flashcards", "questions", "quiz"].includes(screen) ? "library"
    : screen === "visionplus" ? "visionplus" : "camera";

  const isLight = !["camera", "analysis", "visionplus"].includes(screen);
  const showNav = !["camera", "analysis"].includes(screen);

  const transitions = ["visionplus", "library", "review"].includes(screen) ? fadeUp : slideIn;

  return (
    <div className="sv-outer">
      {/* Phone frame */}
      <div className="sv-frame">
        {/* Notch */}
        <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 126, height: 34, background: "#000", borderRadius: "0 0 22px 22px", zIndex: 300 }} />

        <StatusBar light={!isLight} />

        {/* Screen transitions */}
        <AnimatePresence mode="wait">
          <motion.div key={screen} {...transitions}
            style={{ position: "absolute", inset: 0, paddingBottom: showNav ? 80 : 0 }}>
            {screen === "camera" && (
              <CameraScreen
                onCapture={() => { setCapturedItem(nextCaptureTemplate()); go("analysis"); }}
                onVisionPlusNav={() => go("visionplus")}
              />
            )}
            {screen === "analysis" && (
              <AnalysisScreen onDone={() => { setPrevScreens([]); setScreen("summary"); }} />
            )}
            {screen === "summary" && (
              <SummaryScreen
                capturedItem={capturedItem}
                onSave={() => { showToast("✓ Conteúdo salvo com sucesso"); refreshDueCount(); setTimeout(() => goTo("library"), 500); }}
                onLibrary={() => goTo("library")}
                onToast={showToast}
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
                onQuiz={() => go("quiz")}
                onVisionPlus={() => go("visionplus")}
                onToast={showToast}
              />
            )}
            {screen === "flashcards" && selectedItem && (
              <FlashcardsScreen
                item={selectedItem}
                onBack={goBack}
                onVisionPlus={() => go("visionplus")}
                reviewMode={reviewMode}
                onReviewComplete={handleReviewComplete}
              />
            )}
            {screen === "questions" && (
              <QuestionsScreen item={selectedItem} onBack={goBack} />
            )}
            {screen === "quiz" && (
              <QuizScreen item={selectedItem} onBack={goBack} />
            )}
            {screen === "review" && (
              <ReviewScreen onReview={(item) => { setSelectedItem(item); setReviewMode(true); go("flashcards"); }} onToast={showToast} />
            )}
            {screen === "visionplus" && (
              <VisionPlusScreen onBack={goBack} />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Bottom nav */}
        {showNav && (
          <BottomNav active={navActive} dueCount={dueCount}
            onGo={(id) => {
              if (id === "camera") goTo("camera");
              else if (id === "library") goTo("library");
              else if (id === "review") goTo("review");
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
      <p className="sv-footer-label">
        JOVI Smartphones · Study Vision Prototype
      </p>
    </div>
  );
}
