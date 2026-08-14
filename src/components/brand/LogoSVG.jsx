export default function LogoSVG({ size = 32, glow = false }) {
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
